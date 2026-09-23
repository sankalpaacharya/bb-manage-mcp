import { useCallback, useEffect, useRef, useState } from "react";
import type { Inventory } from "./model";
import type { ActionResult } from "./actions";
export interface ConnectionCheck {
  pending: boolean;
  result: ActionResult | null;
}
const failed: ActionResult = {
  state: "unknown",
  message: "Status check failed. Try again.",
  taskId: null,
  url: null,
  command: null,
};

/** Bound automatic checks so opening a large inventory does not flood the host. */
export function useConnectionChecks(
  inventory: Inventory | null,
  check?: (id: string) => Promise<ActionResult>,
) {
  const [checks, setChecks] = useState<Record<string, ConnectionCheck>>({});
  const generation = useRef(0);
  const run = useCallback(
    async (id: string, version: number) => {
      if (!check || version !== generation.current) return;
      setChecks((previous) => ({
        ...previous,
        [id]: { pending: true, result: null },
      }));
      let result: ActionResult;
      try {
        result = await check(id);
      } catch {
        result = failed;
      }
      if (version === generation.current)
        setChecks((previous) => ({
          ...previous,
          [id]: { pending: false, result },
        }));
    },
    [check],
  );
  useEffect(() => {
    const version = ++generation.current;
    const entries =
      inventory?.servers.filter((server) => server.state === "configured") ??
      [];
    setChecks(
      check
        ? Object.fromEntries(
            entries.map((server) => [
              server.id,
              { pending: true, result: null },
            ]),
          )
        : {},
    );
    let cursor = 0;
    const worker = async () => {
      while (
        check &&
        version === generation.current &&
        cursor < entries.length
      ) {
        const server = entries[cursor++];
        await run(server.id, version);
      }
    };
    for (let i = 0; i < Math.min(3, entries.length); i++) void worker();
    return () => {
      generation.current++;
    };
  }, [inventory, check, run]);
  return {
    checks,
    check: useCallback((id: string) => run(id, generation.current), [run]),
  };
}
