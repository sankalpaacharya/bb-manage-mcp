import { experimental_defineHostEntry } from "@get-bb/plugin-sdk";
import { hostContract } from "./src/contract";
import { scanInventory } from "./src/inventory";
import { AuthJobs, checkServer } from "./src/actions";
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
