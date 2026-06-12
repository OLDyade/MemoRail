# Security Model

MemoRail treats agent memory as sensitive local state.

Required controls:

- Memory writes must pass schema validation.
- Paths must remain inside the configured memory root.
- Agents must not write files directly when using the runtime.
- Sensitive data rules must block secrets, tokens, credentials, and high-risk
  personal data by default.
- Every write should be auditable.
- Core write, index, and audit failures should be explicit. MemoRail should not
  silently downgrade to a weaker memory path.
- HTTP MCP deployments must bind deliberately, require a token, and restrict the
  configured memory root.
