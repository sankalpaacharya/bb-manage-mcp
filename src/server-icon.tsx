import marks from "./server-marks.json";
const palette = ["#d97757", "#10a37f", "#4285f4", "#8b7cf8", "#c08a35"];
export function ServerIcon({ name }: { name: string }) {
  const normalized = name.toLowerCase().replace(/^mcp[-_]/, "");
  const service = Object.keys(marks).find(
    (key) =>
      normalized === key ||
      normalized.startsWith(key + "-") ||
      normalized.startsWith(key + "_"),
  ) as keyof typeof marks | undefined;
  const mark = service ? marks[service] : null;
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const initials =
    name
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "M";
  return (
    <span
      className="mcp-server-icon"
      aria-hidden="true"
      style={{ color: mark?.color ?? palette[hash % palette.length] }}
    >
      {mark ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d={mark.path} />
        </svg>
      ) : (
        initials
      )}
    </span>
  );
}
