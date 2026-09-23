import { useEffect, useRef, useState } from "react";
import { tagListSchema } from "./tags";

export function TagPicker({
  name,
  tags,
  suggestions,
  onSave,
}: {
  name: string;
  tags: string[];
  suggestions: string[];
  onSave?: (tags: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const save = async (values: string[]) => {
    if (!onSave || busy) return;
    const parsed = tagListSchema.safeParse(values);
    if (!parsed.success) {
      setError("Use up to 8 tags, 32 characters each, without commas.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(parsed.data);
      setQuery("");
    } catch {
      setError("Could not save tags. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const value = query.trim().toLocaleLowerCase();
  const options = [...new Set([...tags, ...suggestions])]
    .filter((tag) => tag.includes(value))
    .sort();
  return (
    <div
      className="mcp-tag-picker"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="mcp-tag-button"
        aria-label={`Edit tags for ${name}`}
        aria-expanded={open}
        disabled={!onSave}
        onClick={() => {
          setOpen(!open);
          setQuery("");
          setError("");
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m16 3 5 5M4 15 16.5 2.5a2.1 2.1 0 0 1 3 3L7 18l-4 1 1-4Z" />
        </svg>
      </button>
      {open && (
        <div
          className="mcp-tag-popover"
          role="dialog"
          aria-label={`Tags for ${name}`}
          aria-busy={busy}
        >
          <input
            autoFocus
            aria-label="Find or create a tag"
            placeholder="Find or create a tag…"
            value={query}
            maxLength={32}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (value && !tags.includes(value)) void save([...tags, value]);
              }
            }}
          />
          <div className="mcp-tag-options">
            {options.map((tag) => (
              <button
                key={tag}
                disabled={busy}
                aria-pressed={tags.includes(tag)}
                onClick={() =>
                  void save(
                    tags.includes(tag)
                      ? tags.filter((item) => item !== tag)
                      : [...tags, tag],
                  )
                }
              >
                <span>{tag}</span>
                <span aria-hidden="true">{tags.includes(tag) ? "✓" : "+"}</span>
              </button>
            ))}
            {value && !options.includes(value) && (
              <button
                disabled={busy}
                onClick={() => void save([...tags, value])}
              >
                Create “{value}”
              </button>
            )}
            {!value && !options.length && <p>Type a tag and press Enter.</p>}
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
