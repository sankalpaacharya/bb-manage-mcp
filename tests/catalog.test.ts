import assert from "node:assert/strict";
import { test } from "node:test";
import { filterGroups, groupServers } from "../src/catalog";
import { sampleInventory } from "../dev/sample-data";

test("same-name declarations group without dropping configuration identities", () => {
  const groups = groupServers(sampleInventory.servers);
  assert.equal(groups.length, 8);
  const github = groups.find((group) => group.name === "github")!;
  assert.equal(github.entries.length, 3);
  assert.equal(new Set(github.entries.map((entry) => entry.id)).size, 3);
  assert.deepEqual(
    new Set(github.entries.map((entry) => entry.transport)),
    new Set(["stdio", "http"]),
  );
});

test("combined filters match the same declaration and preserve inspector context", () => {
  const groups = groupServers(sampleInventory.servers);
  const filtered = filterGroups(groups, {
    query: "github",
    harness: "Cursor",
    filter: "all",
    sort: "name",
  });
  assert.deepEqual(
    filtered.map((group) => group.name),
    ["github"],
  );
  assert.equal(filtered[0].entries.length, 3);
  assert.equal(
    filterGroups(groups, {
      query: ".codex",
      harness: "Cursor",
      filter: "all",
      sort: "name",
    }).length,
    0,
  );
  assert.deepEqual(
    filterGroups(groups, {
      query: "",
      harness: null,
      filter: "disabled",
      sort: "name",
    }).map((group) => group.name),
    ["filesystem"],
  );
  assert.deepEqual(
    filterGroups(groups, {
      query: "",
      harness: null,
      filter: "review",
      sort: "name",
    }).map((group) => group.name),
    ["notion"],
  );
  assert.equal(
    filterGroups(groups, {
      query: "",
      harness: null,
      filter: "all",
      sort: "harnesses",
    })[0].name,
    "github",
  );
});
