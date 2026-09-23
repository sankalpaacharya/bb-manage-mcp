import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { InventoryView } from "../src/inventory-view";
import type { Inventory } from "../src/model";

test("library filters, opens inspector, switches layouts, and reviews sources", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: dom.window,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.window.document,
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: dom.window.HTMLElement,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  const { render, fireEvent, cleanup, within } =
    await import("@testing-library/react");
  const data: Inventory = {
    scannedAt: "2026-09-23T00:00:00Z",
    truncated: false,
    servers: [
      {
        id: "1",
        name: "docs",
        harness: "Codex",
        source: "/home/test/.codex/config.toml",
        scope: "user",
        project: null,
        transport: "http",
        state: "configured",
      },
      {
        id: "2",
        name: "design",
        harness: "Cursor",
        source: "/home/test/.cursor/mcp.json",
        scope: "user",
        project: null,
        transport: "stdio",
        state: "disabled",
      },
    ],
    sources: [
      {
        harness: "Gemini CLI",
        path: "/home/test/.gemini/settings.json",
        project: null,
        scope: "user",
        status: "error",
        issue: "Could not read or parse this configuration.",
      },
    ],
  };
  let refreshed = 0;
  try {
    const view = render(
      <InventoryView
        inventory={data}
        pending={false}
        error={null}
        onRefresh={() => {
          refreshed++;
        }}
      />,
    );
    const servers = () =>
      within(view.getByRole("region", { name: "MCP servers" }));
    assert.equal(servers().getAllByRole("listitem").length, 2);
    fireEvent.click(view.getByRole("button", { name: "Inspect docs" }));
    const inspector = within(
      view.getByRole("region", { name: "Server details" }),
    );
    assert.ok(inspector.getByText("/home/test/.codex/config.toml"));
    fireEvent.click(view.getByRole("button", { name: "Close server details" }));
    assert.equal(view.queryByRole("region", { name: "Server details" }), null);
    fireEvent.click(view.getByRole("button", { name: /^Codex/ }));
    assert.equal(servers().getAllByRole("listitem").length, 1);
    assert.ok(servers().getByText("docs"));
    fireEvent.click(view.getByRole("button", { name: /^All harnesses/ }));
    fireEvent.change(view.getByRole("searchbox", { name: "Filter MCPs" }), {
      target: { value: "design" },
    });
    assert.equal(servers().getAllByRole("listitem").length, 1);
    assert.ok(servers().getByText("design"));
    fireEvent.change(view.getByRole("searchbox", { name: "Filter MCPs" }), {
      target: { value: "" },
    });
    fireEvent.click(view.getByRole("button", { name: "List view" }));
    assert.equal(
      view
        .getByRole("button", { name: "List view" })
        .getAttribute("aria-pressed"),
      "true",
    );
    fireEvent.click(view.getByRole("button", { name: "Refresh inventory" }));
    assert.equal(refreshed, 1);
    fireEvent.click(view.getByRole("button", { name: "Review files" }));
    const sources = within(
      view.getByRole("region", { name: "Configuration sources" }),
    );
    assert.ok(sources.getByText("/home/test/.gemini/settings.json"));
    assert.ok(sources.getByText("Could not read or parse this configuration."));
    view.rerender(
      <InventoryView
        inventory={data}
        pending={true}
        error={null}
        onRefresh={() => {}}
      />,
    );
    assert.ok(
      view.getByRole("button", { name: "Scanning…" }).hasAttribute("disabled"),
    );
  } finally {
    cleanup();
    dom.window.close();
  }
});
