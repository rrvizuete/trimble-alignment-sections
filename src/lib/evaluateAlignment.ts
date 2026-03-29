import type { Alignment, LineSegment, ArcSegment } from "../types/alignment";

export type AlignmentEvaluation = {
  x: number;
  y: number;
  tangent: {
    x: number;
    y: number;
  };
  segmentType: "line" | "arc";
};

function evaluateLine(segment: LineSegment, localDistance: number): AlignmentEvaluation {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy);

  const ux = dx / length;
  const uy = dy / length;

  return {
    x: segment.start.x + ux * localDistance,
    y: segment.start.y + uy * localDistance,
    tangent: { x: ux, y: uy },
    segmentType: "line",
  };
}

function evaluateArc(segment: ArcSegment, localDistance: number): AlignmentEvaluation {
  const startVecX = segment.start.x - segment.center.x;
  const startVecY = segment.start.y - segment.center.y;

  const startAngle = Math.atan2(startVecY, startVecX);

  const deltaAngle = localDistance / segment.radius;

  const angle =
    segment.rotation === "ccw"
      ? startAngle + deltaAngle
      : startAngle - deltaAngle;

  const x = segment.center.x + segment.radius * Math.cos(angle);
  const y = segment.center.y + segment.radius * Math.sin(angle);

  // radial vector
  const rx = x - segment.center.x;
  const ry = y - segment.center.y;
  const rLen = Math.hypot(rx, ry);

  const ux = rx / rLen;
  const uy = ry / rLen;

  // tangent is perpendicular
  const tx =
    segment.rotation === "ccw" ? -uy : uy;
  const ty =
    segment.rotation === "ccw" ? ux : -ux;

  return {
    x,
    y,
    tangent: { x: tx, y: ty },
    segmentType: "arc",
  };
}

export function evaluateAlignment(
  alignment: Alignment,
  station: number
): AlignmentEvaluation | null {
  let currentStation = alignment.staStart;

  for (const segment of alignment.segments) {
    const start = currentStation;
    const end = currentStation + segment.length;

    if (station >= start && station <= end) {
      const localDistance = station - start;

      if (segment.type === "line") {
        return evaluateLine(segment, localDistance);
      }

      return evaluateArc(segment, localDistance);
    }

    currentStation = end;
  }

  return null;
}