import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import {
  parse,
  modify,
  applyEdits,
  type ParseError,
} from "jsonc-parser/lib/esm/main.js";
import type { AddInput } from "./add-contract";
import { updateConfig } from "./config-file";
export function withServer(text: string, input: AddInput): string {
  const errors: ParseError[] = [];
  const toml = input.harness === "Codex";
  const root = toml
    ? parseToml(text)
    : parse(text || "{}", errors, { allowTrailingComma: true });
  if (errors.length || !root || typeof root !== "object" || Array.isArray(root))
    throw new Error("Cannot edit this configuration. Fix its syntax first.");
  const key = toml
    ? "mcp_servers"
    : input.harness === "OpenCode"
      ? "mcp"
      : "mcpServers";
  const current = root[key];
  if (
    current !== undefined &&
    (!current || typeof current !== "object" || Array.isArray(current))
  )
    throw new Error("Invalid MCP configuration.");
  if (current && Object.hasOwn(current, input.name))
    throw new Error(
      "A server with this name already exists in this configuration.",
    );
  let entry: Record<string, unknown>;
  if (input.transport === "http")
    entry =
      input.harness === "OpenCode"
        ? { type: "remote", url: input.url }
        : input.harness === "Gemini CLI"
          ? { httpUrl: input.url }
          : toml
            ? { url: input.url }
            : { type: "http", url: input.url };
  else
    entry =
      input.harness === "OpenCode"
        ? { type: "local", command: [input.command, ...input.args] }
        : { command: input.command, args: input.args };
  if (toml) {
    root[key] = { ...current, [input.name]: entry };
    return stringifyToml(root);
  }
  return applyEdits(
    text || "{}",
    modify(text || "{}", [key, input.name], entry, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    }),
  );
}
export async function addServer(input: AddInput) {
  await updateConfig(input.source, (text) => withServer(text, input), true);
}
