import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
const harness = z.enum([
  "Claude Code",
  "Codex",
  "Gemini CLI",
  "OpenCode",
  "Cursor",
]);
const scope = z.enum(["user", "project"]);
export const inventorySchema = z.object({
  scannedAt: z.string(),
  truncated: z.boolean(),
  servers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      harness,
      source: z.string(),
      project: z.string().nullable(),
      scope,
      transport: z.enum(["stdio", "http", "sse", "ws", "unknown"]),
      state: z.enum(["configured", "disabled", "invalid"]),
    }),
  ),
  sources: z.array(
    z.object({
      harness,
      path: z.string(),
      scope,
      project: z.string().nullable(),
      status: z.enum(["loaded", "missing", "error"]),
      issue: z.string().nullable(),
    }),
  ),
});
export const hostContract = defineRpcContract({
  scan: {
    input: z
      .object({ projects: z.array(z.string().max(1024)).max(20) })
      .strict(),
    output: inventorySchema,
  },
});
export const rpcContract = defineRpcContract({
  inventory: { input: z.null(), output: inventorySchema },
});
