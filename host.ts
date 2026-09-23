import { experimental_defineHostEntry } from "@get-bb/plugin-sdk";
import { hostContract } from "./src/contract";
import { scanInventory } from "./src/inventory";
import { AuthJobs, checkServer, checkServers } from "./src/actions";
import { addServer } from "./src/add-server";
import { removeServer } from "./src/remove-server";
const jobs = new AuthJobs();
async function target(
  input: { projects: string[]; serverId: string },
  signal?: AbortSignal,
) {
  const inventory = await scanInventory({ projects: input.projects, signal });
  const server = inventory.servers.find((entry) => entry.id === input.serverId);
  if (
    !server ||
    server.state !== "configured" ||
    /[\x00-\x1f\x7f]/.test(server.name) ||
    server.name.startsWith("-") ||
    server.name.length >= 160
  )
    throw new Error("Server is unavailable. Refresh the inventory.");
  return server;
}
export default experimental_defineHostEntry({
  contract: hostContract,
  dispose: () => jobs.dispose(),
  handlers: {
    add: async ({ projects, server }, context) => {
      const inventory = await scanInventory({
        projects,
        signal: context.signal,
      });
      if (
        !inventory.sources.some(
          (source) =>
            source.harness === server.harness && source.path === server.source,
        )
      )
        throw new Error(
          "Choose a configuration listed in Manage MCP settings.",
        );
      try {
        await addServer(server);
      } catch {
        throw new Error(
          "Could not add the server. Check for a duplicate name, invalid configuration, or file permissions.",
        );
      }
      return scanInventory({ projects, signal: context.signal });
    },
    remove: async ({ projects, serverId }, context) => {
      const inventory = await scanInventory({
        projects,
        signal: context.signal,
      });
      const server = inventory.servers.find((entry) => entry.id === serverId);
      if (!server) throw new Error("Entry no longer exists");
      await removeServer(server);
      return null;
    },
    checkMany: async ({ projects, serverIds }, context) => {
      const inventory = await scanInventory({
        projects,
        signal: context.signal,
      });
      const ids = new Set(serverIds);
      const entries = inventory.servers.filter(
        (server) => ids.has(server.id) && server.state === "configured",
      );
      if (entries.length !== ids.size)
        throw new Error("Inventory changed. Refresh connections.");
      return checkServers(entries, context.signal);
    },
    check: async (input, context) =>
      checkServer(await target(input, context.signal), context.signal),
    authenticate: async (input, context) =>
      jobs.start(await target(input, context.signal)),
    poll: ({ taskId }) => jobs.poll(taskId),
    cancel: ({ taskId }) => jobs.stop(taskId),
    scan: ({ projects }, context) =>
      scanInventory({ projects, signal: context.signal }),
  },
});
