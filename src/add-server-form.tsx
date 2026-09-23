import { useState } from "react";
import { HARNESSES, type Harness, type Source } from "./model";
import { addInput, type AddInput } from "./add-contract";

export function AddServerForm({
  sources,
  onAdd,
  onClose,
}: {
  sources: Source[];
  onAdd: (input: AddInput) => Promise<void>;
  onClose: () => void;
}) {
  const [harness, setHarness] = useState<Harness>("Claude Code");
  const [source, setSource] = useState("");
  const [transport, setTransport] = useState("http");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destinations = sources.filter(
    (item) => item.harness === harness && item.status !== "error",
  );
  const path =
    source ||
    destinations.find(
      (item) => item.scope === "user" && item.status === "loaded",
    )?.path ||
    destinations[0]?.path ||
    "";
  return (
    <form
      className="mcp-add-form"
      aria-label="Add MCP connection"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = addInput.safeParse({
          harness,
          source: path,
          name,
          transport,
          ...(transport === "http"
            ? { url }
            : { command, args: args ? args.split("\n") : [] }),
        });
        if (!parsed.success) {
          setError(
            "Check the name and connection details. Names can contain letters, numbers, dots, hyphens and underscores.",
          );
          return;
        }
        setBusy(true);
        setError("");
        try {
          await onAdd(parsed.data);
          onClose();
        } catch {
          setError(
            "Could not add this MCP. Check for a duplicate name, invalid configuration, or file permissions.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Add MCP</h2>
      <fieldset disabled={busy}>
        <label>
          Harness
          <select
            value={harness}
            onChange={(event) => {
              setHarness(event.target.value as Harness);
              setSource("");
            }}
          >
            {HARNESSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Configuration
          <select
            value={path}
            onChange={(event) => setSource(event.target.value)}
          >
            {destinations.map((item) => (
              <option key={item.path} value={item.path}>
                {item.scope === "user" ? "User-wide" : item.project} ·{" "}
                {item.path.split("/").pop()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="my-server"
            maxLength={159}
          />
        </label>
        <label>
          Connection type
          <select
            value={transport}
            onChange={(event) => setTransport(event.target.value)}
          >
            <option value="http">Remote URL</option>
            <option value="stdio">Local command</option>
          </select>
        </label>
        {transport === "http" ? (
          <label className="mcp-form-wide">
            Server URL
            <input
              required
              type="url"
              placeholder="https://example.com/mcp"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
        ) : (
          <>
            <label>
              Command
              <input
                required
                placeholder="npx"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
              />
            </label>
            <label>
              Arguments · one per line
              <textarea
                rows={3}
                placeholder={"-y\n@package/mcp-server"}
                value={args}
                onChange={(event) => setArgs(event.target.value)}
              />
            </label>
          </>
        )}
      </fieldset>
      <p className="mcp-config-path">
        {path || "No writable configuration available for this harness."}
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="mcp-form-actions">
        <button disabled={busy || !path}>
          {busy ? "Adding…" : "Add connection"}
        </button>
        <button type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
