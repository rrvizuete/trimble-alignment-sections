import { useEffect, useMemo, useState } from "react";
import { parseLandXml } from "./features/xml/landXmlParser";
import { evaluateAlignment } from "./lib/evaluateAlignment";
import { formatStation, parseStation } from "./lib/stationFormat";
import type { Alignment } from "./types/alignment";

export default function App() {
  const [alignments, setAlignments] = useState<Alignment[]>([]);
  const [selectedName, setSelectedName] = useState<string>("");
  const [stationText, setStationText] = useState<string>("");

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
    if (selectedAlignment) {
      setStationText(formatStation(selectedAlignment.staStart));
    }
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
          </div>
        )}

        {evaluation && (
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Evaluation</h2>
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
              <strong>Tangent X:</strong> {evaluation.tangent.x.toFixed(6)}
            </p>
            <p style={styles.textRow}>
              <strong>Tangent Y:</strong> {evaluation.tangent.y.toFixed(6)}
            </p>
          </div>
        )}
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
    maxWidth: "900px",
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
};