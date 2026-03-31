import type { SectionCoordinates } from "../lib/sectionTransform";

type SectionPoint = {
  label: string;
  color: string;
  offset: number;
  elevation: number;
};

type Props = {
  stationLabel: string;
  centerlineElevation?: number;
  samplePoint: SectionCoordinates | null;
};

type Bounds = {
  minOffset: number;
  maxOffset: number;
  minElevation: number;
  maxElevation: number;
};

function getBounds(points: SectionPoint[], centerlineElevation?: number): Bounds {
  const offsets = points.map((p) => p.offset).concat([0]);
  const elevations = points.map((p) => p.elevation);

  if (centerlineElevation !== undefined) {
    elevations.push(centerlineElevation);
  }

  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);

  const offsetPadding = Math.max(5, (maxOffset - minOffset) * 0.2);
  const elevationPadding = Math.max(1, (maxElevation - minElevation) * 0.2);

  return {
    minOffset: minOffset - offsetPadding,
    maxOffset: maxOffset + offsetPadding,
    minElevation: minElevation - elevationPadding,
    maxElevation: maxElevation + elevationPadding,
  };
}

function project(
  offset: number,
  elevation: number,
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
) {
  const usableWidth = width - 2 * padding;
  const usableHeight = height - 2 * padding;

  const xRatio = (offset - bounds.minOffset) / (bounds.maxOffset - bounds.minOffset || 1);
  const yRatio = (elevation - bounds.minElevation) / (bounds.maxElevation - bounds.minElevation || 1);

  return {
    x: padding + xRatio * usableWidth,
    y: height - (padding + yRatio * usableHeight),
  };
}

export function SectionView({ stationLabel, centerlineElevation, samplePoint }: Props) {
  const width = 820;
  const height = 360;
  const padding = 44;

  const points: SectionPoint[] = [];

  if (samplePoint) {
    points.push({
      label: "Sample point",
      color: "#ef4444",
      offset: samplePoint.offset,
      elevation: samplePoint.elevation,
    });
  }

  if (points.length === 0 && centerlineElevation === undefined) {
    return null;
  }

  const bounds = getBounds(points, centerlineElevation);

  const clBottom = project(0, bounds.minElevation, bounds, width, height, padding);
  const clTop = project(0, bounds.maxElevation, bounds, width, height, padding);

  return (
    <div style={{ marginTop: 24, padding: 20, background: "#1f2937", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 24, textAlign: "center" }}>
        Section View ({stationLabel})
      </h2>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: "#0f172a", borderRadius: 8 }}
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#475569"
          strokeWidth={1.5}
        />

        <line
          x1={clBottom.x}
          y1={clBottom.y}
          x2={clTop.x}
          y2={clTop.y}
          stroke="#f59e0b"
          strokeWidth={2.5}
          strokeDasharray="8 6"
        />

        {centerlineElevation !== undefined && (
          (() => {
            const center = project(0, centerlineElevation, bounds, width, height, padding);

            return (
              <g>
                <circle cx={center.x} cy={center.y} r={5} fill="#f59e0b" stroke="#fff" />
                <text x={center.x + 10} y={center.y - 8} fill="#fcd34d" fontSize={14}>
                  CL Elev. {centerlineElevation.toFixed(3)}
                </text>
              </g>
            );
          })()
        )}

        {points.map((p) => {
          const pt = project(p.offset, p.elevation, bounds, width, height, padding);

          return (
            <g key={`${p.label}-${p.offset}-${p.elevation}`}>
              <circle cx={pt.x} cy={pt.y} r={5} fill={p.color} stroke="#fff" strokeWidth={1.5} />
              <text x={pt.x + 10} y={pt.y - 8} fill="#e2e8f0" fontSize={14}>
                {p.label}: Off {p.offset.toFixed(3)}, Elev {p.elevation.toFixed(3)}
              </text>
            </g>
          );
        })}

        <text x={padding} y={height - 14} fill="#94a3b8" fontSize={14}>
          Left (−) / Right (+) Offset from CL
        </text>
      </svg>
    </div>
  );
}
