import marks from "./server-marks.json";
export function ServerIcon({ name }: { name: string }) {
  const normalized = name.toLowerCase().replace(/^mcp[-_]/, "");
  const service = Object.keys(marks).find(
    (key) =>
      normalized === key ||
      normalized.startsWith(key + "-") ||
      normalized.startsWith(key + "_"),
  ) as keyof typeof marks | undefined;
  const mark = service ? marks[service] : null;
  return (
    <span
      className="mcp-server-icon"
      aria-hidden="true"
      style={{ color: mark?.color ?? "var(--muted-foreground)" }}
    >
      {mark ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d={mark.path} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 3v4m6-4v4M7 7h10v4a5 5 0 0 1-10 0V7Zm5 9v5" />
        </svg>
      )}
    </span>
  );
}
