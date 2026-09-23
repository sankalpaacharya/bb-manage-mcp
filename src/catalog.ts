import type { Harness, Server } from "./model";

export interface ServerGroup {
  name: string;
  entries: Server[];
}
export type LibraryFilter = "all" | "review" | "disabled";
export type LibrarySort = "name" | "harnesses";

/** Names are a browsing key only. Every declaration retains its own identity. */
export function groupServers(servers: Server[]): ServerGroup[] {
  const groups = new Map<string, ServerGroup>();
  for (const entry of servers) {
    const group = groups.get(entry.name) ?? { name: entry.name, entries: [] };
    group.entries.push(entry);
    groups.set(entry.name, group);
  }
  return [...groups.values()];
}

export function groupHarnesses(group: ServerGroup): Harness[] {
  return [...new Set(group.entries.map((entry) => entry.harness))];
}

export function filterGroups(
  groups: ServerGroup[],
  options: {
    query: string;
    harness: Harness | null;
    filter: LibraryFilter;
    sort: LibrarySort;
  },
): ServerGroup[] {
  const needle = options.query.trim().toLocaleLowerCase();
  return groups
    .filter((group) =>
      group.entries.some(
        (entry) =>
          (!options.harness || entry.harness === options.harness) &&
          (options.filter === "all" ||
            entry.state ===
              (options.filter === "review" ? "invalid" : "disabled")) &&
          [entry.name, entry.harness, entry.source, entry.project ?? ""].some(
            (value) => value.toLocaleLowerCase().includes(needle),
          ),
      ),
    )
    .sort(
      (a, b) =>
        (options.sort === "harnesses"
          ? groupHarnesses(b).length - groupHarnesses(a).length
          : 0) || a.name.localeCompare(b.name),
    );
}

export const stateLabel: Record<Server["state"], string> = {
  configured: "Configured",
  disabled: "Disabled",
  invalid: "Incomplete",
};
export const transportLabel: Record<Server["transport"], string> = {
  stdio: "Local process",
  http: "HTTP",
  sse: "SSE",
  ws: "WebSocket",
  unknown: "Unspecified",
};

export function groupTransport(group: ServerGroup): string {
  const local = group.entries.some((entry) => entry.transport === "stdio");
  const remote = group.entries.some((entry) =>
    ["http", "sse", "ws"].includes(entry.transport),
  );
  return local && remote
    ? "Local & remote"
    : local
      ? "Local process"
      : remote
        ? "Remote server"
        : "Transport unspecified";
}
