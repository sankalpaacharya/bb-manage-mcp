# Manage MCP for BB

A simple MCP connection list for **Claude Code, Codex, Gemini CLI, OpenCode, and Cursor**, styled with BB's theme. Harness logos and configuration counts filter the list. Status checks run in the background at BB plugin startup and on explicit refresh, with at most two in flight. Each connection also has **Check status** and **Re-authenticate** actions.

Counts describe configuration entries, including disabled entries; they are not live connection counts.

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
| Claude Code | `~/.claude.json`, including its `projects` entries                                              | `.mcp.json`             |
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
- Each declaration has its own row. Native CLI actions resolve the effective server name in the project directory (or host home), so harness precedence applies to duplicate names.
- Excludes plugin-bundled servers, cloud connectors, enterprise-managed settings, custom Claude configuration directories, runtime flags, and inline configuration. Project scanning uses the explicitly listed folders, without recursive discovery or parent traversal.

## Status and sign-in

- Claude Code: checks connection status with `mcp get`; browser sign-in uses `mcp login` on versions that support it.
- Codex: reads `mcp list --json`. Saved OAuth or bearer credentials are labeled **Credentials saved**, not connected. Sign-in uses `mcp login`.
- OpenCode: sign-in uses `mcp auth`; check live status in OpenCode.
- Gemini CLI and Cursor: the row provides a native sign-in command; connection status must be checked in the harness.
- Local process credentials are managed in the harness; the plugin does not assume browser OAuth support.

The harness CLI must be on the BB host worker's PATH. Sign-in can open a browser on that host; a detected OAuth authorization link is also shown in BB. If the CLI requires terminal input, run the displayed command in the appropriate project directory. Sign-in jobs can be cancelled, time out after five minutes, and are stopped on plugin disposal. Status checks time out after twenty seconds. No credentials are collected by this plugin.

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
