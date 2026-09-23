import { cliCommand, defineCli, type BbPluginApi } from "@get-bb/plugin-sdk";
import { hostContract, rpcContract } from "./src/contract";

import { tagListSchema } from "./src/tags";
import { StatusCache } from "./src/status-cache";

export default function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    hostId: {
      type: "string",
      label: "Host ID (blank uses the primary host)",
      default: "",
    },
    projectPaths: {
      type: "string",
      label:
        "Project folders on that host (one absolute path per line, up to 20)",
      experimental_multiline: true,
      default: "",
    },
  });
  const host = bb.hosts.experimental_client({ contract: hostContract });
  async function target() {
    const config = await settings.get();
    const hostId =
      config.hostId.trim() || (await bb.sdk.system.config()).primaryHostId;
    if (!hostId)
      throw new Error(
        "No primary host is available. Set Host ID in Manage MCP settings to an enrolled host.",
      );
    const projects = config.projectPaths
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    return { hostId, projects };
  }
  async function inventory(signal?: AbortSignal) {
    const { hostId, projects } = await target();
    return host.call("scan", { projects }, { hostId, signal });
  }
  const cache = new StatusCache();
  bb.onDispose(() => {
    cache.dispose();
  });
  let cacheKey = "";
  function refreshCache() {
    let selected: Awaited<ReturnType<typeof target>>;
    cache.refresh(
      async (signal) => {
        selected = await target();
        if (signal.aborted) throw new Error("Cancelled");
        cacheKey = JSON.stringify(selected);
        // The host entry can still be registering during BB/plugin startup.
        for (let attempt = 0; ; attempt++) {
          try {
            return await host.call(
              "scan",
              { projects: selected.projects },
              { hostId: selected.hostId, signal },
            );
          } catch (error) {
            if (attempt >= 2 || signal.aborted) throw error;
            await new Promise<void>((resolve, reject) => {
              const abort = () => {
                clearTimeout(timer);
                reject(new Error("Cancelled"));
              };
              const timer = setTimeout(() => {
                signal.removeEventListener("abort", abort);
                resolve();
              }, 2000);
              signal.addEventListener("abort", abort, { once: true });
            });
          }
        }
      },
      (serverIds, signal) =>
        host.call(
          "checkMany",
          { serverIds, projects: selected.projects },
          { hostId: selected.hostId, signal },
        ),
    );
  }
  // Start outside the page lifecycle; reads of the cache never launch checks.
  refreshCache();
  const tagKey = (hostId: string, serverId: string) =>
    `tags:${JSON.stringify([hostId, serverId])}`;
  bb.rpc.register(rpcContract, {
    add: async (server) => {
      const selected = await target();
      if (JSON.stringify(selected) !== cacheKey)
        throw new Error(
          "Host settings changed. Refresh before adding a connection.",
        );
      const { hostId, projects } = selected;
      const inventory = await host.call(
        "add",
        { projects, server },
        { hostId },
      );
      if (JSON.stringify(selected) === cacheKey)
        cache.replaceInventory(inventory);
      return inventory;
    },
    tags: async () => {
      const { hostId } = await target();
      const entries = cache.snapshot().inventory?.servers ?? [];
      return Object.fromEntries(
        await Promise.all(
          entries.map(async (server) => {
            const parsed = tagListSchema.safeParse(
              await bb.storage.kv.get(tagKey(hostId, server.id)),
            );
            return [server.id, parsed.success ? parsed.data : []];
          }),
        ),
      );
    },
    setTags: async ({ serverId, tags }) => {
      const selected = await target();
      if (
        cacheKey !== JSON.stringify(selected) ||
        !cache
          .snapshot()
          .inventory?.servers.some((server) => server.id === serverId)
      )
        throw new Error("Refresh the inventory before tagging.");
      const key = tagKey(selected.hostId, serverId);
      if (tags.length) await bb.storage.kv.set(key, tags);
      else await bb.storage.kv.delete(key);
      return tags;
    },
    remove: async ({ serverId }) => {
      const { hostId, projects } = await target();
      await host.call("remove", { serverId, projects }, { hostId });
      cache.remove(serverId);
      await bb.storage.kv.delete(tagKey(hostId, serverId));
      return null;
    },
    snapshot: () => cache.snapshot(),
    refresh: async () => {
      await refreshCache();
      return cache.snapshot();
    },
    inventory: () => inventory(),
    check: async ({ serverId }) => {
      const { hostId, projects } = await target();
      const result = await host.call(
        "check",
        { serverId, projects },
        { hostId },
      );
      if (cacheKey === JSON.stringify({ hostId, projects }))
        cache.update(serverId, result);
      return result;
    },
    authenticate: async ({ serverId }) => {
      const { hostId, projects } = await target();
      return host.call("authenticate", { serverId, projects }, { hostId });
    },
    poll: async (input) => {
      const { hostId } = await target();
      return host.call("poll", input, { hostId });
    },
    cancel: async (input) => {
      const { hostId } = await target();
      return host.call("cancel", input, { hostId });
    },
  });
  bb.cli.register(
    defineCli({
      name: "manage-mcp",
      summary: "Inspect MCP configurations across harnesses",
      commands: {
        list: cliCommand({
          summary: "List configured MCP servers on the selected host",
          options: { json: { type: "boolean", description: "Return JSON" } },
          async run(input, context) {
            const result = await inventory(context.signal);
            const lines = result.servers.map(
              (s) =>
                `${s.harness} | ${s.name} | ${s.state} | ${s.transport} | ${s.source}${s.project ? ` [${s.project}]` : ""}`,
            );
            const errors = result.sources.filter((s) => s.status === "error");
            lines.push(...errors.map((s) => `Warning: ${s.path}: ${s.issue}`));
            if (result.truncated) lines.push("Results limited to 250 servers.");
            return {
              exitCode: 0,
              stdout: input.options.json
                ? JSON.stringify(result)
                : [
                    ...(lines.length
                      ? lines
                      : ["No configured MCP servers found."]),
                    "Configuration inventory only; live connection status is not checked.",
                  ].join("\n"),
            };
          },
        }),
      },
    }),
  );
}
