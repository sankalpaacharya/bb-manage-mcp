# MCP library

## Direction

A personal server library for developers who use several coding harnesses. The earlier Skills screenshot and dashboard layout are retired. Research: Smithery's search-first discovery, Glama's separation of catalog and server details, and PulseMCP's scannable directory. Borrow their information hierarchy, not their visual identity or marketplace claims.

## Composition

A compact library header sits above a two-part workspace: a quiet harness filter rail and a searchable catalog. The catalog groups exact matching server names, displaying harness coverage and configuration counts. Selecting a card opens a focused inspector with every source preserved. Grouping by name is a browsing convenience, never a claim that endpoints or credentials match.

```
MCP library                                Refresh
Your servers, across your coding tools.
--------------------------------------------------
Library        Search servers, harnesses, paths
All servers    Your servers       count / sort
Needs review   [server   harnesses] [server ...]
Disabled       [server   harnesses] [server ...]

Harnesses      Selected server inspector
Claude Code    Configuration / scope / transport
Codex          Source path
...
Files          Last scanned / read-only note
```

The rejected approach made configuration statistics dominate the first viewport. The new hierarchy makes server identities and harness coverage the primary content. No decorative charts, invented descriptions, ratings, install buttons, or connection health claims.

## Tokens

The app inherits BB's background and foreground for native theme compatibility. Reference dark palette: graphite #191a1d, raised graphite #222429, rule #363940, text #eeeff2, secondary #a5aab4, selection blue #91a6ec. Light mode inherits the host's equivalent semantic surfaces; accent is mixed with foreground to preserve contrast. Amber indicates incomplete configuration, not network health.

Use BB's configured sans-serif for controls and body copy, with 26px / 600 page title, 17px / 600 server names, 14px body, and 12px metadata. Avoid remote fonts and logo requests; configuration names must never be sent to a third party. Monograms are generated locally and are not provider logos. Paths alone use a monospace font.

Cards have generous internal space, a restrained border, and a clear inspect affordance. The filter rail uses background selection instead of pills. Color varies only in small monograms and meaningful status marks. Corners: 6px controls, 10px server cards, 8px monograms. No decorative shadows or gradients.

Use container queries because BB panels can be narrow on large screens. The rail becomes horizontally scrollable filters on narrow panels; cards collapse to one column. The inspector appears alongside the catalog only when there is enough room and otherwise precedes it. Keyboard focus, selected states, status filters, sorting, no-results recovery, refresh errors, and missing files are first-class interactions. Motion is limited to short hover/selection changes and respects reduced motion.
