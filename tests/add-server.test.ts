import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "smol-toml";
import { parse as parseJson } from "jsonc-parser";
import { addServer, withServer } from "../src/add-server";
import { addInput, type AddInput } from "../src/add-contract";
import { HARNESSES } from "../src/model";

test("adds both transports for each harness, preserves unrelated settings and rejects duplicates", () => {
  for (const harness of HARNESSES) {
    for (const transport of ["http", "stdio"] as const) {
      const input: AddInput = {
        harness,
        source: "/unused",
        name: "docs",
        ...(transport === "http"
          ? { transport, url: "https://example.com/mcp" }
          : { transport, command: "npx", args: ["-y", "@example/mcp"] }),
      };
      const original =
        harness === "Codex"
          ? 'theme="dark"\n'
          : '// preserved\n{"theme":"dark"}';
      const output = withServer(original, input);
      const parsed = harness === "Codex" ? parse(output) : parseJson(output);
      assert.equal(parsed.theme, "dark");
      const entry =
        parsed[
          harness === "Codex"
            ? "mcp_servers"
            : harness === "OpenCode"
              ? "mcp"
              : "mcpServers"
        ].docs;
      assert.ok(entry);
      if (transport === "http")
        assert.equal(
          entry[harness === "Gemini CLI" ? "httpUrl" : "url"],
          "https://example.com/mcp",
        );
      else
        assert.deepEqual(
          entry.command,
          harness === "OpenCode" ? ["npx", "-y", "@example/mcp"] : "npx",
        );
      if (harness !== "Codex") assert.ok(output.includes("// preserved"));
      assert.throws(() => withServer(output, input), /already exists/);
    }
  }
});
test("creates a missing private config and backs up subsequent edits without overwriting duplicates", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mcp-add-"));
  try {
    const source = join(directory, "nested", "config.toml");
    const input: AddInput = {
      harness: "Codex",
      source,
      name: "docs",
      transport: "http",
      url: "https://example.com/mcp",
    };
    await addServer(input);
    assert.equal((await stat(source)).mode & 0o777, 0o600);
    const original = await readFile(source, "utf8");
    await assert.rejects(addServer(input), /already exists/);
    assert.equal(await readFile(source, "utf8"), original);
    await addServer({ ...input, name: "other" });
    const backup = (await readdir(join(directory, "nested"))).find((file) =>
      file.includes(".backup-"),
    )!;
    assert.equal(
      await readFile(join(directory, "nested", backup), "utf8"),
      original,
    );
    assert.ok(parse(await readFile(source, "utf8")).mcp_servers);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("rejects invalid names, non-http remote URLs and embedded credentials", () => {
  const base = {
    harness: "Codex",
    source: "/config",
    name: "docs",
    transport: "http",
    url: "https://example.com/mcp",
  };
  for (const value of [
    { ...base, name: "../bad" },
    { ...base, url: "file:///etc/passwd" },
    { ...base, url: "https://user:pass@example.com" },
  ])
    assert.equal(addInput.safeParse(value).success, false);
});
