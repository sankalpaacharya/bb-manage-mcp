# Manage MCP for BB

A simple MCP connection list for **Claude Code, Codex, Gemini CLI, OpenCode, and Cursor**, styled with BB's theme. A compact harness summary bar filters the list. Status checks run in the background at BB plugin startup and on explicit refresh, with all harness/project batches running concurrently. Each connection shows its status and a **Re-authenticate** action. Use **Refresh** to check all connections again.

Counts show unique server names per harness, including disabled entries; they are not live connection counts.

## Install

Requires BB 0.43+ with Plugin SDK 0.4.104+ and an enrolled host.

```sh
bb plugin install https://github.com/sankalpaacharya/bb-manage-mcp
```

Open **MCP inventory** in the sidebar. User configuration files are scanned on the primary host. In **Settings → Installed plugins → Manage MCP**, optionally set:

- **Host ID:** another enrolled host to inspect.
- **Project folders:** up to 20 absolute paths, one per line, on that host.

Click **Refresh** after changing configuration. The CLI uses the same settings:

```sh
bb manage-mcp list
bb manage-mcp list --json
```

## Sources

| Harness     | User configuration                                                                              | Project configuration   |
| ----------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| Claude Code | `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json`), including its `projects` entries       | `.mcp.json`             |
| Codex       | `$CODEX_HOME/config.toml`, default `~/.codex/config.toml`                                       | `.codex/config.toml`    |
| Gemini CLI  | `~/.gemini/settings.json`                                                                       | `.gemini/settings.json` |
| OpenCode    | `$XDG_CONFIG_HOME/opencode/opencode.json{,c}`, default `~/.config`; absolute `$OPENCODE_CONFIG` | `opencode.json{,c}`     |
| Cursor      | `~/.cursor/mcp.json`                                                                            | `.cursor/mcp.json`      |

Environment overrides are read from the BB host worker's environment; they can differ from a harness launched in your shell. JSON comments and trailing commas are accepted. TOML uses a dedicated parser.

Configuration references: [Claude Code](https://code.claude.com/docs/en/mcp), [Codex](https://developers.openai.com/codex/mcp), [Gemini CLI](https://geminicli.com/docs/tools/mcp-server/), [OpenCode](https://opencode.ai/docs/config/), [Cursor](https://prod.cursor.com/help/customization/mcp).

## Privacy and limits

- Reads configurations on the selected host. Returns only server names, harness, source/project paths, inferred transport, and configuration state.
- Excludes commands, arguments, endpoints, environment values, authentication headers, and raw parser errors. Metadata such as server names and paths is visible to authenticated BB users.
- Inventory scans never launch processes or edit files. Automatic and manual status checks and explicit sign-in actions run the installed harness CLI on the selected host; the harness may launch configured MCP processes or save credentials. Raw CLI output is never returned.
- Reads at most 1 MiB per file and returns at most 250 entries with a truncation notice. Missing files are normal; unreadable or malformed files appear as scan issues.
- Same-named declarations within a harness share a row. Choose a configuration before reconnecting or deleting when multiple scopes exist. Grouping by name does not mean endpoints or credentials match. Native CLI actions resolve the effective server name in the project directory (or host home), so harness precedence applies to duplicate names.
- Excludes plugin-bundled servers, cloud connectors, enterprise-managed settings, runtime flags, and inline configuration. Project scanning uses the explicitly listed folders, without recursive discovery or parent traversal.

## Status and sign-in

- Claude Code: checks connection status with `mcp list`; browser sign-in uses `mcp login` on versions that support it.
- Codex: reads `mcp list --json`. Saved OAuth or bearer credentials are labeled **Credentials saved**, not connected. Sign-in uses `mcp login`.
- OpenCode: sign-in uses `mcp auth`; check live status in OpenCode.
- Gemini CLI and Cursor: the row provides a native sign-in command; connection status must be checked in the harness.
- Local process credentials are managed in the harness; the plugin does not assume browser OAuth support.

The harness CLI must be on the BB host worker's PATH. Linux browser sign-in also requires util-linux `script` to provide an interactive terminal. Sign-in can open a browser on that host; the system default browser is used instead of BB’s embedded browser. If the CLI requires terminal input, run the displayed command in the appropriate project directory. Sign-in jobs can be cancelled, time out after five minutes, and are stopped on plugin disposal. Status checks time out after twenty seconds. No credentials are collected by this plugin.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run format:check
npm run build
bb plugin install . --yes
```

The server registers typed RPC and CLI handlers. The host entry owns filesystem access. `src/inventory.ts` parses and sanitizes data before it crosses the host boundary; `src/model.ts` contains browser-safe types. The UI uses BB's theme and vendored controls.

See [CONTRIBUTING.md](CONTRIBUTING.md) for change and commit conventions.

## Interface preview

Run `npm run preview` and open `dist/preview.html` for a self-contained, interactive preview with synthetic data and light/dark switching. It renders the production component, makes no network requests, and does not read your real configuration.

Opening the page only reads cached inventory and status. Pending background results are polled without launching new CLI checks. The cache lasts until BB restarts or the plugin reloads; Refresh rescans with current settings.

Status refresh runs one native list command per harness/project context, sharing the result across its servers. Claude uses `claude mcp list`; Codex uses `codex mcp list --json`. Configuration is displayed before health checks finish; unreachable servers can still delay a harness response.

## Remove a connection

Use the trash icon beside Reconnect and confirm the displayed source and project. Only that declaration is removed; other scopes and harnesses stay intact. A private `.backup-<id>` copy is saved beside the configuration before the update. JSON/JSONC edits preserve surrounding comments; Codex TOML is reserialized and may lose comments/formatting. Symlink configurations are not edited. Removal does not revoke OAuth credentials; restart an existing harness session if it still shows the server.

Configuration locations are checked against [Claude's scope documentation](https://code.claude.com/docs/en/mcp-quickstart#find-your-configuration-on-disk) and [OpenAI's MCP documentation](https://developers.openai.com/codex/mcp).

## Tags and grouping

Use the tag icon on a row to open a quick picker. Click an existing tag to add or remove it, or type a new tag and press Enter. Changes save immediately (up to eight tags, 32 characters each). Tags are saved in BB plugin storage, separately from MCP configuration. Tagging a combined row applies those tags to its existing configurations. Use the Tag filter and Group by tag checkbox to organize the list. A connection with multiple tags appears in each group; untagged connections have their own group. Newly added configurations start untagged.

## Adding and finding connections

Click **Add MCP** beside Refresh. Choose a harness and user-wide or project configuration, enter a name, then provide a remote HTTP(S) URL or a local executable and arguments (one per line). Project destinations come from the plugin’s project-folder settings. Existing names cannot be overwritten. Missing files are created with private permissions; existing files get a private backup before editing. JSON comments are preserved; TOML is reserialized and may lose comments or formatting. Advanced headers and environment variables still require editing the harness config.

New connections appear immediately; use Refresh to check their status and Reconnect if they need OAuth sign-in. Search above the list filters instantly by name, harness, or tag and combines with the harness and tag filters.
