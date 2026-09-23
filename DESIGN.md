# MCP inventory interface

The supplied BB Skills screenshot is a reference for typography, restrained borders, compact controls, and a dashboard with cards. It is not a layout to reproduce.

Use BB's inherited font and semantic theme tokens: `background`, `foreground`, `muted`, `muted-foreground`, `card`, `border`, `input`, and `ring`. The host controls light and dark appearance. Use monospace only for configuration paths; use tabular numerals for counts.

The page has a descriptive heading, a small inventory summary, three configuration-state summaries, then server/source navigation and filters. Server cards show a name, harness, transport, scope, and labeled state. Expand a card to inspect its source; no modal is needed. Grid and list views share the same content.

Use 24px page headings, 14px body/control text, and 12px metadata. Cards use subtle borders with rounded corners. Green and orange indicate configuration state alongside text, never live connectivity. Use one column on narrow screens, two at medium widths, and three at wide widths. Search, harness filters, layout controls, loading, empty, error, and partial-result states must remain accessible by keyboard.
