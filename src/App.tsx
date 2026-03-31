import { useEffect, useMemo, useState } from "react";
import { parseLandXml } from "./features/xml/landXmlParser";
import { evaluateAlignment } from "./lib/evaluateAlignment";
import { formatStation, parseStation } from "./lib/stationFormat";
import { worldToSectionCoordinates } from "./lib/sectionTransform";
import { PlanView } from "./components/PlanView";
import type { Alignment } from "./types/alignment";

export default function App() {
  const [alignments, setAlignments] = useState<Alignment[]>([]);
  const [selectedName, setSelectedName] = useState<string>("");
  const [stationText, setStationText] = useState<string>("");

  const [testPointX, setTestPointX] = useState<string>("");
  const [testPointY, setTestPointY] = useState<string>("");
  const [testPointZ, setTestPointZ] = useState<string>("");

  useEffect(() => {
    fetch("/sample-data/3485-ALG-XX-RWY-DES-AFC.xml")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load XML: ${res.status}`);
        }
        return res.text();
      })
      .then((xml) => {
        const parsed = parseLandXml(xml);
        setAlignments(parsed);

        if (parsed.length > 0) {
          setSelectedName(parsed[0].name);
          setStationText(formatStation(parsed[0].staStart));
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const selectedAlignment = useMemo(
    () => alignments.find((a) => a.name === selectedName),
    [alignments, selectedName]
  );

  useEffect(() => {
    if (!selectedAlignment) return;

    setStationText(formatStation(selectedAlignment.staStart));

    const firstSegment = selectedAlignment.segments[0];
    if (!firstSegment) return;

    if (firstSegment.type === "line") {
      setTestPointX(firstSegment.start.x.toFixed(3));
      setTestPointY(firstSegment.start.y.toFixed(3));
    } else {
      setTestPointX(firstSegment.start.x.toFixed(3));
      setTestPointY(firstSegment.start.y.toFixed(3));
    }

    setTestPointZ(
      selectedAlignment.profile?.points?.[0]?.elevation?.toFixed(3) ?? "0.000"
    );
  }, [selectedAlignment]);

  const evaluation = useMemo(() => {
    if (!selectedAlignment || !stationText.trim()) return null;

    try {
      const station = parseStation(stationText);
      if (Number.isNaN(station)) return null;
      return evaluateAlignment(selectedAlignment, station);
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [selectedAlignment, stationText]);

  const sectionCoords = useMemo(() => {
    if (!evaluation) return null;

    const x = Number(testPointX);
    const y = Number(testPointY);
    const z = Number(testPointZ);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return null;
    }

    return worldToSectionCoordinates(evaluation, { x, y, z });
  }, [evaluation, testPointX, testPointY, testPointZ]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Alignment Explorer</h1>

        <div style={styles.field}>
          <label htmlFor="alignment-select" style={styles.label}>
            Select Alignment
          </label>
          <select
            id="alignment-select"
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            style={styles.select}
          >
            {alignments.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label htmlFor="station-input" style={styles.label}>
            Station
          </label>
          <input
            id="station-input"
            type="text"
            value={stationText}
            onChange={(e) => setStationText(e.target.value)}
            placeholder="355+00"
            style={styles.input}
          />
        </div>

        {selectedAlignment && (
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Alignment Info</h2>
            <p style={styles.textRow}>
              <strong>Name:</strong> {selectedAlignment.name}
            </p>
            <p style={styles.textRow}>
              <strong>Start station:</strong> {formatStation(selectedAlignment.staStart)}
            </p>
            <p style={styles.textRow}>
              <strong>Segments:</strong> {selectedAlignment.segments.length}
            </p>
            <p style={styles.textRow}>
              <strong>Profile:</strong>{" "}
              {selectedAlignment.profile
                ? `${selectedAlignment.profile.name} (${selectedAlignment.profile.points.length} control points)`
                : "No profile found"}
            </p>
          </div>
        )}

        {evaluation && (
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Station Evaluation</h2>
            <p style={styles.textRow}>
              <strong>Station:</strong> {stationText}
            </p>
            <p style={styles.textRow}>
              <strong>Segment type:</strong> {evaluation.segmentType}
            </p>
            <p style={styles.textRow}>
              <strong>X:</strong> {evaluation.x.toFixed(3)}
            </p>
            <p style={styles.textRow}>
              <strong>Y:</strong> {evaluation.y.toFixed(3)}
            </p>
            <p style={styles.textRow}>
              <strong>Z:</strong>{" "}
              {evaluation.z !== undefined ? evaluation.z.toFixed(3) : "N/A"}
            </p>
            <p style={styles.textRow}>
              <strong>Tangent X:</strong> {evaluation.tangent.x.toFixed(6)}
            </p>
            <p style={styles.textRow}>
              <strong>Tangent Y:</strong> {evaluation.tangent.y.toFixed(6)}
            </p>
            <p style={styles.textRow}>
              <strong>Section normal X:</strong> {evaluation.normal.x.toFixed(6)}
            </p>
            <p style={styles.textRow}>
              <strong>Section normal Y:</strong> {evaluation.normal.y.toFixed(6)}
            </p>
          </div>
        )}

        {selectedAlignment && <PlanView alignment={selectedAlignment} evaluation={evaluation} />}

        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Test World Point → Section Coordinates</h2>

          <div style={styles.testPointGrid}>
            <div>
              <label htmlFor="test-point-x" style={styles.smallLabel}>
                Point X
              </label>
              <input
                id="test-point-x"
                type="text"
                value={testPointX}
                onChange={(e) => setTestPointX(e.target.value)}
                style={styles.smallInput}
              />
            </div>

            <div>
              <label htmlFor="test-point-y" style={styles.smallLabel}>
                Point Y
              </label>
              <input
                id="test-point-y"
                type="text"
                value={testPointY}
                onChange={(e) => setTestPointY(e.target.value)}
                style={styles.smallInput}
              />
            </div>

            <div>
              <label htmlFor="test-point-z" style={styles.smallLabel}>
                Point Z
              </label>
              <input
                id="test-point-z"
                type="text"
                value={testPointZ}
                onChange={(e) => setTestPointZ(e.target.value)}
                style={styles.smallInput}
              />
            </div>
          </div>

          {sectionCoords && (
            <div style={{ marginTop: 18 }}>
              <p style={styles.textRow}>
                <strong>Offset from CL:</strong> {sectionCoords.offset.toFixed(3)}
              </p>
              <p style={styles.textRow}>
                <strong>Elevation:</strong> {sectionCoords.elevation.toFixed(3)}
              </p>
              <p style={styles.textRow}>
                <strong>Along-tangent distance:</strong> {sectionCoords.along.toFixed(3)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e5e7eb",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "980px",
    margin: "0 auto",
    background: "#111827",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
  title: {
    marginTop: 0,
    marginBottom: "24px",
    fontSize: "42px",
    lineHeight: 1.1,
    textAlign: "center",
  },
  field: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "18px",
    color: "#cbd5e1",
    textAlign: "center",
  },
  select: {
    width: "100%",
    maxWidth: "620px",
    display: "block",
    margin: "0 auto",
    padding: "10px 12px",
    fontSize: "18px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#e5e7eb",
  },
  input: {
    width: "100%",
    maxWidth: "620px",
    display: "block",
    margin: "0 auto",
    padding: "10px 12px",
    fontSize: "18px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#e5e7eb",
  },
  panel: {
    marginTop: "24px",
    padding: "20px",
    background: "#1f2937",
    borderRadius: "12px",
    textAlign: "center",
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: "12px",
    fontSize: "24px",
  },
  textRow: {
    margin: "8px 0",
    fontSize: "18px",
  },
  testPointGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
    marginTop: "8px",
  },
  smallLabel: {
    display: "block",
    marginBottom: "6px",
    fontSize: "16px",
    color: "#cbd5e1",
  },
  smallInput: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#e5e7eb",
    boxSizing: "border-box",
  },
};