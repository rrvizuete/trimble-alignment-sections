import type {
  Alignment,
  ArcSegment,
  LineSegment,
  VerticalControlPoint,
  VerticalProfile,
} from "../types/alignment";

export type AlignmentEvaluation = {
  x: number;
  y: number;
  z?: number;
  tangent: {
    x: number;
    y: number;
  };
  normal: {
    x: number;
    y: number;
  };
  segmentType: "line" | "arc";
};

function normalize(x: number, y: number) {
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

function evaluateLine(segment: LineSegment, localDistance: number): AlignmentEvaluation {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const dir = normalize(dx, dy);

  return {
    x: segment.start.x + dir.x * localDistance,
    y: segment.start.y + dir.y * localDistance,
    tangent: { x: dir.x, y: dir.y },
    normal: { x: -dir.y, y: dir.x },
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

  const rx = x - segment.center.x;
  const ry = y - segment.center.y;
  const radial = normalize(rx, ry);

  const tangent =
    segment.rotation === "ccw"
      ? { x: -radial.y, y: radial.x }
      : { x: radial.y, y: -radial.x };

  const tangentNorm = normalize(tangent.x, tangent.y);

  return {
    x,
    y,
    tangent: tangentNorm,
    normal: { x: -tangentNorm.y, y: tangentNorm.x },
    segmentType: "arc",
  };
}

function gradeBetween(a: VerticalControlPoint, b: VerticalControlPoint): number {
  return (b.elevation - a.elevation) / (b.station - a.station);
}

function hasUsableCurve(points: VerticalControlPoint[], index: number): boolean {
  return (
    index > 0 &&
    index < points.length - 1 &&
    points[index].curveLength > 0 &&
    Number.isFinite(points[index].curveLength)
  );
}

function evaluateVerticalProfile(
  profile: VerticalProfile | undefined,
  station: number
): number | undefined {
  if (!profile || profile.points.length === 0) return undefined;

  const points = profile.points;

  if (points.length === 1) return points[0].elevation;
  if (station <= points[0].station) return points[0].elevation;
  if (station >= points[points.length - 1].station) return points[points.length - 1].elevation;

  for (let i = 1; i < points.length - 1; i++) {
    if (!hasUsableCurve(points, i)) continue;

    const p = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];

    const L = p.curveLength;
    const g1 = gradeBetween(prev, p);
    const g2 = gradeBetween(p, next);

    const bvcStation = p.station - L / 2;
    const evcStation = p.station + L / 2;

    if (station >= bvcStation && station <= evcStation) {
      const elevBVC = p.elevation - g1 * (L / 2);
      const x = station - bvcStation;
      return elevBVC + g1 * x + ((g2 - g1) / (2 * L)) * x * x;
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const g = gradeBetween(a, b);

    let startStation = a.station;
    let startElevation = a.elevation;

    if (hasUsableCurve(points, i)) {
      const L = a.curveLength;
      startStation = a.station + L / 2;
      startElevation = a.elevation + g * (L / 2);
    }

    let endStation = b.station;

    if (hasUsableCurve(points, i + 1)) {
      const L = b.curveLength;
      endStation = b.station - L / 2;
    }

    if (station >= startStation && station <= endStation) {
      return startElevation + g * (station - startStation);
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    if (station >= a.station && station <= b.station) {
      const t = (station - a.station) / (b.station - a.station);
      return a.elevation + t * (b.elevation - a.elevation);
    }
  }

  return undefined;
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

      const horizontal =
        segment.type === "line"
          ? evaluateLine(segment, localDistance)
          : evaluateArc(segment, localDistance);

      const z = evaluateVerticalProfile(alignment.profile, station);

      return {
        ...horizontal,
        z,
      };
    }

    currentStation = end;
  }

  return null;
}