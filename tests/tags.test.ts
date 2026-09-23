import assert from "node:assert/strict";
import { test } from "node:test";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "../server";
import { tagListSchema, groupByTag, mergeConnections } from "../src/tags";
import type { Server } from "../src/model";
const server: Server = {
  id: "1",
  name: "docs",
  harness: "Codex",
  source: "/config",
  project: null,
  scope: "user",
  transport: "http",
  state: "disabled",
};
test("tags normalize and group without merging different harnesses", () => {
  assert.deepEqual(tagListSchema.parse([" Work ", "work", "dev"]), [
    "dev",
    "work",
  ]);
  assert.equal(tagListSchema.safeParse(["x".repeat(33)]).success, false);
  const other = { ...server, id: "2", project: "/other" };
  assert.equal(mergeConnections([server, other]).length, 1);
  assert.equal(
    mergeConnections([server, { ...other, harness: "Claude Code" }]).length,
    2,
  );
  assert.deepEqual(
    groupByTag([server, other], { "1": ["work", "dev"] }).map((group) => [
      group.name,
      group.servers.length,
    ]),
    [
      ["dev", 1],
      ["work", 1],
      [null, 1],
    ],
  );
});
test("tags persist in plugin storage and reject unknown connections", async () => {
  const { bb, harness } = createFakePluginHost({
    pluginId: "mcp-manager",
    settings: { hostId: "host-test", projectPaths: "" },
    experimental_callHostRpc: async () => ({
      scannedAt: "now",
      servers: [server, { ...server, id: "2" }],
      sources: [],
      truncated: false,
    }),
  });
  try {
    plugin(bb);
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.all([
      harness.behavior.callRpc("setTags", { serverId: "1", tags: [" Work "] }),
      harness.behavior.callRpc("setTags", { serverId: "2", tags: ["dev"] }),
    ]);
    assert.deepEqual(await harness.behavior.callRpc("tags", null), {
      "1": ["work"],
      "2": ["dev"],
    });
    const keys = await bb.storage.kv.list("tags:");
    assert.equal(keys.length, 2);
    assert.deepEqual(
      await bb.storage.kv.get(keys.find((key) => key.includes('"1"'))!),
      ["work"],
    );
    await assert.rejects(
      harness.behavior.callRpc("setTags", {
        serverId: "missing",
        tags: ["work"],
      }),
    );
    await harness.behavior.callRpc("setTags", { serverId: "1", tags: [] });
    assert.deepEqual(await harness.behavior.callRpc("tags", null), {
      "1": [],
      "2": ["dev"],
    });
  } finally {
    await harness.lifecycle.dispose();
  }
});
