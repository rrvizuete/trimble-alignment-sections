import { useState } from "react";
import type { WheelEvent } from "react";
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

function getDecadeStep(range: number, targetLines = 8) {
  const rawStep = range / targetLines;
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  return 10 ** Math.floor(Math.log10(rawStep));
}

function buildTicks(min: number, max: number, step: number) {
  const ticks: number[] = [];
  const epsilon = step / 1000;
  const start = Math.ceil((min - epsilon) / step) * step;

  for (let value = start; value <= max + epsilon; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }

  return ticks;
}

function formatTick(value: number, step: number) {
  if (Math.abs(value) < step / 1000) {
    return "0";
  }

  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return value.toFixed(Math.min(6, decimals));
}

export function SectionView({ stationLabel, centerlineElevation, samplePoint }: Props) {
  const width = 820;
  const height = 360;
  const padding = 44;
  const [zoom, setZoom] = useState(1);
  const [zoomActive, setZoomActive] = useState(false);

  const points: SectionPoint[] = [];

  if (samplePoint) {
    points.push({
      label: "Sample point",
      color: "#22d3ee",
      offset: samplePoint.offset,
      elevation: samplePoint.elevation,
    });
  }

  const baseBounds = getBounds(points, centerlineElevation);
  const offsetCenter = 0;
  const elevationCenter =
    centerlineElevation ?? (baseBounds.minElevation + baseBounds.maxElevation) / 2;
  const offsetHalf = (baseBounds.maxOffset - baseBounds.minOffset) / 2 / zoom;
  const elevationHalf = (baseBounds.maxElevation - baseBounds.minElevation) / 2 / zoom;
  const bounds = {
    minOffset: offsetCenter - offsetHalf,
    maxOffset: offsetCenter + offsetHalf,
    minElevation: elevationCenter - elevationHalf,
    maxElevation: elevationCenter + elevationHalf,
  };

  if (points.length === 0 && centerlineElevation === undefined) {
    return null;
  }

  const clBottom = project(0, bounds.minElevation, bounds, width, height, padding);
  const clTop = project(0, bounds.maxElevation, bounds, width, height, padding);
  const clElevation =
    centerlineElevation ??
    (bounds.minElevation + bounds.maxElevation) / 2;
  const clPoint = project(0, clElevation, bounds, width, height, padding);

  const offsetStep = getDecadeStep(bounds.maxOffset - bounds.minOffset);
  const elevationStep = getDecadeStep(bounds.maxElevation - bounds.minElevation);
  const offsetTicks = buildTicks(bounds.minOffset, bounds.maxOffset, offsetStep);
  const elevationTicks = buildTicks(bounds.minElevation, bounds.maxElevation, elevationStep);
  const pxPerOffsetStep = (width - 2 * padding) * (offsetStep / (bounds.maxOffset - bounds.minOffset || 1));
  const pxPerElevationStep =
    (height - 2 * padding) * (elevationStep / (bounds.maxElevation - bounds.minElevation || 1));
  const offsetLabelEvery = Math.max(1, Math.ceil(56 / pxPerOffsetStep));
  const elevationLabelEvery = Math.max(1, Math.ceil(28 / pxPerElevationStep));

  const handleWheelZoom = (event: WheelEvent<SVGSVGElement>) => {
    if (!zoomActive) return;

    event.preventDefault();

    const zoomFactor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    setZoom((currentZoom) => {
      const nextZoom = currentZoom * zoomFactor;
      return Math.min(64, Math.max(0.25, Number(nextZoom.toFixed(4))));
    });
  };

  return (
    <div
      tabIndex={0}
      onClick={() => setZoomActive(true)}
      onBlur={() => setZoomActive(false)}
      style={{ outline: "none" }}
    >
      <h2 style={{ margin: 0, marginBottom: 12, fontSize: 24, textAlign: "center", color: "#e2e8f0", flex: 1 }}>
        Section View ({stationLabel})
      </h2>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: "#0f172a", borderRadius: 8 }}
        onWheel={handleWheelZoom}
      >
        {offsetTicks.map((offset, index) => {
          const x = project(offset, bounds.minElevation, bounds, width, height, padding).x;
          const isCenterline = Math.abs(offset) < 0.001;
          const showLabel = isCenterline || index % offsetLabelEvery === 0;
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
              {showLabel && (
                <text x={x} y={height - padding + 16} textAnchor="middle" fill="#94a3b8" fontSize={11}>
                  {formatTick(offset, offsetStep)}
                </text>
              )}
            </g>
          );
        })}

        {elevationTicks.map((elevation, index) => {
          const y = project(bounds.minOffset, elevation, bounds, width, height, padding).y;
          const nearClElevation = Math.abs(elevation - clElevation) < elevationStep / 1000;
          const showLabel = nearClElevation || index % elevationLabelEvery === 0;
          return (
            <g key={`elevation-grid-${elevation}`}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#1e293b" strokeWidth={1} />
              {showLabel && (
                <text x={padding - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize={11}>
                  {formatTick(elevation, elevationStep)}
                </text>
              )}
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
          Grid: Offsets and Elevations (click card, then wheel to zoom)
        </text>
      </svg>
    </div>
  );
}
