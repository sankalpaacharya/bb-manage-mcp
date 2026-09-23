import { updateConfig } from "./config-file";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import {
  parse,
  modify,
  applyEdits,
  type ParseError,
} from "jsonc-parser/lib/esm/main.js";
import type { Server } from "./model";

export function withoutServer(text: string, server: Server): string {
  if (server.name.length >= 160)
    throw new Error("Server name is too long to remove safely.");
  const toml = server.harness === "Codex";
  const errors: ParseError[] = [];
  const root = toml
    ? parseToml(text)
    : parse(text, errors, { allowTrailingComma: true });
  if (errors.length || !root || typeof root !== "object")
    throw new Error("Invalid configuration");
  const key = toml
    ? "mcp_servers"
    : server.harness === "OpenCode"
      ? "mcp"
      : "mcpServers";
  const nested =
    server.harness === "Claude Code" &&
    server.project &&
    !server.source.endsWith("/.mcp.json");
  const path = nested
    ? ["projects", server.project!, key, server.name]
    : [key, server.name];
  let container = root;
  for (const part of path.slice(0, -1)) {
    if (
      !container ||
      typeof container !== "object" ||
      !Object.hasOwn(container, part)
    )
      throw new Error("Entry no longer exists");
    container = container[part];
  }
  if (!container || !Object.hasOwn(container, server.name))
    throw new Error("Entry no longer exists");
  if (toml) {
    delete container[server.name];
    return stringifyToml(root);
  }
  return applyEdits(
    text,
    modify(text, path, undefined, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    }),
  );
}
export async function removeServer(server: Server): Promise<void> {
  await updateConfig(server.source, (text) => withoutServer(text, server));
}
