import { useEffect, useMemo, useState } from "react";
import { parseLandXml } from "./features/xml/landXmlParser";
import { evaluateAlignment } from "./lib/evaluateAlignment";
import { formatStation, parseStation } from "./lib/stationFormat";
import { worldToSectionCoordinates } from "./lib/sectionTransform";
import { PlanView } from "./components/PlanView";
import { SectionView } from "./components/SectionView";
import type { Alignment } from "./types/alignment";

export default function App() {
  const [alignments, setAlignments] = useState<Alignment[]>([]);
  const [selectedName, setSelectedName] = useState<string>("");
  const [stationText, setStationText] = useState<string>("");

  const [testPointX, setTestPointX] = useState<string>("");
  const [testPointY, setTestPointY] = useState<string>("");
  const [testPointZ, setTestPointZ] = useState<string>("");

  const applyAlignmentDefaults = (alignment: Alignment) => {
    const firstSegment = alignment.segments[0];
    if (firstSegment) {
      setTestPointX(firstSegment.start.x.toFixed(3));
      setTestPointY(firstSegment.start.y.toFixed(3));
    }

    setTestPointZ(alignment.profile?.points?.[0]?.elevation?.toFixed(3) ?? "0.000");
  };

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
          applyAlignmentDefaults(parsed[0]);
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
        <div style={styles.workspace}>
          <div style={styles.sidebar}>
            <div style={styles.panel}>
              <div style={styles.field}>
                <label htmlFor="alignment-select" style={styles.label}>
                  Select Alignment
                </label>
                <select
                  id="alignment-select"
                  value={selectedName}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setSelectedName(nextName);
                    const nextAlignment = alignments.find((a) => a.name === nextName);
                    if (nextAlignment) {
                      setStationText(formatStation(nextAlignment.staStart));
                      applyAlignmentDefaults(nextAlignment);
                    }
                  }}
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
            </div>

            {selectedAlignment && (
              <div style={styles.panel}>
                <h2 style={styles.panelTitle}>Alignment Info</h2>
                <p style={styles.smallTextRow}>
                  <strong>Name:</strong> {selectedAlignment.name}
                </p>
                <p style={styles.smallTextRow}>
                  <strong>Start station:</strong> {formatStation(selectedAlignment.staStart)}
                </p>
                <p style={styles.smallTextRow}>
                  <strong>Segments:</strong> {selectedAlignment.segments.length}
                </p>
                <p style={styles.smallTextRow}>
                  <strong>Profile:</strong>{" "}
                  {selectedAlignment.profile
                    ? `${selectedAlignment.profile.name} (${selectedAlignment.profile.points.length} control points)`
                    : "No profile found"}
                </p>
              </div>
            )}

            <div style={styles.panel}>
              <h2 style={styles.panelTitle}>Station / Coordinates</h2>
              {evaluation ? (
                <>
                  <p style={styles.smallTextRow}>
                    <strong>Type:</strong> {evaluation.segmentType}
                  </p>
                  <p style={styles.smallTextRow}>
                    <strong>X/Y/Z:</strong> {evaluation.x.toFixed(3)} / {evaluation.y.toFixed(3)} /{" "}
                    {evaluation.z !== undefined ? evaluation.z.toFixed(3) : "N/A"}
                  </p>
                  <p style={styles.smallTextRow}>
                    <strong>Tangent:</strong> {evaluation.tangent.x.toFixed(4)}, {evaluation.tangent.y.toFixed(4)}
                  </p>
                </>
              ) : (
                <p style={styles.smallTextRow}>Enter a valid station to evaluate alignment.</p>
              )}

              <h3 style={styles.subPanelTitle}>Test Point</h3>
              <div style={styles.testPointGrid}>
                <div>
                  <label htmlFor="test-point-x" style={styles.smallLabel}>
                    X
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
                    Y
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
                    Z
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
                <p style={{ ...styles.smallTextRow, marginTop: 10 }}>
                  <strong>Off/Elev/Along:</strong> {sectionCoords.offset.toFixed(3)} /{" "}
                  {sectionCoords.elevation.toFixed(3)} / {sectionCoords.along.toFixed(3)}
                </p>
              )}
            </div>
          </div>

          <div style={{ ...styles.visualPanel, ...styles.planPanel }}>
            {selectedAlignment && <PlanView alignment={selectedAlignment} evaluation={evaluation} />}
          </div>
          <div style={{ ...styles.visualPanel, ...styles.sectionPanel }}>
            <SectionView
              stationLabel={stationText || "N/A"}
              centerlineElevation={evaluation?.z}
              samplePoint={sectionCoords}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    background: "#0f172a",
    color: "#e5e7eb",
    padding: "8px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    height: "100%",
    background: "#111827",
    borderRadius: "14px",
    padding: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  title: {
    marginTop: 0,
    marginBottom: "10px",
    fontSize: "30px",
    lineHeight: 1.1,
    textAlign: "center",
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "12px",
    minHeight: 0,
    flex: 1,
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: 0,
    overflowY: "auto",
    gridColumn: 1,
    gridRow: 1,
  },
  visualPanel: {
    padding: "12px",
    background: "#1f2937",
    borderRadius: "12px",
    overflow: "hidden",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  planPanel: {
    gridColumn: 2,
    gridRow: 1,
  },
  sectionPanel: {
    gridColumn: "1 / span 2",
    gridRow: 2,
  },
  field: {
    marginBottom: "8px",
  },
  label: {
    display: "block",
    marginBottom: "4px",
    fontSize: "14px",
    color: "#cbd5e1",
    textAlign: "left",
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#e5e7eb",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#e5e7eb",
  },
  panel: {
    marginTop: 0,
    padding: "16px",
    background: "#1f2937",
    borderRadius: "12px",
    textAlign: "center",
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "18px",
    color: "#e2e8f0",
  },
  subPanelTitle: {
    marginTop: "10px",
    marginBottom: "6px",
    fontSize: "14px",
    color: "#e2e8f0",
  },
  smallTextRow: {
    margin: "4px 0",
    fontSize: "13px",
    lineHeight: 1.35,
  },
  textRow: {
    margin: "8px 0",
    fontSize: "18px",
  },
  testPointGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
    marginTop: "4px",
  },
  smallLabel: {
    display: "block",
    marginBottom: "4px",
    fontSize: "12px",
    color: "#cbd5e1",
  },
  smallInput: {
    width: "100%",
    padding: "6px 8px",
    fontSize: "13px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#e5e7eb",
    boxSizing: "border-box",
  },
};
