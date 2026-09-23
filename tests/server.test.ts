import assert from "node:assert/strict";
import { test } from "node:test";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "../server";
const empty = {
  scannedAt: "2026-09-23T00:00:00Z",
  servers: [],
  sources: [],
  truncated: false,
};
test("RPC and CLI use the selected host and fresh project settings", async () => {
  let calls = 0;
  const { bb, harness } = createFakePluginHost({
    pluginId: "mcp-manager",
    settings: { hostId: "host-test", projectPaths: "/work/one\n/work/two" },
    experimental_callHostRpc: async ({ input, hostId }) => {
      calls++;
      assert.equal(hostId, "host-test");
      assert.deepEqual(input, { projects: ["/work/one", "/work/two"] });
      return empty;
    },
  });
  try {
    plugin(bb);
    assert.deepEqual(await harness.behavior.callRpc("inventory", null), empty);
    await new Promise((resolve) => setImmediate(resolve));
    const before = calls;
    await harness.behavior.callRpc("snapshot", null);
    await harness.behavior.callRpc("snapshot", null);
    assert.equal(
      calls,
      before,
      "reading the page cache does not rescan or check",
    );
    const result = await harness.behavior.runCli(["list", "--json"]);
    assert.equal(result.exitCode, 0);
    assert.deepEqual(JSON.parse(result.stdout ?? ""), empty);
    const bad = await harness.behavior.runCli(["list", "--unknown"]);
    assert.notEqual(bad.exitCode, 0);
  } finally {
    await harness.lifecycle.dispose();
  }
});
