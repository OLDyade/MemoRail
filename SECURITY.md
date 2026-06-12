# Security Policy

MemoRail handles local agent memory, so security issues matter even before
1.0.

## Supported Versions

MemoRail is pre-1.0. Security fixes target the latest `main` branch until the
first stable release.

## Reporting a Vulnerability

Do not open a public issue for vulnerabilities. Report privately to the
maintainers with:

- affected package and version or commit
- reproduction steps
- expected impact
- whether secrets, local files, or private transcripts are involved

## Scope

Security-sensitive areas include:

- path traversal or writes outside the memory root
- secret or credential persistence
- MCP tool behavior that exposes unintended files
- audit bypass
- unsafe remote HTTP MCP configuration

MemoRail is not a secrets manager, privacy vault, or factual verification
system.
