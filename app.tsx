import "./src/library.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./src/contract";
import type { Inventory } from "./src/model";
import { InventoryView } from "./src/inventory-view";

function InventoryPage() {
  const rpc = useRpc<typeof rpcContract>();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setPending(true);
    setError(null);
    try {
      const result = await rpc.call("inventory");
      if (current === request.current) setInventory(result);
    } catch {
      if (current === request.current)
        setError(
          "Could not scan configurations. Check the host connection and project folders in Manage MCP settings, then refresh.",
        );
    } finally {
      if (current === request.current) setPending(false);
    }
  }, [rpc]);
  useEffect(() => {
    void refresh();
    return () => {
      request.current++;
    };
  }, [refresh]);
  const actions = useMemo(
    () => ({
      check: (serverId: string) => rpc.call("check", { serverId }),
      authenticate: (serverId: string) =>
        rpc.call("authenticate", { serverId }),
      poll: (taskId: string) => rpc.call("poll", { taskId }),
      cancel: (taskId: string) => rpc.call("cancel", { taskId }),
    }),
    [rpc],
  );
  return (
    <InventoryView
      actions={actions}
      inventory={inventory}
      pending={pending}
      error={error}
      onRefresh={() => void refresh()}
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
