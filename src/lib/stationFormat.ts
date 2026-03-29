export function parseStation(text: string): number {
  const cleaned = text.trim();

  if (!cleaned) return Number.NaN;

  if (cleaned.includes("+")) {
    const [majorRaw, minorRaw = "0"] = cleaned.split("+");
    const major = Number(majorRaw);
    const minor = Number(minorRaw);

    if (Number.isNaN(major) || Number.isNaN(minor)) {
      return Number.NaN;
    }

    return major * 100 + minor;
  }

  const numeric = Number(cleaned);
  return Number.isNaN(numeric) ? Number.NaN : numeric;
}

export function formatStation(station: number): string {
  if (!Number.isFinite(station)) return "";

  const sign = station < 0 ? "-" : "";
  const absStation = Math.abs(station);

  const rounded = Math.round(absStation * 1000) / 1000;
  const major = Math.floor(rounded / 100);
  const minor = rounded - major * 100;

  const minorText =
    Math.abs(minor - Math.round(minor)) < 1e-9
      ? String(Math.round(minor)).padStart(2, "0")
      : minor.toFixed(3).padStart(6, "0");

  return `${sign}${major}+${minorText}`;
}