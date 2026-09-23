import assert from "node:assert/strict";
import { test } from "node:test";
import { StatusCache } from "../src/status-cache";
import type { Inventory } from "../src/model";
import type { ActionResult } from "../src/actions";

test("checks all servers in a harness context with one call and caches page reads", async () => {
  const cache = new StatusCache();
  const inventory: Inventory = {
    scannedAt: "test",
    sources: [],
    truncated: false,
    servers: Array.from({ length: 21 }, (_, i) => ({
      id: String(i),
      name: String(i),
      harness: i < 10 ? "Claude Code" : "Codex",
      source: "/tmp/config",
      scope: "user",
      project: null,
      transport: "http",
      state: i === 20 ? "disabled" : "configured",
    })),
  };
  const connected: ActionResult = {
    state: "connected",
    message: "Connected",
    taskId: null,
    url: null,
    command: null,
  };
  const calls: string[][] = [];
  let scans = 0;
  const scan = async () => {
    scans++;
    return inventory;
  };
  const check = async (ids: string[]) => {
    calls.push(ids);
    return Object.fromEntries(ids.map((id) => [id, connected]));
  };
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  try {
    cache.refresh(scan, check);
    await tick();
    assert.equal(calls.length, 2);
    assert.deepEqual(
      calls.map((ids) => ids.length),
      [10, 10],
    );
    assert.equal(cache.snapshot().pending, false);
    assert.equal(Object.keys(cache.snapshot().checks).length, 20);
    cache.snapshot();
    cache.snapshot();
    assert.equal(calls.length, 2);
    cache.refresh(scan, check);
    await tick();
    assert.equal(scans, 2);
    assert.equal(calls.length, 4);
  } finally {
    cache.dispose();
  }
});

test("starts every context together and publishes results before slow contexts finish", async () => {
  const cache = new StatusCache();
  const inventory: Inventory = {
    scannedAt: "test",
    sources: [],
    truncated: false,
    servers: Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      name: "docs",
      harness: "Claude Code",
      source: "/tmp/config",
      scope: "project",
      project: `/project/${i}`,
      transport: "http",
      state: "configured",
    })),
  };
  const jobs: Array<{
    ids: string[];
    resolve: (value: Record<string, ActionResult>) => void;
    reject: () => void;
  }> = [];
  const check = (ids: string[]) =>
    new Promise<Record<string, ActionResult>>((resolve, reject) =>
      jobs.push({ ids, resolve, reject: () => reject(new Error("offline")) }),
    );
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const connected: ActionResult = {
    state: "connected",
    message: "Connected",
    taskId: null,
    url: null,
    command: null,
  };
  try {
    cache.refresh(async () => inventory, check);
    await tick();
    assert.equal(
      jobs.length,
      4,
      "all contexts start without waiting for previous checks",
    );
    cache.refresh(async () => inventory, check);
    assert.equal(jobs.length, 4, "refresh does not duplicate active checks");
    jobs[3].resolve({ "3": connected });
    jobs[1].reject();
    await tick();
    assert.equal(cache.snapshot().checks["3"].result?.state, "connected");
    assert.equal(cache.snapshot().checks["1"].pending, false);
    assert.equal(cache.snapshot().checks["0"].pending, true);
    assert.equal(cache.snapshot().pending, true);
    jobs[0].resolve({ "0": connected });
    jobs[2].resolve({ "2": connected });
    await tick();
    assert.equal(cache.snapshot().pending, false);
  } finally {
    cache.dispose();
    for (const job of jobs) job.resolve({});
  }
});
