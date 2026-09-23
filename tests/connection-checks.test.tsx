import assert from "node:assert/strict";
import { test } from "node:test";
import { StatusCache } from "../src/status-cache";
import type { Inventory } from "../src/model";
import type { ActionResult } from "../src/actions";

test("background cache returns immediately, bounds checks, and survives page reads", async () => {
  const cache = new StatusCache();
  const inventory: Inventory = {
    scannedAt: "test",
    sources: [],
    truncated: false,
    servers: Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      name: String(i),
      harness: "Codex",
      source: "/tmp/config",
      scope: "user",
      project: null,
      transport: "http",
      state: i === 4 ? "disabled" : "configured",
    })),
  };
  const connected: ActionResult = {
    state: "connected",
    message: "Connected",
    taskId: null,
    url: null,
    command: null,
  };
  const pending: Array<(value: ActionResult) => void> = [];
  let scans = 0;
  const scan = async () => {
    scans++;
    return inventory;
  };
  const check = () =>
    new Promise<ActionResult>((resolve) => pending.push(resolve));
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  try {
    cache.refresh(scan, check);
    assert.equal(cache.snapshot().pending, true);
    await tick();
    assert.equal(pending.length, 2);
    assert.equal(cache.snapshot().inventory?.servers.length, 5);
    cache.snapshot();
    cache.snapshot();
    cache.refresh(scan, check);
    assert.equal(scans, 1);
    pending[0](connected);
    pending[1](connected);
    await tick();
    assert.equal(pending.length, 4);
    pending[2](connected);
    pending[3](connected);
    await tick();
    assert.equal(cache.snapshot().pending, false);
    assert.equal(Object.keys(cache.snapshot().checks).length, 4);
    cache.snapshot();
    assert.equal(scans, 1);
    cache.refresh(scan, check);
    await tick();
    assert.equal(scans, 2);
    assert.equal(cache.snapshot().checks["0"].result?.state, "connected");
    cache.dispose();
    pending[4](connected);
    pending[5](connected);
    await tick();
    assert.equal(pending.length, 6);
  } finally {
    cache.dispose();
  }
});
