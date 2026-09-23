import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Self-contained preview of the production component with synthetic data only.
const output = resolve(process.argv[2] || "dist/preview.html");
const result = await build({
  entryPoints: ["dev/preview.tsx"],
  bundle: true,
  minify: true,
  write: false,
  outdir: "dist/preview",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const script = result.outputFiles
  .find((file) => file.path.endsWith(".js"))
  .text.replaceAll("</script", "<\\/script");
const styles = result.outputFiles.find((file) =>
  file.path.endsWith(".css"),
).text;
const shell = `
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.preview-app { height: 100%; display: flex; flex-direction: column; --background: #191a1d; --foreground: #eeeff2; --muted-foreground: #a5aab4; --border: #363940; color-scheme: dark; }
.preview-light { --background: #fcfcfd; --foreground: #222733; --muted-foreground: #606776; --border: #dde0e6; color-scheme: light; }
.preview-note { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 18px; background: var(--background); color: var(--muted-foreground); border-bottom: 1px solid var(--border); font-size: 11px; }
.preview-note button { padding: 5px 8px; border: 1px solid var(--border); background: transparent; color: var(--foreground); border-radius: 5px; cursor: pointer; font: inherit; }
.preview-app > .mcp-library { flex: 1; }
`;
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MCP library preview</title><style>${shell}\n${styles}</style></head><body><div id="root"></div><script>${script}</script></body></html>`,
);
console.log(output);
