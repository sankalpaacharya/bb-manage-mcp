# Manage MCP for BB

A read-only MCP inventory for **Claude Code, Codex, Gemini CLI, OpenCode, and Cursor**. Search servers across harnesses, identify their configuration files, and inspect user and project entries from one BB sidebar page.

This inventories configured servers. It does not claim that a server is connected, authenticated, trusted, or permitted by a harness.

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
- Does not launch MCP processes, probe endpoints, expand variables, edit files, or persist scan results.
- Reads at most 1 MiB per file and returns at most 250 entries with a truncation notice. Missing files are normal; unreadable or malformed files appear as scan issues.
- Shows declarations separately, including duplicate names in different scopes. It does not merge configurations or resolve trust, approvals, inheritance, or effective permissions.
- Excludes plugin-bundled servers, cloud connectors, enterprise-managed settings, custom Claude configuration directories, runtime flags, and inline configuration. Project scanning uses the explicitly listed folders, without recursive discovery or parent traversal.

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
