import { createRoot } from "react-dom/client";
import { useState } from "react";
import { InventoryView } from "../src/inventory-view";
import type { Tags } from "../src/tags";
import { sampleInventory } from "./sample-data";
import "../src/library.css";
function Preview() {
  const [inventory, setInventory] = useState(sampleInventory);
  const [tags, setTags] = useState<Tags>({
    "0": ["documentation"],
    "1": ["documentation"],
    "2": ["development"],
    "5": ["planning"],
    "9": ["design"],
  });
  const [light, setLight] = useState(false);
  return (
    <div className={`preview-app ${light ? "preview-light" : ""}`}>
      <div className="preview-note">
        <span>Design preview · Sample configurations</span>
        <button onClick={() => setLight(!light)}>
          {light ? "Dark appearance" : "Light appearance"}
        </button>
      </div>
      <InventoryView
        inventory={inventory}
        tags={tags}
        actions={{
          saveTags: async (id, values) =>
            setTags((previous) => ({ ...previous, [id]: values })),
          authenticate: async () => ({
            state: "manual",
            message: "Preview only",
            taskId: null,
            url: null,
            command: null,
          }),
          poll: async () => {
            throw new Error("Preview only");
          },
          cancel: async () => {
            throw new Error("Preview only");
          },
        }}
        pending={false}
        error={null}
        onRefresh={() =>
          setInventory({ ...inventory, scannedAt: new Date().toISOString() })
        }
      />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
