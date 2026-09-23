# MCP connections

Use BB's existing font and semantic theme tokens. A compact heading precedes a horizontal row of harness logos and configured-entry counts. Selecting a harness filters a plain list below it.

Each row contains the server name, scope, harness, status, and two actions: Check status and Re-authenticate. Sign-in instructions appear inline when needed. No internal sidebar, cards, dashboard statistics, inspector, decorative palette, or remote fonts. Every configuration stays separate, including duplicate names.

Status checks run in the background at BB plugin startup and on explicit refresh, with at most two checks in flight. Saved credentials do not imply a live connection. Disabled or incomplete entries retain their labels and disable actions. Counts include those entries.

Rows wrap on narrow panels. Controls support keyboard focus and selected states. All logos are bundled locally; attribution is in assets/ICON-SOURCES.md.

Opening the page only reads cached inventory and status. Pending background results are polled without launching new CLI checks. The cache lasts until BB restarts or the plugin reloads; Refresh rescans with current settings.
