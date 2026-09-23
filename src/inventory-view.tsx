import { useEffect, useId, useRef, useState } from "react";
import { HARNESSES, type Harness, type Inventory, type Source } from "./model";
import {
  filterGroups,
  groupHarnesses,
  groupServers,
  groupTransport,
  stateLabel,
  transportLabel,
  type LibraryFilter,
  type LibrarySort,
  type ServerGroup,
} from "./catalog";
import { LibraryIcon as Icon } from "./library-icons";

const harnessMark: Record<Harness, string> = {
  "Claude Code": "Cl",
  Codex: "Cx",
  "Gemini CLI": "Ge",
  OpenCode: "Oc",
  Cursor: "Cu",
};
function HarnessBadge({ name }: { name: Harness }) {
  return (
    <span className="mcp-harness-badge">
      <span aria-hidden="true">{harnessMark[name]}</span>
      {name}
    </span>
  );
}
function ServerMark({ name }: { name: string }) {
  const hash = [...name].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );
  const initials = name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2) || "M";
  return (
    <span className={`mcp-server-mark mcp-tone-${hash % 5}`} aria-hidden="true">
      {initials}
    </span>
  );
}
function LibraryCard({
  group,
  selected,
  detailsId,
  onSelect,
}: {
  group: ServerGroup;
  selected: boolean;
  detailsId: string;
  onSelect: (target: HTMLButtonElement) => void;
}) {
  const harnesses = groupHarnesses(group);
  const incomplete = group.entries.some((entry) => entry.state === "invalid");
  const disabled = group.entries.every((entry) => entry.state === "disabled");
  return (
    <li className="mcp-catalog-item">
      <button
        className="mcp-server-card"
        aria-label={`Inspect ${group.name}`}
        aria-expanded={selected}
        aria-controls={selected ? detailsId : undefined}
        data-selected={selected}
        onClick={(event) => onSelect(event.currentTarget)}
      >
        <div className="mcp-card-heading">
          <ServerMark name={group.name} />
          <div>
            <h3 title={group.name}>{group.name}</h3>
            <span className="mcp-card-transport">{groupTransport(group)}</span>
          </div>
          <Icon name="chevron" />
        </div>
        <div className="mcp-card-coverage">
          {harnesses.map((name) => (
            <HarnessBadge key={name} name={name} />
          ))}
        </div>
        <div className="mcp-card-footer">
          <span>
            {group.entries.length}{" "}
            {group.entries.length === 1 ? "configuration" : "configurations"}
          </span>
          {incomplete ? (
            <span className="mcp-attention">
              <Icon name="warning" />
              Needs review
            </span>
          ) : disabled ? (
            <span>
              <Icon name="pause" />
              Disabled
            </span>
          ) : (
            <span className="mcp-inspect-hint">View details</span>
          )}
        </div>
      </button>
    </li>
  );
}

function Inspector({
  group,
  id,
  onClose,
}: {
  group: ServerGroup;
  id: string;
  onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [group.name]);
  return (
    <section id={id} aria-label="Server details" className="mcp-inspector">
      <div className="mcp-inspector-top">
        <span>Server details</span>
        <button
          className="mcp-icon-button"
          aria-label="Close server details"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="mcp-inspector-identity">
        <ServerMark name={group.name} />
        <h2 ref={heading} tabIndex={-1}>
          {group.name}
        </h2>
        <p>{groupTransport(group)}</p>
      </div>
      <h3>
        Configured in {groupHarnesses(group).length}{" "}
        {groupHarnesses(group).length === 1 ? "harness" : "harnesses"}
      </h3>
      {group.entries.length > 1 && (
        <p className="mcp-inspector-note">
          Grouped by name. Each configuration below is separate.
        </p>
      )}
      <ol className="mcp-instances">
        {group.entries.map((entry) => (
          <li key={entry.id}>
            <div className="mcp-instance-heading">
              <HarnessBadge name={entry.harness} />
              <span className={`mcp-state mcp-state-${entry.state}`}>
                {stateLabel[entry.state]}
              </span>
            </div>
            <dl>
              <div>
                <dt>Scope</dt>
                <dd>{entry.scope === "user" ? "User" : "Project"}</dd>
              </div>
              <div>
                <dt>Transport</dt>
                <dd>{transportLabel[entry.transport]}</dd>
              </div>
            </dl>
            <div className="mcp-source-path">
              <span>Configuration file</span>
              <code>{entry.source}</code>
            </div>
            {entry.project && (
              <div className="mcp-source-path">
                <span>Project folder</span>
                <code>{entry.project}</code>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="mcp-privacy-note">
        Credentials stay on your host. Live connections and authentication are
        not checked.
      </p>
    </section>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ul className="mcp-source-list">
      {sources.map((source) => (
        <li key={`${source.harness}:${source.path}`}>
          <div className="mcp-source-symbol">
            <Icon name="file" />
          </div>
          <div className="mcp-source-content">
            <div>
              <strong>{source.harness}</strong>
              <span
                className={`mcp-state mcp-state-${source.status === "error" ? "invalid" : "neutral"}`}
              >
                {source.status === "loaded"
                  ? "Read"
                  : source.status === "missing"
                    ? "Not found"
                    : "Unreadable"}
              </span>
            </div>
            <code>{source.path}</code>
            {source.issue && <p className="mcp-attention">{source.issue}</p>}
          </div>
        </li>
      ))}
    </ul>
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
  const [harness, setHarness] = useState<Harness | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("name");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const detailsId = useId();
  const groups = groupServers(inventory?.servers ?? []);
  const sources = inventory?.sources ?? [];
  const issues = sources.filter((source) => source.status === "error");
  const visible = filterGroups(groups, { query, harness, filter, sort });
  const selected = visible.find((group) => group.name === selectedName);
  const needle = query.trim().toLocaleLowerCase();
  const visibleSources = sources.filter(
    (source) =>
      (!harness || source.harness === harness) &&
      [source.harness, source.path].some((value) =>
        value.toLocaleLowerCase().includes(needle),
      ),
  );
  const reviewCount = groups.filter((group) =>
    group.entries.some((entry) => entry.state === "invalid"),
  ).length;
  const disabledCount = groups.filter((group) =>
    group.entries.some((entry) => entry.state === "disabled"),
  ).length;
  function chooseFilter(value: LibraryFilter) {
    setTab("servers");
    setFilter(value);
    setSelectedName(null);
  }
  function resetFilters() {
    setQuery("");
    setHarness(null);
    setFilter("all");
    setSelectedName(null);
  }
  function showSources() {
    setTab("sources");
    setSelectedName(null);
    setQuery("");
  }
  return (
    <div className="mcp-library">
      <main className="mcp-library-frame">
        <header className="mcp-library-header">
          <div className="mcp-library-title">
            <span className="mcp-brand-mark">
              <Icon name="network" />
            </span>
            <div>
              <h1>MCP library</h1>
              <p>Your servers, across your coding tools.</p>
            </div>
          </div>
          <button className="mcp-button" onClick={onRefresh} disabled={pending}>
            <Icon name="refresh" />
            {pending ? "Scanning…" : "Refresh inventory"}
          </button>
        </header>
        <div className="mcp-workspace">
          <aside className="mcp-filter-rail" aria-label="Library filters">
            <nav aria-label="Library views">
              <h2>Library</h2>
              <button
                data-active={tab === "servers" && filter === "all"}
                aria-pressed={tab === "servers" && filter === "all"}
                onClick={() => chooseFilter("all")}
              >
                <Icon name="library" />
                <span>All servers</span>
                <small>{groups.length}</small>
              </button>
              <button
                data-active={tab === "servers" && filter === "review"}
                aria-pressed={tab === "servers" && filter === "review"}
                onClick={() => chooseFilter("review")}
              >
                <Icon name="warning" />
                <span>Needs review</span>
                <small>{reviewCount}</small>
              </button>
              <button
                data-active={tab === "servers" && filter === "disabled"}
                aria-pressed={tab === "servers" && filter === "disabled"}
                onClick={() => chooseFilter("disabled")}
              >
                <Icon name="pause" />
                <span>Disabled</span>
                <small>{disabledCount}</small>
              </button>
              <button
                data-active={tab === "sources"}
                aria-pressed={tab === "sources"}
                onClick={showSources}
              >
                <Icon name="file" />
                <span>Configuration files</span>
                <small>{sources.length}</small>
              </button>
            </nav>
            <nav aria-label="Filter by harness" className="mcp-harness-nav">
              <h2>Harnesses</h2>
              <button
                data-active={!harness}
                aria-pressed={!harness}
                onClick={() => {
                  setHarness(null);
                  setSelectedName(null);
                }}
              >
                <span>All harnesses</span>
                <small>{groups.length}</small>
              </button>
              {HARNESSES.map((name) => (
                <button
                  key={name}
                  data-active={harness === name}
                  aria-pressed={harness === name}
                  onClick={() => {
                    setHarness(name);
                    setSelectedName(null);
                  }}
                >
                  <span className="mcp-harness-mark" aria-hidden="true">
                    {harnessMark[name]}
                  </span>
                  <span>{name}</span>
                  <small>
                    {
                      groups.filter((group) =>
                        groupHarnesses(group).includes(name),
                      ).length
                    }
                  </small>
                </button>
              ))}
            </nav>
            <div className="mcp-rail-note">
              <Icon name="file" />
              <p>Read from your configuration files. Nothing is changed.</p>
            </div>
          </aside>
          <div className="mcp-library-content">
            <div className="mcp-search">
              <Icon name="search" />
              <input
                type="search"
                aria-label="Filter MCPs"
                placeholder="Search servers, harnesses, or paths…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedName(null);
                }}
              />
              {query && (
                <button
                  className="mcp-icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
            {error && (
              <div role="alert" className="mcp-notice mcp-notice-error">
                <Icon name="warning" />
                <p>
                  {error}
                  {inventory && " Showing your previous scan."}
                </p>
              </div>
            )}
            {issues.length > 0 && tab === "servers" && (
              <div className="mcp-notice">
                <Icon name="warning" />
                <p>
                  {issues.length} configuration{" "}
                  {issues.length === 1 ? "file needs" : "files need"} attention.
                </p>
                <button
                  onClick={() => {
                    setHarness(null);
                    showSources();
                  }}
                >
                  Review files
                </button>
              </div>
            )}
            <div className="mcp-catalog-toolbar">
              <div>
                <h2>
                  {tab === "sources"
                    ? "Configuration files"
                    : filter === "review"
                      ? "Needs review"
                      : filter === "disabled"
                        ? "Disabled servers"
                        : harness
                          ? `${harness} servers`
                          : "Your servers"}
                </h2>
                <span role="status">
                  {inventory
                    ? `${tab === "sources" ? visibleSources.length : visible.length} ${tab === "sources" ? "files" : "server names"}`
                    : "Reading configurations"}
                </span>
              </div>
              {tab === "servers" && (
                <div className="mcp-catalog-tools">
                  <select
                    aria-label="Sort servers"
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as LibrarySort)
                    }
                  >
                    <option value="name">Name A–Z</option>
                    <option value="harnesses">Most harnesses</option>
                  </select>
                  <div
                    className="mcp-view-switch"
                    role="group"
                    aria-label="Server layout"
                  >
                    {(["grid", "list"] as const).map((value) => (
                      <button
                        key={value}
                        className="mcp-icon-button"
                        aria-label={`${value === "grid" ? "Grid" : "List"} view`}
                        aria-pressed={layout === value}
                        onClick={() => setLayout(value)}
                      >
                        <Icon name={value} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div
              className="mcp-results-layout"
              data-inspecting={Boolean(selected) && tab === "servers"}
            >
              {selected && tab === "servers" && (
                <Inspector
                  group={selected}
                  id={detailsId}
                  onClose={() => {
                    setSelectedName(null);
                    trigger.current?.focus();
                  }}
                />
              )}
              <section
                className="mcp-results"
                aria-label={
                  tab === "servers" ? "MCP servers" : "Configuration sources"
                }
                aria-busy={pending}
              >
                {!inventory ? (
                  <div className="mcp-empty">
                    <Icon name={pending ? "refresh" : "warning"} />
                    <h3>
                      {pending
                        ? "Gathering your servers"
                        : "Your library is unavailable"}
                    </h3>
                    <p>
                      {pending
                        ? "Reading the configurations on your host."
                        : "Check the host in Manage MCP settings, then refresh."}
                    </p>
                  </div>
                ) : (tab === "sources"
                    ? visibleSources.length
                    : visible.length) === 0 ? (
                  <div className="mcp-empty">
                    <Icon name="search" />
                    <h3>
                      {groups.length || tab === "sources"
                        ? "No matches here"
                        : "Your library starts here"}
                    </h3>
                    <p>
                      {groups.length || tab === "sources"
                        ? "Try a different name or broaden your filters."
                        : "Add project folders in Manage MCP settings, or configure a server in one of your harnesses."}
                    </p>
                    {(query || harness || filter !== "all") && (
                      <button className="mcp-button" onClick={resetFilters}>
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : tab === "sources" ? (
                  <SourceList sources={visibleSources} />
                ) : (
                  <ul className={`mcp-catalog mcp-catalog-${layout}`}>
                    {visible.map((group) => (
                      <LibraryCard
                        key={group.name}
                        group={group}
                        detailsId={detailsId}
                        selected={selected?.name === group.name}
                        onSelect={(target) => {
                          trigger.current = target;
                          setSelectedName(group.name);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>
            {inventory?.truncated && (
              <p role="status" className="mcp-notice">
                Showing the first 250 configurations. Narrow project folders in
                settings to inspect the rest.
              </p>
            )}
            <footer className="mcp-library-footer">
              <span>
                {inventory
                  ? `${inventory.servers.length} configurations`
                  : "Read-only inventory"}
                <span aria-hidden="true"> / </span>Live connections not checked
              </span>
              {inventory && (
                <time dateTime={inventory.scannedAt}>
                  {error ? "Previous scan" : "Last scanned"}{" "}
                  {new Date(inventory.scannedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              )}
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
