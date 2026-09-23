import { useCallback, useEffect, useRef, useState } from "react";

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

/** Display the server cache; run a CLI check only on an explicit retry. */
export function useConnectionChecks(
  cached: Record<string, ConnectionCheck> | undefined,
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
    generation.current++;
    setChecks(cached ?? {});
    return () => {
      generation.current++;
    };
  }, [cached]);
  return {
    checks,
    check: useCallback((id: string) => run(id, generation.current), [run]),
  };
}
