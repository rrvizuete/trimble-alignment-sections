import type { Alignment, Point, Segment } from "../../types/alignment";

function parsePoint(text: string): Point {
  const [x, y] = text.trim().split(/\s+/);
  return {
    x: Number(x),
    y: Number(y),
  };
}

function parseSegmentsInOrder(coordGeomEl: Element | null): Segment[] {
  if (!coordGeomEl) return [];

  const segments: Segment[] = [];

  for (const child of Array.from(coordGeomEl.children)) {
    const tag = child.localName;

    if (tag === "Line") {
      const startText = child.querySelector(":scope > Start")?.textContent ?? "";
      const endText = child.querySelector(":scope > End")?.textContent ?? "";
      const lengthText = child.getAttribute("length") ?? "0";

      segments.push({
        type: "line",
        start: parsePoint(startText),
        end: parsePoint(endText),
        length: Number(lengthText),
      });
    }

    if (tag === "Curve") {
      const startText = child.querySelector(":scope > Start")?.textContent ?? "";
      const centerText = child.querySelector(":scope > Center")?.textContent ?? "";
      const endText = child.querySelector(":scope > End")?.textContent ?? "";
      const radiusText = child.getAttribute("radius") ?? "0";
      const lengthText = child.getAttribute("length") ?? "0";
      const rotation = (child.getAttribute("rot") ?? "cw") as "cw" | "ccw";

      segments.push({
        type: "arc",
        start: parsePoint(startText),
        center: parsePoint(centerText),
        end: parsePoint(endText),
        radius: Number(radiusText),
        length: Number(lengthText),
        rotation,
      });
    }
  }

  return segments;
}

export function parseLandXml(xmlText: string): Alignment[] {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");

  const parserError = xml.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid XML file.");
  }

  const alignmentElements = Array.from(xml.getElementsByTagNameNS("*", "Alignment"));

  return alignmentElements.map((alignmentEl) => {
    const name = alignmentEl.getAttribute("name") ?? "Unnamed";
    const staStart = Number(alignmentEl.getAttribute("staStart") ?? "0");

    const coordGeomEl = Array.from(alignmentEl.children).find(
      (el) => el.localName === "CoordGeom"
    ) ?? null;

    return {
      name,
      staStart,
      segments: parseSegmentsInOrder(coordGeomEl),
    };
  });
}