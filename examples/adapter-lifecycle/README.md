# Adapter Lifecycle Contract

Native adapters should map host events into MemoRail operations:

```text
session start
  -> init root, run doctor, create session source ref

prompt build / turn start
  -> memory_context(query)

turn end
  -> host-driven extraction candidate generation

session end
  -> finalize audit, optional future consolidation
```

Adapters must not write memory files directly. They should call the TypeScript
SDK or MCP tools and let core validation own schema, paths, audit, and indexes.

No adapter should be documented as supported until it has a runnable smoke test.
