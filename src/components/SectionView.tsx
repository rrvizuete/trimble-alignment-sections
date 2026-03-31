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
  const maxAbsOffset = Math.max(20, ...points.map((p) => Math.abs(p.offset)));
  const offsetHalfRange = Math.ceil((maxAbsOffset * 1.2) / 5) * 5;

  const elevationDatum = centerlineElevation ?? (points[0]?.elevation ?? 0);
  const maxElevationDelta = Math.max(2, ...points.map((p) => Math.abs(p.elevation - elevationDatum)));
  const elevationHalfRange = Math.ceil((maxElevationDelta * 1.5) / 1) * 1;

  return {
    minOffset: -offsetHalfRange,
    maxOffset: offsetHalfRange,
    minElevation: elevationDatum - elevationHalfRange,
    maxElevation: elevationDatum + elevationHalfRange,
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
  const clElevation =
    centerlineElevation ??
    (bounds.minElevation + bounds.maxElevation) / 2;
  const clPoint = project(0, clElevation, bounds, width, height, padding);

  const offsetStep = Math.max(5, Math.round((bounds.maxOffset - bounds.minOffset) / 8 / 5) * 5);
  const elevationStep = Math.max(0.5, Number(((bounds.maxElevation - bounds.minElevation) / 8).toFixed(1)));

  const offsetTicks: number[] = [];
  for (let offset = bounds.minOffset; offset <= bounds.maxOffset + 0.001; offset += offsetStep) {
    offsetTicks.push(Number(offset.toFixed(3)));
  }

  const elevationTicks: number[] = [];
  for (
    let elevation = bounds.minElevation;
    elevation <= bounds.maxElevation + 0.001;
    elevation += elevationStep
  ) {
    elevationTicks.push(Number(elevation.toFixed(3)));
  }

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
        {offsetTicks.map((offset) => {
          const x = project(offset, bounds.minElevation, bounds, width, height, padding).x;
          const isCenterline = Math.abs(offset) < 0.001;
          return (
            <g key={`offset-grid-${offset}`}>
              <line
                x1={x}
                y1={padding}
                x2={x}
                y2={height - padding}
                stroke={isCenterline ? "#334155" : "#1e293b"}
                strokeWidth={isCenterline ? 1.4 : 1}
              />
              <text x={x} y={height - padding + 16} textAnchor="middle" fill="#94a3b8" fontSize={11}>
                {offset.toFixed(0)}
              </text>
            </g>
          );
        })}

        {elevationTicks.map((elevation) => {
          const y = project(bounds.minOffset, elevation, bounds, width, height, padding).y;
          return (
            <g key={`elevation-grid-${elevation}`}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#1e293b" strokeWidth={1} />
              <text x={padding - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize={11}>
                {elevation.toFixed(2)}
              </text>
            </g>
          );
        })}

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
          <g>
            <circle cx={clPoint.x} cy={clPoint.y} r={5} fill="#ef4444" stroke="#fff" />
            <text x={clPoint.x + 10} y={clPoint.y - 8} fill="#fecaca" fontSize={14}>
              CL Elev. {centerlineElevation.toFixed(3)}
            </text>
          </g>
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
        <text x={padding} y={padding - 10} fill="#94a3b8" fontSize={12}>
          Grid: Offsets (m) and Elevations (m)
        </text>
      </svg>
    </div>
  );
}
