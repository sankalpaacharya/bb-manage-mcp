# Contributing

Use focused branches and Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:` followed by an imperative description. Keep unrelated changes in separate commits. Example: `feat: inventory MCP configurations across harnesses`.

Keep filesystem access in the host layer and parsing independent from BB registration. Validate RPC inputs and return an explicit metadata allowlist. Never log or snapshot real configuration contents, credentials, launch arguments, or endpoint URLs.

Add fixture-based tests when adding a harness or changing parsing, limits, error handling, or redaction. Use temporary directories and synthetic credentials. Update the documented coverage whenever discovery rules change.

Before opening a pull request, run `npm run typecheck`, `npm test`, `npm run format:check`, and `npm run build`. Describe the observable behavior, validation, and remaining limitations.
