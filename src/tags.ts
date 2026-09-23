import { z } from "zod";
import type { Server } from "./model";
export const tagListSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[^,\u0000-\u001f\u007f]+$/),
  )
  .max(8)
  .transform((tags) =>
    [...new Set(tags.map((tag) => tag.toLocaleLowerCase()))].sort(),
  );
export type Tags = Record<string, string[]>;
export function groupByTag(
  servers: Server[],
  tags: Tags,
): Array<{ name: string | null; servers: Server[] }> {
  const groups = new Map<string, Server[]>();
  const untagged: Server[] = [];
  for (const server of servers) {
    const names = tags[server.id] ?? [];
    if (!names.length) untagged.push(server);
    for (const name of names)
      groups.set(name, [...(groups.get(name) ?? []), server]);
  }
  return [
    ...[...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, servers]) => ({ name, servers })),
    ...(untagged.length ? [{ name: null, servers: untagged }] : []),
  ];
}

export function mergeConnections(servers: Server[]): Server[][] {
  const groups = new Map<string, Server[]>();
  for (const server of servers) {
    const key = JSON.stringify([server.harness, server.name]);
    groups.set(key, [...(groups.get(key) ?? []), server]);
  }
  return [...groups.values()];
}
