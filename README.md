# effect-agent-bind

`effect-agent-bind` is a small allowlisted adapter for coding-agent CLIs. It catalogs known harnesses, probes binaries through a caller-owned process boundary, selects one fail-closed, builds a structured invocation, and normalizes structured usage output.

It does not execute an agent or provide filesystem, Git, process, credential, or network isolation. The caller owns the execution boundary.

## Install

```sh
npm install effect-agent-bind
```

Node.js 22 or later is required.

## Supported catalog

| ID | Binary | Unattended invocation |
| --- | --- | --- |
| `claude` | `claude` | Claude stream JSON with explicit tools |
| `codex` | `codex` | Codex JSONL with its inner sandbox disabled |
| `pi` | `pi` | Pi JSON mode with explicit built-in tools |
| `gemini` | `gemini` | Gemini stream JSON |
| `cursor` | `cursor-agent` | Catalog and probe only; unattended writes fail closed |
| `grok` | `grok` | Grok streaming JSON |

Claude and Pi support both `full` and `files` tool profiles. Other harnesses fail closed for `files` because they cannot reliably remove process tools.

## API

```ts
import {
  createInvocationPlan,
  normalizeUsage,
  probeInstalledAgentsWith,
  selectAgent,
} from "effect-agent-bind"

const hits = await probeInstalledAgentsWith(async ({ command, args }) => {
  const result = await sandbox.exec([command, ...args])
  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  }
})

const agent = selectAgent({ kind: "explicit", id: "claude" }, hits)
const plan = createInvocationPlan(agent, {
  prompt: "inspect the captures",
  cwd: "/workspace/eval",
  model: "claude-haiku-4-5",
  provider: "anthropic",
  session: "ephemeral",
  userConfig: "auth-only",
  permissionMode: "unattended",
  tools: "full",
})

const result = await sandbox.exec(
  [plan.command, ...plan.args],
  { cwd: plan.cwd, env: plan.env },
)
const usage = normalizeUsage(plan.agentId, result.stdout, elapsedSeconds)
```

`probeInstalledAgents()` is the local-process convenience probe. `probeInstalledAgentsWith()` is the boundary-preserving form for containers, sandboxes, and remote workers.

Automatic selection fails when multiple installed agents match unless the caller supplies a preference order. Explicit selection fails when the requested harness is unavailable.

## Invocation boundary

Unattended plans assume the caller already provides the security boundary. In particular, the Codex plan disables Codex's inner sandbox and sets a non-interactive approval policy. Do not execute unattended plans directly on an untrusted host workspace.

Plans contain only command, arguments, cwd, environment additions, model, timeout, output format, session mode, and permission mode. They contain no generated policy files, sandbox profiles, isolation receipts, credential material, or host execution code.

The package never reads provider configuration or credential file contents. Probing checks allowlisted binary names and version output only.

## CLI

```sh
effect-agent-bind probe --json
effect-agent-bind resolve --id claude --json
effect-agent-bind plan --id claude --prompt "inspect the captures" --json
```

The CLI prints plans. It does not execute them.

## Verification

```sh
npm run typecheck
npm test
npm run build
```
