# Manage MCP for BB

View and manage your MCP connections across Claude Code, Codex, Gemini CLI, OpenCode, and Cursor in BB.

![Manage MCP in BB showing harness filters, search, tags, and connection status](assets/showcase.png)

## Install

Requires BB 0.43+ and an enrolled host.

```sh
bb plugin install https://github.com/sankalpaacharya/bb-manage-mcp
```

Open **MCP inventory** in the sidebar. The plugin reads user configurations from your primary host. To include project configurations or use another host, open **Settings → Installed plugins → Manage MCP**. Enter project folders as absolute paths, one per line.

## Using it

- Select a harness or search by connection name, harness, or tag.
- Expand a row and click the pencil to edit tags. Changes save automatically. Use **All tags** to filter or **Group by tag** to group the list.
- Click **Reconnect** to start sign-in through the installed harness. Supported browser flows use the host’s default browser.
- Click the trash icon to remove a connection. The confirmation shows which configuration will change, and a backup is saved beside the file.
- Click **Refresh** to rescan configurations and check status.

Connections with the same name in a harness share a row. If a row has multiple configurations, choose one before reconnecting or deleting. User-wide and project configurations remain separate.

Tags live in BB’s plugin storage and do not change harness configuration. Tagging a combined row applies to all its existing configurations.

## Status

Checks run at plugin startup and when you click Refresh. Opening the page uses cached results.

Claude Code reports connection status. Codex reports whether credentials are saved, which does not prove the server is reachable. Live status for the other harnesses must be checked in the harness itself. Counts show configured connections, including disabled ones.

Reconnect support depends on the harness and server. The harness CLI must be on the host’s PATH; Linux browser sign-in also needs util-linux `script`. If a browser flow is unavailable, the row shows instructions.

## Configuration files

| Harness     | User                                           | Project                     |
| ----------- | ---------------------------------------------- | --------------------------- |
| Claude Code | `~/.claude.json`, including project entries    | `.mcp.json`                 |
| Codex       | `~/.codex/config.toml`                         | `.codex/config.toml`        |
| Gemini CLI  | `~/.gemini/settings.json`                      | `.gemini/settings.json`     |
| OpenCode    | `~/.config/opencode/opencode.json` or `.jsonc` | `opencode.json` or `.jsonc` |
| Cursor      | `~/.cursor/mcp.json`                           | `.cursor/mcp.json`          |

The plugin respects `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `XDG_CONFIG_HOME`, and an absolute `OPENCODE_CONFIG` path from the BB host worker’s environment.

Only these files and explicitly listed project folders are scanned. Plugin-bundled servers, cloud connectors, managed settings, and runtime overrides are not included. Scans are limited to 20 project folders, 1 MiB per file, and 250 entries.

Commands, URLs, headers, and credentials are not included in inventory output. Status checks and sign-in run the native harness CLI, which may launch MCP processes or save credentials. Deleting a connection does not revoke credentials. JSON edits preserve comments; editing Codex TOML may change formatting and remove comments.

## CLI

```sh
bb manage-mcp list
bb manage-mcp list --json
```

These commands list configuration metadata without checking live status.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run format:check
npm run build
bb plugin install . --yes
```

Run `npm run preview` to generate `dist/preview.html` with sample data. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution and commit conventions, and [icon sources](assets/ICON-SOURCES.md) for logo attribution.
