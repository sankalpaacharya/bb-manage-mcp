import { useState, type ReactNode } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { HARNESSES, type Inventory, type Server } from "./model";

function Glyph({
  kind,
}: {
  kind: "grid" | "list" | "refresh" | "plug" | "file";
}) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <rect x="15" y="15" width="6" height="6" rx="1" />
      </>
    ),
    list: (
      <>
        <path d="M8 5h13M8 12h13M8 19h13" />
        <path d="M3 5h.01M3 12h.01M3 19h.01" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5" />
      </>
    ),
    plug: (
      <>
        <path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8M8 17h5" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind]}
    </svg>
  );
}

function Metric({
  title,
  value,
  description,
  total,
  tone,
}: {
  title: string;
  value: number | null;
  description: string;
  total: number;
  tone: string;
}) {
  return (
    <section className="flex min-h-32 flex-col rounded-2xl border border-border px-6 py-5">
      <h2 className="text-sm text-muted-foreground">{title}</h2>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
        {value ?? "—"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div
        className="mt-4 h-1 overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full ${tone}`}
          style={{
            width: `${total && value ? Math.min(100, (value / total) * 100) : 0}%`,
          }}
        />
      </div>
    </section>
  );
}

function ServerCard({ server, list }: { server: Server; list: boolean }) {
  const label =
    server.state === "disabled"
      ? "Disabled"
      : server.state === "invalid"
        ? "Incomplete"
        : "Configured";
  const dot =
    server.state === "configured"
      ? "bg-emerald-500"
      : server.state === "disabled"
        ? "bg-muted-foreground"
        : "bg-orange-400";
  return (
    <li
      className={`min-w-0 rounded-xl border bg-card transition-colors hover:bg-muted/30 ${server.state === "invalid" ? "border-orange-400/60" : "border-border hover:border-muted-foreground/60"}`}
    >
      <details className="group">
        <summary
          className={`cursor-pointer list-none rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden ${list ? "sm:flex sm:items-center sm:gap-5" : ""}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Glyph kind="plug" />
            </span>
            <div className="min-w-0">
              <h3
                className="truncate text-sm font-semibold"
                title={server.name}
              >
                {server.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {server.harness}
              </p>
            </div>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {server.transport.toUpperCase()}
            </span>
          </div>
          <div
            className={`flex items-center justify-between gap-3 ${list ? "mt-3 sm:mt-0 sm:min-w-52" : "mt-4"}`}
          >
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {server.scope}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${dot}`}
              />
              {label}
            </span>
          </div>
        </summary>
        <div className="space-y-2 border-t border-border px-4 py-3 text-xs">
          <p className="font-medium">Configuration source</p>
          <p className="break-all font-mono text-muted-foreground">
            {server.source}
          </p>
          {server.project && (
            <p className="break-all text-muted-foreground">
              Project: {server.project}
            </p>
          )}
          <p className="text-muted-foreground">Live connection not checked.</p>
        </div>
      </details>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground"
    >
      {children}
    </div>
  );
}

export function InventoryView({
  inventory,
  pending,
  error,
  onRefresh,
}: {
  inventory: Inventory | null;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"servers" | "sources">("servers");
  const [query, setQuery] = useState("");
  const [harness, setHarness] = useState("All harnesses");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const entries = inventory?.servers ?? [];
  const sources = inventory?.sources ?? [];
  const configured = entries.filter((s) => s.state === "configured").length;
  const disabled = entries.filter((s) => s.state === "disabled").length;
  const invalid = entries.filter((s) => s.state === "invalid").length;
  const errors = sources.filter((s) => s.status === "error").length;
  const loaded = sources.filter((s) => s.status === "loaded").length;
  const activeHarnesses = new Set(entries.map((s) => s.harness)).size;
  const needle = query.trim().toLowerCase();
  const matches = (name: string, values: string[]) =>
    (harness === "All harnesses" || harness === name) &&
    values.some((v) => v.toLowerCase().includes(needle));
  const servers = entries.filter((s) =>
    matches(s.harness, [s.name, s.harness, s.source, s.project ?? ""]),
  );
  const filteredSources = sources.filter((s) =>
    matches(s.harness, [s.harness, s.path]),
  );
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              MCP inventory
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              One place to inspect the tools available to your coding harnesses.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="tabular-nums">
              {inventory
                ? `${entries.length} entries across ${activeHarnesses} harnesses`
                : "Waiting for your first scan"}
            </p>
            <p className="mt-1 text-xs">{loaded} configuration files read</p>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            title="Configured"
            value={inventory ? configured : null}
            description="Server definitions found"
            total={entries.length}
            tone="bg-emerald-500"
          />
          <Metric
            title="Disabled"
            value={inventory ? disabled : null}
            description="Turned off in configuration"
            total={entries.length}
            tone="bg-muted-foreground"
          />
          <Metric
            title="Needs attention"
            value={inventory ? invalid + errors : null}
            description={`${invalid} incomplete entries · ${errors} unreadable files`}
            total={entries.length + errors}
            tone="bg-orange-400"
          />
        </div>
        <section className="space-y-3" aria-label="Inventory controls">
          <div
            className="flex gap-5 border-b border-border"
            aria-label="Inventory section"
          >
            {(["servers", "sources"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={`border-b-2 px-1 pb-3 text-sm focus-visible:outline-2 focus-visible:outline-ring ${tab === value ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {value === "servers" ? "Servers" : "Configuration sources"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-48 flex-1 sm:max-w-80">
              <Input
                aria-label="Filter MCPs"
                placeholder="Filter MCPs…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={onRefresh} disabled={pending}>
              <Glyph kind="refresh" />
              {pending ? "Scanning…" : "Refresh inventory"}
            </Button>
            <div
              className="ml-auto flex gap-1 rounded-lg border border-border p-1"
              role="group"
              aria-label="Server layout"
            >
              {(["grid", "list"] as const).map((value) => (
                <button
                  key={value}
                  title={`${value === "grid" ? "Grid" : "List"} view`}
                  aria-label={`${value === "grid" ? "Grid" : "List"} view`}
                  aria-pressed={layout === value}
                  disabled={tab === "sources"}
                  onClick={() => setLayout(value)}
                  className={`rounded-md p-1.5 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 ${layout === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Glyph kind={value} />
                </button>
              ))}
            </div>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by harness"
          >
            {["All harnesses", ...HARNESSES].map((name) => (
              <button
                key={name}
                aria-pressed={harness === name}
                onClick={() => setHarness(name)}
                className={`rounded-full border px-3 py-1 text-xs focus-visible:outline-2 focus-visible:outline-ring ${harness === name ? "border-muted-foreground bg-muted text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground"}`}
              >
                {name}
                <span className="ml-2 tabular-nums opacity-70">
                  {name === "All harnesses"
                    ? entries.length
                    : entries.filter((s) => s.harness === name).length}
                </span>
              </button>
            ))}
          </div>
        </section>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <section
          aria-label={
            tab === "servers" ? "MCP servers" : "Configuration sources"
          }
          aria-busy={pending}
        >
          {!inventory ? (
            <Empty>
              {pending
                ? "Reading configuration files…"
                : "Scan unavailable. Check your host settings and refresh."}
            </Empty>
          ) : tab === "servers" ? (
            servers.length === 0 ? (
              <Empty>
                {entries.length
                  ? "No matching servers. Try another filter."
                  : "No configured servers found. Add project folders in Manage MCP settings to include repository configurations."}
              </Empty>
            ) : (
              <ul
                className={
                  layout === "grid"
                    ? "grid gap-2.5 md:grid-cols-2 xl:grid-cols-3"
                    : "space-y-2.5"
                }
              >
                {servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    list={layout === "list"}
                  />
                ))}
              </ul>
            )
          ) : filteredSources.length === 0 ? (
            <Empty>No matching configuration sources.</Empty>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border px-4">
              {filteredSources.map((source) => (
                <li
                  key={`${source.harness}:${source.path}`}
                  className="flex items-start gap-3 py-4"
                >
                  <span className="pt-0.5 text-muted-foreground">
                    <Glyph kind="file" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {source.harness}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {source.scope}
                      </span>
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {source.path}
                    </p>
                    {source.issue && (
                      <p className="mt-2 text-xs text-destructive">
                        {source.issue}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {source.status === "loaded"
                      ? "Read"
                      : source.status === "missing"
                        ? "Not found"
                        : "Error"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {errors > 0 && tab === "servers" && (
          <button
            onClick={() => setTab("sources")}
            className="text-sm text-destructive underline underline-offset-4"
          >
            Review {errors} unreadable configuration{" "}
            {errors === 1 ? "file" : "files"}
          </button>
        )}
        {inventory?.truncated && (
          <p role="status" className="text-sm">
            Showing the first 250 entries. Narrow project folders in settings to
            inspect the rest.
          </p>
        )}
        <footer className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            Configuration inventory · Live connections not checked · Select a
            server for its source
          </p>
          {inventory && (
            <p>
              {error ? "Previous scan" : "Scanned"}{" "}
              {new Date(inventory.scannedAt).toLocaleTimeString()}
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
