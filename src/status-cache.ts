import type { Inventory } from "./model";
import type { ActionResult } from "./actions";
export interface ConnectionCheck {
  pending: boolean;
  result: ActionResult | null;
}
export interface Snapshot {
  inventory: Inventory | null;
  checks: Record<string, ConnectionCheck>;
  pending: boolean;
  error: string | null;
}
export class StatusCache {
  private value: Snapshot = {
    inventory: null,
    checks: {},
    pending: false,
    error: null,
  };
  private running: Promise<void> | null = null;
  private controller = new AbortController();
  snapshot(): Snapshot {
    return structuredClone(this.value);
  }
  update(id: string, result: ActionResult) {
    this.value.checks[id] = { pending: false, result };
  }
  refresh(
    scan: (signal: AbortSignal) => Promise<Inventory>,
    check: (id: string, signal: AbortSignal) => Promise<ActionResult>,
  ): void {
    if (this.running || this.controller.signal.aborted) return;
    this.value.pending = true;
    this.value.error = null;
    this.running = (async () => {
      try {
        const inventory = await scan(this.controller.signal);
        if (this.controller.signal.aborted) return;
        this.value.inventory = inventory;
        const entries = inventory.servers.filter(
          (server) => server.state === "configured",
        );
        this.value.checks = Object.fromEntries(
          entries.map((server) => [
            server.id,
            {
              pending: true,
              result: this.value.checks[server.id]?.result ?? null,
            },
          ]),
        );
        let cursor = 0;
        const worker = async () => {
          while (!this.controller.signal.aborted && cursor < entries.length) {
            const entry = entries[cursor++];
            try {
              this.update(
                entry.id,
                await check(entry.id, this.controller.signal),
              );
            } catch {
              this.update(entry.id, {
                state: "unknown",
                message: "Status unavailable. Try again.",
                taskId: null,
                url: null,
                command: null,
              });
            }
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(2, entries.length) }, () => worker()),
        );
      } catch {
        this.value.error =
          "Could not refresh connections. Check the host and try Refresh.";
      } finally {
        this.value.pending = false;
        this.running = null;
      }
    })();
  }
  dispose() {
    this.controller.abort();
  }
}
