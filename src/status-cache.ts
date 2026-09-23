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
    check: (
      ids: string[],
      signal: AbortSignal,
    ) => Promise<Record<string, ActionResult>>,
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
        const groups = new Map<string, string[]>();
        for (const entry of entries) {
          const key = JSON.stringify([entry.harness, entry.project]);
          const group = groups.get(key) ?? [];
          group.push(entry.id);
          groups.set(key, group);
        }
        const batches = [...groups.values()];
        let cursor = 0;
        const worker = async () => {
          while (!this.controller.signal.aborted && cursor < batches.length) {
            const ids = batches[cursor++];
            try {
              const results = await check(ids, this.controller.signal);
              for (const id of ids)
                this.update(
                  id,
                  results[id] ?? {
                    state: "unknown",
                    message: "Status unavailable",
                    taskId: null,
                    url: null,
                    command: null,
                  },
                );
            } catch {
              for (const id of ids)
                this.update(id, {
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
          Array.from({ length: Math.min(2, batches.length) }, () => worker()),
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
