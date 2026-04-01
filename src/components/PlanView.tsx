import type { Alignment, ArcSegment, LineSegment, Point } from "../types/alignment";
import type { AlignmentEvaluation } from "../lib/evaluateAlignment";

type Props = {
  alignment: Alignment;
  evaluation: AlignmentEvaluation | null;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function expandBounds(bounds: Bounds, p: Point): Bounds {
  return {
    minX: Math.min(bounds.minX, p.x),
    minY: Math.min(bounds.minY, p.y),
    maxX: Math.max(bounds.maxX, p.x),
    maxY: Math.max(bounds.maxY, p.y),
  };
}

function getBounds(alignment: Alignment): Bounds {
  let bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (const seg of alignment.segments) {
    if (seg.type === "line") {
      bounds = expandBounds(bounds, seg.start);
      bounds = expandBounds(bounds, seg.end);
    } else {
      bounds = expandBounds(bounds, seg.start);
      bounds = expandBounds(bounds, seg.end);
      bounds = expandBounds(bounds, seg.center);
      bounds = expandBounds(bounds, {
        x: seg.center.x + seg.radius,
        y: seg.center.y + seg.radius,
      });
      bounds = expandBounds(bounds, {
        x: seg.center.x - seg.radius,
        y: seg.center.y - seg.radius,
      });
    }
  }

  return bounds;
}

function projectPoint(
  p: Point,
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
) {
  const modelWidth = bounds.maxX - bounds.minX || 1;
  const modelHeight = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(
    (width - 2 * padding) / modelWidth,
    (height - 2 * padding) / modelHeight
  );

  const offsetX = (width - modelWidth * scale) / 2;
  const offsetY = (height - modelHeight * scale) / 2;

  return {
    x: offsetX + (p.x - bounds.minX) * scale,
    y: height - (offsetY + (p.y - bounds.minY) * scale),
    scale,
  };
}

function lineToSvg(seg: LineSegment, bounds: Bounds, width: number, height: number, padding: number) {
  const a = projectPoint(seg.start, bounds, width, height, padding);
  const b = projectPoint(seg.end, bounds, width, height, padding);

  return (
    <line
      key={`line-${seg.start.x}-${seg.start.y}-${seg.end.x}-${seg.end.y}`}
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="#38bdf8"
      strokeWidth={2}
    />
  );
}

function arcToSvg(seg: ArcSegment, bounds: Bounds, width: number, height: number, padding: number) {
  const a = projectPoint(seg.start, bounds, width, height, padding);
  const b = projectPoint(seg.end, bounds, width, height, padding);
  const center = projectPoint(seg.center, bounds, width, height, padding);
  const radiusPx = seg.radius * center.scale;

  const largeArcFlag = seg.length > Math.PI * seg.radius ? 1 : 0;
  const sweepFlag = seg.rotation === "ccw" ? 0 : 1;

  const d = `M ${a.x} ${a.y} A ${radiusPx} ${radiusPx} 0 ${largeArcFlag} ${sweepFlag} ${b.x} ${b.y}`;

  return <path key={`arc-${seg.start.x}-${seg.start.y}-${seg.end.x}-${seg.end.y}`} d={d} fill="none" stroke="#38bdf8" strokeWidth={2} />;
}

export function PlanView({ alignment, evaluation }: Props) {
  const width = 820;
  const height = 420;
  const padding = 30;

  const bounds = getBounds(alignment);

  const evalPt = evaluation
    ? projectPoint({ x: evaluation.x, y: evaluation.y }, bounds, width, height, padding)
    : null;

  const sectionHalf = 70;

  const sectionLine =
    evaluation && evalPt
      ? {
          x1: evalPt.x - evaluation.normal.x * sectionHalf,
          y1: evalPt.y + evaluation.normal.y * sectionHalf,
          x2: evalPt.x + evaluation.normal.x * sectionHalf,
          y2: evalPt.y - evaluation.normal.y * sectionHalf,
        }
      : null;

  const tangentLine =
    evaluation && evalPt
      ? {
          x1: evalPt.x - evaluation.tangent.x * 45,
          y1: evalPt.y + evaluation.tangent.y * 45,
          x2: evalPt.x + evaluation.tangent.x * 45,
          y2: evalPt.y - evaluation.tangent.y * 45,
        }
      : null;

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 24, textAlign: "center", color: "#e2e8f0" }}>
        Plan View
      </h2>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: "#0f172a", borderRadius: 8 }}
      >
        {alignment.segments.map((seg) =>
          seg.type === "line"
            ? lineToSvg(seg, bounds, width, height, padding)
            : arcToSvg(seg, bounds, width, height, padding)
        )}

        {sectionLine && (
          <line
            x1={sectionLine.x1}
            y1={sectionLine.y1}
            x2={sectionLine.x2}
            y2={sectionLine.y2}
            stroke="#f59e0b"
            strokeWidth={3}
          />
        )}

        {tangentLine && (
          <line
            x1={tangentLine.x1}
            y1={tangentLine.y1}
            x2={tangentLine.x2}
            y2={tangentLine.y2}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="8 6"
          />
        )}

        {evalPt && (
          <circle
            cx={evalPt.x}
            cy={evalPt.y}
            r={5}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        )}
      </svg>

      <div style={{ marginTop: 10, fontSize: 14, color: "#cbd5e1", textAlign: "center" }}>
        Blue = alignment, Orange = section cut direction, Green dashed = tangent
      </div>
    </div>
  );
}
