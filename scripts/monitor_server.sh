#!/usr/bin/env bash

set -euo pipefail
export PATH="/opt/anaconda3/bin:$PATH"
export LC_ALL=C
export SERVER_METRICS=1

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SERVER_ENTRY="$PROJECT_ROOT/dist/server/server/index.js"
DIAGNOSTICS_DIR="$PROJECT_ROOT/puzzles/logs/diagnostics"
ALERT_LOG="$DIAGNOSTICS_DIR/workspace_patches.log"
TELEMETRY_LOG="$DIAGNOSTICS_DIR/server_telemetry.log"

if [[ ! -f "$SERVER_ENTRY" ]]; then
  printf 'Compiled server entrypoint not found: %s\nRun npm run build:server first.\n' "$SERVER_ENTRY" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js was not found on PATH: %s\n' "$PATH" >&2
  exit 1
fi

mkdir -p "$DIAGNOSTICS_DIR"
: >> "$ALERT_LOG"
: >> "$TELEMETRY_LOG"

write_alert() {
  local message="$1"
  local line
  line="$(date -u '+%Y-%m-%dT%H:%M:%SZ') WARNING $message"
  if ! printf '%s\n' "$line" | iconv -f ASCII -t ISO-8859-1 >> "$ALERT_LOG"; then
    printf 'Could not write Latin-1 alert to %s\n' "$ALERT_LOG" >&2
    return 1
  fi
}

extract_metric() {
  printf '%s\n' "$1" | sed -nE "s/.*\"$2\":([0-9]+([.][0-9]+)?).*/\\1/p"
}

memory_samples=()
memory_alert_active=0

process_output() {
  local line="$1"
  local tick_ms snapshots_per_second cpu_percent rss_bytes heap_bytes

  printf '%s\n' "$line"
  printf '%s\n' "$line" >> "$TELEMETRY_LOG"
  [[ "$line" == SERVER_METRIC\ * ]] || return 0

  tick_ms="$(extract_metric "$line" maxTickDurationMs)"
  snapshots_per_second="$(extract_metric "$line" snapshotBroadcastsPerSecond)"
  cpu_percent="$(extract_metric "$line" cpuPercent)"
  rss_bytes="$(extract_metric "$line" rssBytes)"
  heap_bytes="$(extract_metric "$line" heapUsedBytes)"

  if [[ -z "$tick_ms" || -z "$snapshots_per_second" || -z "$cpu_percent" || -z "$rss_bytes" || -z "$heap_bytes" ]]; then
    printf 'Malformed SERVER_METRIC record; see %s\n' "$TELEMETRY_LOG" >&2
    return 1
  fi

  if awk -v duration="$tick_ms" 'BEGIN { exit !(duration > 16.67) }'; then
    write_alert "Physics tick exceeded 16.67 ms: ${tick_ms} ms."
  fi

  memory_samples+=("$rss_bytes")
  if (( ${#memory_samples[@]} > 11 )); then
    memory_samples=("${memory_samples[@]:1}")
  fi
  if (( ${#memory_samples[@]} == 11 )); then
    local baseline_bytes="${memory_samples[0]}"
    local growth_bytes=$((rss_bytes - baseline_bytes))
    if (( growth_bytes >= 33554432 && growth_bytes * 100 >= baseline_bytes * 25 )); then
      if (( memory_alert_active == 0 )); then
        write_alert "RSS memory increased by ${growth_bytes} bytes within 10 seconds."
      fi
      memory_alert_active=1
    else
      memory_alert_active=0
    fi
  fi
}

cd "$PROJECT_ROOT"
set -o pipefail
node "$SERVER_ENTRY" "$@" 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
  process_output "$line"
done
