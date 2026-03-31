import type { Alignment, Point, Segment } from "../../types/alignment";

function parsePoint(text: string): Point {
  const [first, second] = text.trim().split(/\s+/);

  // LandXML point order in your file matches:
  // first  = Y (Northing)
  // second = X (Easting)
  // Civil 3D is showing X/Y in the opposite order from how we were reading it.
  return {
    x: Number(second),
    y: Number(first),
  };
}

function getDirectChildText(parent: Element, tagName: string): string {
  const child = Array.from(parent.children).find((el) => el.localName === tagName);
  return child?.textContent?.trim() ?? "";
}

function parseSegmentsInOrder(coordGeomEl: Element | null): Segment[] {
  if (!coordGeomEl) return [];

  const segments: Segment[] = [];

  for (const child of Array.from(coordGeomEl.children)) {
    const tag = child.localName;

    if (tag === "Line") {
      const startText = getDirectChildText(child, "Start");
      const endText = getDirectChildText(child, "End");
      const lengthText = child.getAttribute("length") ?? "0";

      segments.push({
        type: "line",
        start: parsePoint(startText),
        end: parsePoint(endText),
        length: Number(lengthText),
      });
    }

    if (tag === "Curve") {
      const startText = getDirectChildText(child, "Start");
      const centerText = getDirectChildText(child, "Center");
      const endText = getDirectChildText(child, "End");
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

    const coordGeomEl =
      Array.from(alignmentEl.children).find((el) => el.localName === "CoordGeom") ?? null;

    return {
      name,
      staStart,
      segments: parseSegmentsInOrder(coordGeomEl),
    };
  });
}