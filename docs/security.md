# Security Model

MemoRail treats agent memory as sensitive local state.

Required controls:

- Memory writes must pass schema validation.
- Paths must remain inside the configured memory root.
- Agents must not write files directly when using the runtime.
- Sensitive data rules must block secrets, tokens, credentials, and high-risk
  personal data by default.
- Every write should be auditable.

