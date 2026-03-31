import type {
  Alignment,
  Point,
  Segment,
  VerticalControlPoint,
  VerticalProfile,
} from "../../types/alignment";

function parsePoint(text: string): Point {
  const [first, second] = text.trim().split(/\s+/);

  // Your LandXML point order behaves as:
  // first  = Northing (Y)
  // second = Easting  (X)
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

function parseProfile(alignmentEl: Element): VerticalProfile | undefined {
  const profileEl = Array.from(alignmentEl.children).find(
    (el) => el.localName === "Profile"
  );
  if (!profileEl) return undefined;

  const profAlignEl = Array.from(profileEl.children).find(
    (el) => el.localName === "ProfAlign"
  );
  if (!profAlignEl) return undefined;

  const name = profAlignEl.getAttribute("name") ?? "PGL";

  const points: VerticalControlPoint[] = [];

  for (const child of Array.from(profAlignEl.children)) {
    const tag = child.localName;

    if (tag === "PVI") {
      const text = child.textContent?.trim() ?? "";
      const [stationText, elevationText] = text.split(/\s+/);

      const station = Number(stationText);
      const elevation = Number(elevationText);

      if (Number.isFinite(station) && Number.isFinite(elevation)) {
        points.push({
          station,
          elevation,
          curveLength: 0,
          source: "PVI",
        });
      }
    }

    if (tag === "ParaCurve") {
      const text = child.textContent?.trim() ?? "";
      const [stationText, elevationText] = text.split(/\s+/);

      const station = Number(stationText);
      const elevation = Number(elevationText);
      const curveLength = Number(child.getAttribute("length") ?? "0");

      if (
        Number.isFinite(station) &&
        Number.isFinite(elevation) &&
        Number.isFinite(curveLength)
      ) {
        points.push({
          station,
          elevation,
          curveLength,
          source: "ParaCurve",
        });
      }
    }
  }

  if (points.length === 0) return undefined;

  return {
    name,
    points,
  };
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
      Array.from(alignmentEl.children).find((el) => el.localName === "CoordGeom") ??
      null;

    return {
      name,
      staStart,
      segments: parseSegmentsInOrder(coordGeomEl),
      profile: parseProfile(alignmentEl),
    };
  });
}