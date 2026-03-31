import type { AlignmentEvaluation } from "./evaluateAlignment";

export type SectionCoordinates = {
  offset: number;
  elevation: number;
  along: number;
};

export type WorldPoint3D = {
  x: number;
  y: number;
  z: number;
};

export function worldToSectionCoordinates(
  stationPoint: AlignmentEvaluation,
  worldPoint: WorldPoint3D
): SectionCoordinates {
  const dx = worldPoint.x - stationPoint.x;
  const dy = worldPoint.y - stationPoint.y;

  // Civil convention requested:
  // negative = left of CL
  // positive = right of CL
  //
  // The current normal vector points left, so dot(dx,dy,normal)
  // is positive on the left. We flip the sign to match Civil 3D.
  const offset = -(
    dx * stationPoint.normal.x +
    dy * stationPoint.normal.y
  );

  const along =
    dx * stationPoint.tangent.x +
    dy * stationPoint.tangent.y;

  return {
    offset,
    elevation: worldPoint.z,
    along,
  };
}