import { useEffect, useState } from "react";
import { HARNESSES, type Harness, type Inventory, type Server } from "./model";
import type { ActionResult } from "./actions";
import {
  useConnectionChecks,
  type ConnectionCheck,
} from "./use-connection-checks";
import { HarnessIcon } from "./harness-icons";

export interface Actions {
  check: (id: string) => Promise<ActionResult>;
  authenticate: (id: string) => Promise<ActionResult>;
  poll: (id: string) => Promise<ActionResult>;
  cancel: (id: string) => Promise<ActionResult>;
}
function ServerRow({
  server,
  actions,
  hidden,
  connection,
  onCheck,
}: {
  server: Server;
  actions?: Actions;
  hidden: boolean;
  connection?: ConnectionCheck;
  onCheck: (id: string) => Promise<void>;
}) {
  const status = connection?.result;
  const [auth, setAuth] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!actions || auth?.state !== "waiting" || !auth.taskId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await actions.poll(auth.taskId!);
        if (!stopped) {
          setAuth(next);
          if (next.state === "waiting") timer = setTimeout(poll, 2000);
        }
      } catch {
        if (!stopped) {
          setError("Could not check sign-in progress.");
          timer = setTimeout(poll, 5000);
        }
      }
    };
    timer = setTimeout(poll, 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [actions, auth?.taskId, auth?.state]);
  const run = async (kind: "check" | "authenticate") => {
    if (!actions) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "check") await onCheck(server.id);
      else
        setAuth(
          auth?.state === "waiting" && auth.taskId
            ? await actions.cancel(auth.taskId)
            : await actions.authenticate(server.id),
        );
    } catch {
      setError("Action failed. Check your host connection and try again.");
    } finally {
      setBusy(null);
    }
  };
  const unavailable = server.state !== "configured" || !actions;
  return (
    <li className="mcp-row" hidden={hidden}>
      <div className="mcp-name">
        <strong>{server.name}</strong>
        <span>{server.project ?? "User configuration"}</span>
      </div>
      <span className="mcp-row-harness">
        <HarnessIcon harness={server.harness} />
        {server.harness}
      </span>
      <span className="mcp-status" role="status">
        <span aria-hidden="true">
          {status?.state === "connected" ? "●" : "○"}
        </span>
        {server.state === "disabled"
          ? "Disabled"
          : server.state === "invalid"
            ? "Incomplete"
            : (status?.message ??
              (connection?.pending ? "Checking…" : "Not checked"))}
      </span>
      <div className="mcp-actions">
        <button
          disabled={unavailable || busy !== null || connection?.pending}
          onClick={() => void run("check")}
        >
          {busy === "check" || connection?.pending
            ? "Checking…"
            : "Check status"}
        </button>
        <button
          disabled={unavailable || busy !== null}
          onClick={() => void run("authenticate")}
        >
          {busy === "authenticate"
            ? "Starting…"
            : auth?.state === "waiting"
              ? "Cancel sign-in"
              : "Re-authenticate"}
        </button>
      </div>
      {(error || auth) && (
        <div className="mcp-message" role="status">
          {error ?? auth?.message}
          {auth?.url && (
            <a href={auth.url} target="_blank" rel="noreferrer">
              Open sign-in page ↗
            </a>
          )}
          {auth?.command && auth.state !== "complete" && (
            <code>{auth.command}</code>
          )}
        </div>
      )}
    </li>
  );
}
export function InventoryView({
  inventory,
  pending,
  error,
  onRefresh,
  actions,
  cachedChecks,
}: {
  cachedChecks?: Record<string, ConnectionCheck>;
  inventory: Inventory | null;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
  actions?: Actions;
}) {
  const { checks, check } = useConnectionChecks(cachedChecks, actions?.check);
  const [harness, setHarness] = useState<Harness | null>(null);
  const entries = inventory?.servers ?? [];
  const visible = entries.filter(
    (entry) => !harness || entry.harness === harness,
  );
  const issues =
    inventory?.sources.filter((source) => source.status === "error") ?? [];
  return (
    <div className="mcp-simple">
      <main>
        <header>
          <h1>
            MCP connections <span>{inventory ? entries.length : "—"}</span>
          </h1>
          <button onClick={onRefresh} disabled={pending}>
            {pending ? "Refreshing…" : "Refresh"}
          </button>
        </header>
        <nav className="mcp-harnesses" aria-label="Filter by harness">
          <button
            aria-pressed={harness === null}
            onClick={() => setHarness(null)}
          >
            All <span>{entries.length}</span>
          </button>
          {HARNESSES.map((name) => (
            <button
              key={name}
              aria-pressed={harness === name}
              onClick={() => setHarness(harness === name ? null : name)}
            >
              <HarnessIcon harness={name} />
              <span>{name}</span>
              <span className="mcp-count">
                {entries.filter((entry) => entry.harness === name).length}
              </span>
            </button>
          ))}
        </nav>
        {error && <p role="alert">{error}</p>}
        <section aria-label="MCP servers" aria-busy={pending}>
          {!inventory ? (
            <p className="mcp-empty">
              {pending
                ? "Reading configurations…"
                : "Unable to load connections."}
            </p>
          ) : (
            <>
              <ul className="mcp-list">
                {[...entries]
                  .sort(
                    (a, b) =>
                      a.name.localeCompare(b.name) ||
                      a.harness.localeCompare(b.harness),
                  )
                  .map((server) => (
                    <ServerRow
                      key={server.id}
                      server={server}
                      connection={checks[server.id]}
                      onCheck={check}
                      actions={actions}
                      hidden={!!harness && harness !== server.harness}
                    />
                  ))}
              </ul>
              {!visible.length && (
                <p className="mcp-empty">
                  No MCP connections {harness ? `in ${harness}` : "found"}. Add
                  project folders in Manage MCP settings to include project
                  configurations.
                </p>
              )}
            </>
          )}
        </section>
        {!!issues.length && (
          <p className="mcp-note" role="status">
            {issues.length} configuration{" "}
            {issues.length === 1 ? "file could" : "files could"} not be read.
            Check host settings and file access.
          </p>
        )}
        {inventory?.truncated && (
          <p className="mcp-note">Showing the first 250 configurations.</p>
        )}
        <footer>
          Counts include configured and disabled MCPs. Status is checked on
          request.
        </footer>
      </main>
    </div>
  );
}
