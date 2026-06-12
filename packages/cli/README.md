# @memorail/cli

Command-line interface for MemoRail.

```bash
memorail init --root .memorail
memorail write --root .memorail --type preference --scope user --summary "..." --body "..."
memorail search --root .memorail "query"
memorail doctor --root .memorail
```

CLI output is JSON by default so agents and automation can consume it directly.
