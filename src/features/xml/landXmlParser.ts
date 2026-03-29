import { XMLParser } from "fast-xml-parser";
import type { Alignment, Point, Segment } from "../../types/alignment";

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parsePoint(text: string): Point {
  const [x, y] = text.trim().split(/\s+/);
  return {
    x: Number(x),
    y: Number(y),
  };
}

// 🔥 IMPORTANT: preserve document order
function parseSegments(coordGeom: any): Segment[] {
  const segments: Segment[] = [];

  // fast-xml-parser keeps order via array of keys sometimes
  // so we iterate keys in insertion order
  for (const key of Object.keys(coordGeom)) {
    if (key === "Line") {
      for (const line of asArray(coordGeom.Line)) {
        segments.push({
          type: "line",
          start: parsePoint(line.Start),
          end: parsePoint(line.End),
          length: Number(line.length),
        });
      }
    }

    if (key === "Curve") {
      for (const curve of asArray(coordGeom.Curve)) {
        segments.push({
          type: "arc",
          start: parsePoint(curve.Start),
          center: parsePoint(curve.Center),
          end: parsePoint(curve.End),
          radius: Number(curve.radius),
          length: Number(curve.length),
          rotation: curve.rot,
        });
      }
    }
  }

  return segments;
}

export function parseLandXml(xmlText: string): Alignment[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    preserveOrder: false,
  });

  const doc = parser.parse(xmlText);
  const alignmentNodes = asArray(doc?.LandXML?.Alignments?.Alignment);

  return alignmentNodes.map((a: any) => ({
    name: a.name,
    staStart: Number(a.staStart),
    segments: parseSegments(a.CoordGeom),
  }));
}