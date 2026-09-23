import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { useConnectionChecks } from "../src/use-connection-checks";
import type { Inventory } from "../src/model";
import type { ActionResult } from "../src/actions";

test("automatic checks are bounded, tolerate failures, and restart on refresh", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  for (const key of ["window", "document", "HTMLElement", "navigator"] as const)
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === "window" ? dom.window : dom.window[key],
    });
  const { renderHook, act, waitFor, cleanup } =
    await import("@testing-library/react");
  const inventory: Inventory = {
    scannedAt: "first",
    sources: [],
    truncated: false,
    servers: Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      name: String(index),
      harness: "Codex",
      source: "/tmp/config",
      scope: "user",
      project: null,
      transport: "http",
      state: index === 5 ? "disabled" : "configured",
    })),
  };
  const connected: ActionResult = {
    state: "connected",
    message: "Connected",
    taskId: null,
    url: null,
    command: null,
  };
  const pending: Array<{
    id: string;
    resolve: (value: ActionResult) => void;
    reject: () => void;
  }> = [];
  const check = (id: string) =>
    new Promise<ActionResult>((resolve, reject) =>
      pending.push({ id, resolve, reject: () => reject(new Error("offline")) }),
    );
  try {
    const view = renderHook(
      ({ inventory }) => useConnectionChecks(inventory, check),
      { initialProps: { inventory } },
    );
    assert.equal(pending.length, 3);
    await act(async () => {
      pending[0].resolve(connected);
      pending[1].reject();
    });
    assert.equal(pending.length, 5);
    assert.equal(view.result.current.checks["1"].result?.state, "unknown");
    assert.ok(!pending.some((item) => item.id === "5"));
    view.rerender({ inventory: { ...inventory, scannedAt: "refreshed" } });
    assert.equal(pending.length, 8);
    await act(async () => {
      pending[2].resolve(connected);
      pending[3].resolve(connected);
      pending[4].resolve(connected);
    });
    assert.equal(view.result.current.checks["2"].pending, true);
    await act(async () => {
      pending[5].resolve(connected);
      pending[6].resolve(connected);
      pending[7].resolve(connected);
    });
    assert.equal(pending.length, 10);
    await act(async () => {
      pending[8].resolve(connected);
      pending[9].resolve(connected);
    });
    await waitFor(() =>
      assert.ok(
        Object.values(view.result.current.checks).every(
          (value) => !value.pending,
        ),
      ),
    );
    view.unmount();
  } finally {
    cleanup();
    dom.window.close();
  }
});
