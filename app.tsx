import "./src/library.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { definePluginApp, useRpc, useBbNavigate } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./src/contract";
import type { Snapshot } from "./src/status-cache";
import { InventoryView } from "./src/inventory-view";

function InventoryPage() {
  const navigate = useBbNavigate();
  const rpc = useRpc<typeof rpcContract>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const load = useCallback(
    async (refresh = false) => {
      const version = ++request.current;
      try {
        const next = await rpc.call(refresh ? "refresh" : "snapshot");
        if (version === request.current) {
          setSnapshot(next);
          setError(next.error);
        }
      } catch {
        if (version === request.current)
          setError("Could not load connections. Try Refresh.");
      }
    },
    [rpc],
  );
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!snapshot?.pending) return;
    const timer = setTimeout(() => void load(), 1000);
    return () => clearTimeout(timer);
  }, [snapshot, load]);
  const actions = useMemo(
    () => ({
      openUrl: (url: string) => navigate.openUrl(url),
      authenticate: (serverId: string) =>
        rpc.call("authenticate", { serverId }),
      poll: (taskId: string) => rpc.call("poll", { taskId }),
      cancel: (taskId: string) => rpc.call("cancel", { taskId }),
    }),
    [rpc, navigate],
  );
  return (
    <InventoryView
      actions={actions}
      cachedChecks={snapshot?.checks}
      inventory={snapshot?.inventory ?? null}
      pending={(!snapshot && !error) || !!snapshot?.pending}
      error={error}
      onRefresh={() => void load(true)}
    />
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "inventory",
    title: "MCP inventory",
    icon: "Plug",
    path: "inventory",
    component: InventoryPage,
  });
});
