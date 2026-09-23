---
name: manage-mcp
description: Inspect configured MCP servers across Claude Code, Codex, Gemini CLI, OpenCode, and Cursor using the Manage MCP BB plugin.
---

Run `bb manage-mcp list --json` for inventory metadata, or `bb manage-mcp list` for readable output. The MCP inventory sidebar page provides search, harness filters, and Refresh.

The plugin scans the primary enrolled host by default. Its `hostId` setting selects another enrolled host; `projectPaths` lists up to 20 absolute folders on that host, separated by newlines. Configure these through Manage MCP settings or `bb plugin config manage-mcp`.

Report entries as configured, disabled in configuration, or incomplete. Live connection and authentication status are not checked. Preserve source and project scope when reporting duplicate names. Read errors mean coverage is incomplete; missing source files are normal.

Only named configuration files are scanned. Plugin-bundled MCPs, cloud connectors, managed settings, runtime overrides, and parent-directory inheritance are outside this version's coverage. Commands, arguments, URLs, and credentials are excluded from output. Scans never execute servers or edit harness configuration.
