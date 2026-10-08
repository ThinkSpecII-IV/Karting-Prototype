"use strict";
/**
 * src/shared/types.ts
 *
 * CANONICAL data contracts for the multiplayer kart racing game.
 *
 * INVARIANT (INV-07): This is the ONLY place these types are defined.
 * Both server (src/server/, src/physics/, etc.) and client (src/client/)
 * import from here. Never redeclare or copy these types elsewhere.
 *
 * All types are plain JSON-serialisable objects (no class instances, no
 * methods, no Symbol fields) so they can be sent over Socket.IO without
 * transformation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.F1_2002_CAR_MODELS = void 0;
exports.isF1TeamCarModel = isF1TeamCarModel;
// ---------------------------------------------------------------------------
// Vehicle
// ---------------------------------------------------------------------------
exports.F1_2002_CAR_MODELS = [
    "Ferrari F2002",
    "Williams FW24",
    "McLaren MP4-17",
];
function isF1TeamCarModel(value) {
    return typeof value === "string" &&
        exports.F1_2002_CAR_MODELS.some((model) => model === value);
}
//# sourceMappingURL=types.js.map