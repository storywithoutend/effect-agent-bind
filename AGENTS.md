# AGENTS.md

## Product boundaries

- Allowlist only. Never execute unknown PATH names.
- Probe is presence-only. Do not read secret config file bodies.
- Bind fails closed. Ambiguity → error, not silent pick.
- The package plans invocations but never executes them. The caller owns isolation and credentials.
- Package name is **effect-agent-bind** (bind/resolve, not ACP adapter).

## Verification

```bash
npm run typecheck
npm test
```

## Stack

Effect TS. Keep the surface small: catalog → probe → resolve → invocation → usage → cli.
