# Contributing

Thanks for helping improve MemoRail.

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

## Pull Requests

- Keep changes focused.
- Add or update tests for changed behavior.
- Update docs when public CLI, MCP, schema, or package behavior changes.
- Do not commit local memory roots, secrets, generated debug logs, or private
  transcripts.
- Security issues should be reported through the security policy, not public
  issues.

## Commit Style

Use Conventional Commits:

```text
feat(core): add memory writer
fix(cli): reject missing root
docs: clarify MCP setup
test(core): cover archive behavior
chore(ci): add pnpm workflow
```

## Design Rules

- Markdown memory files are the fact source.
- `MEMORY.md`, `memory.json`, `entities.json`, and `bm25.json` are derived.
- Public MCP tools must stay small and stable.
- Invalid schemas, unsafe paths, and failed writes should fail explicitly.
