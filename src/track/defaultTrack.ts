import type { LineSegment, Vec2 } from "../shared/types.js";

const SEGMENTS = 96;
const CENTER_X_RADIUS = 65;
const CENTER_Y_RADIUS = 40;
const TRACK_HALF_WIDTH = 12;
const SPAWN_GAP_RADIANS = 0.1;
const START_ANGLE = -Math.PI / 2;

function ellipsePoints(radiusX: number, radiusY: number): Vec2[] {
  return Array.from({ length: SEGMENTS }, (_, index) => {
    const angle = (index / SEGMENTS) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
    };
  });
}

function closedSegments(points: readonly Vec2[]): LineSegment[] {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length]!;
    return { x1: point.x, y1: point.y, x2: next.x, y2: next.y };
  });
}

const outerBoundary = ellipsePoints(
  CENTER_X_RADIUS + TRACK_HALF_WIDTH,
  CENTER_Y_RADIUS + TRACK_HALF_WIDTH
);
const innerBoundary = ellipsePoints(
  CENTER_X_RADIUS - TRACK_HALF_WIDTH,
  CENTER_Y_RADIUS - TRACK_HALF_WIDTH
);
const centerline = ellipsePoints(CENTER_X_RADIUS, CENTER_Y_RADIUS);

export const DEFAULT_TRACK = {
  name: "Copperfield Oval",
  centerline,
  outerBoundary,
  innerBoundary,
  boundaries: [...closedSegments(outerBoundary), ...closedSegments(innerBoundary)],
  spawnPoints: Array.from({ length: 8 }, (_, index) => {
    const angle = START_ANGLE + index * SPAWN_GAP_RADIANS;
    const tangentX = -CENTER_X_RADIUS * Math.sin(angle);
    const tangentY = CENTER_Y_RADIUS * Math.cos(angle);
    return {
      position: {
        x: CENTER_X_RADIUS * Math.cos(angle),
        y: CENTER_Y_RADIUS * Math.sin(angle),
      },
      rotation: Math.atan2(tangentY, tangentX),
    };
  }),
} as const;
