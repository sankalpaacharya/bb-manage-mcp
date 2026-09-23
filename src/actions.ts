import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import type { Server } from "./model";

export interface ActionResult {
  state:
    | "unknown"
    | "connected"
    | "failed"
    | "credentials"
    | "auth-required"
    | "waiting"
    | "complete"
    | "manual";
  message: string;
  taskId: string | null;
  url: string | null;
  command: string | null;
}
export const result = (
  state: ActionResult["state"],
  message: string,
): ActionResult => ({ state, message, taskId: null, url: null, command: null });
const binaries = {
  "Claude Code": "claude",
  Codex: "codex",
  "Gemini CLI": "gemini",
  OpenCode: "opencode",
  Cursor: "agent",
};
export function parseStatus(server: Server, output: string): ActionResult {
  if (server.harness === "Codex") {
    try {
      const rows: unknown = JSON.parse(output);
      const row = Array.isArray(rows)
        ? rows.find((r) => r?.name === server.name)
        : null;
      if (row?.auth_status === "not_logged_in")
        return result("auth-required", "Sign-in required");
      if (["o_auth", "oauth", "bearer_token"].includes(row?.auth_status))
        return result(
          "credentials",
          "Credentials saved · connection not verified",
        );
      return result("unknown", "Connection not verified by Codex");
    } catch {
      return result("unknown", "Could not read harness status");
    }
  }
  const clean = output.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
  // Claude get is scoped to a single server; other list formats are not stable enough to infer status safely.
  const status =
    server.harness === "Claude Code"
      ? (clean.split("\n").find((line) => /^\s*Status:/i.test(line)) ?? "")
      : "";
  if (/needs? auth|not authenticated/i.test(status))
    return result("auth-required", "Sign-in required");
  if (/failed|disconnected|rejected/i.test(status))
    return result("failed", "Not connected");
  if (/\bconnected\b/i.test(status)) return result("connected", "Connected");
  return result("unknown", "Status unavailable · check in the harness");
}
export async function checkServer(
  server: Server,
  signal?: AbortSignal,
): Promise<ActionResult> {
  if (server.harness !== "Claude Code" && server.harness !== "Codex")
    return result("manual", `Check connection status in ${server.harness}.`);
  const args =
    server.harness === "Codex"
      ? ["mcp", "list", "--json"]
      : ["mcp", "get", "--", server.name];
  return new Promise((resolve) =>
    execFile(
      binaries[server.harness],
      args,
      {
        cwd: server.project ?? homedir(),
        signal,
        timeout: 20000,
        maxBuffer: 262144,
        env: { ...process.env, NO_COLOR: "1" },
      },
      (error, stdout) =>
        resolve(
          error
            ? result(
                "unknown",
                "Status check failed. Check that the harness CLI is available.",
              )
            : parseStatus(server, stdout),
        ),
    ),
  );
}
export function authorizationUrl(output: string): string | null {
  for (const match of output.matchAll(/https:\/\/[^\s<>"\x1b]+/g)) {
    try {
      const url = new URL(match[0]);
      if (
        url.href.length <= 8192 &&
        !url.username &&
        !url.password &&
        !url.hash &&
        url.searchParams.has("client_id") &&
        url.searchParams.has("response_type") &&
        !["access_token", "id_token", "code", "client_secret"].some((key) =>
          url.searchParams.has(key),
        )
      )
        return url.href;
    } catch {
      /* Ignore terminal fragments. */
    }
  }
  return null;
}
interface Job {
  serverId: string;
  value: ActionResult;
  child: ChildProcess;
  timer: ReturnType<typeof setTimeout>;
}
export class AuthJobs {
  private jobs = new Map<string, Job>();
  start(server: Server): ActionResult {
    const args =
      server.harness === "OpenCode"
        ? ["mcp", "auth", "--", server.name]
        : ["mcp", "login", "--", server.name];
    const command = [binaries[server.harness], ...args]
      .map((value) => `'${value.replaceAll("'", "'\\''")}'`)
      .join(" ");
    if (
      server.harness === "Gemini CLI" ||
      server.harness === "Cursor" ||
      server.transport === "stdio"
    )
      return {
        ...result(
          "manual",
          server.transport === "stdio"
            ? "Manage credentials for this local server in its harness."
            : `Complete sign-in in ${server.harness}.`,
        ),
        command:
          server.harness === "Gemini CLI"
            ? `/mcp auth ${server.name}`
            : command,
      };
    for (const job of this.jobs.values())
      if (job.serverId === server.id && job.value.state === "waiting")
        return { ...job.value };
    if (
      [...this.jobs.values()].filter((job) => job.value.state === "waiting")
        .length >= 3
    )
      return result("failed", "Finish an existing sign-in first.");
    for (const [id, job] of this.jobs)
      if (this.jobs.size >= 20 && job.value.state !== "waiting")
        this.jobs.delete(id);
    const id = randomUUID();
    const child = spawn(binaries[server.harness], args, {
      cwd: server.project ?? homedir(),
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      env: { ...process.env, NO_COLOR: "1" },
    });
    const job: Job = {
      serverId: server.id,
      child,
      value: {
        ...result("waiting", "Complete sign-in in your browser."),
        taskId: id,
        command,
      },
      timer: setTimeout(
        () =>
          this.stop(
            id,
            "Sign-in timed out. Run the command in your harness terminal.",
          ),
        300000,
      ),
    };
    this.jobs.set(id, job);
    let output = "";
    const read = (chunk: Buffer) => {
      if (job.value.state !== "waiting") return;
      output += chunk.toString();
      if (output.length > 262144) {
        this.stop(
          id,
          "Sign-in output exceeded the limit. Use the harness terminal.",
        );
        return;
      }
      job.value.url = authorizationUrl(output);
    };
    child.stdout?.on("data", read);
    child.stderr?.on("data", read);
    const finish = (ok: boolean) => {
      clearTimeout(job.timer);
      if (job.value.state !== "waiting") return;
      job.value = {
        ...job.value,
        state: ok ? "complete" : "failed",
        url: null,
        message: ok
          ? "Sign-in completed. Check status to verify the connection."
          : "Could not complete sign-in. Run the command in your harness terminal.",
      };
      output = "";
    };
    child.once("error", () => finish(false));
    child.once("close", (code) => finish(code === 0));
    return { ...job.value };
  }
  poll(id: string): ActionResult {
    return {
      ...(this.jobs.get(id)?.value ??
        result("failed", "Sign-in expired. Try again.")),
    };
  }
  stop(id: string, message = "Sign-in cancelled."): ActionResult {
    const job = this.jobs.get(id);
    if (!job || job.value.state !== "waiting") return this.poll(id);
    clearTimeout(job.timer);
    const kill = (signal: NodeJS.Signals) => {
      try {
        if (process.platform !== "win32" && job.child.pid)
          process.kill(-job.child.pid, signal);
        else job.child.kill(signal);
      } catch {
        /* Already exited. */
      }
    };
    kill("SIGTERM");
    const force = setTimeout(() => kill("SIGKILL"), 2000);
    force.unref();
    job.child.once("close", () => clearTimeout(force));
    job.value = { ...job.value, state: "failed", message, url: null };
    return { ...job.value };
  }
  dispose() {
    for (const id of this.jobs.keys()) this.stop(id);
  }
}
