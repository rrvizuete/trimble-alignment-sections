export type Point = {
  x: number;
  y: number;
};

export type LineSegment = {
  type: "line";
  start: Point;
  end: Point;
  length: number;
};

export type ArcSegment = {
  type: "arc";
  start: Point;
  center: Point;
  end: Point;
  radius: number;
  length: number;
  rotation: "cw" | "ccw";
};

export type Segment = LineSegment | ArcSegment;

export type Alignment = {
  name: string;
  staStart: number;
  segments: Segment[];
};