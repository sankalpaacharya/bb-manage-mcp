import { experimental_defineHostEntry } from "@get-bb/plugin-sdk";
import { hostContract } from "./src/contract";
import { scanInventory } from "./src/inventory";
export default experimental_defineHostEntry({
  contract: hostContract,
  handlers: {
    scan: ({ projects }, context) =>
      scanInventory({ projects, signal: context.signal }),
  },
});
