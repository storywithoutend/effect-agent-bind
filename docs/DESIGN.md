# Design

## Responsibility

`effect-agent-bind` translates one allowlisted harness into a stable invocation shape:

```text
catalog -> probe -> select -> invocation -> caller execution -> usage normalization
```

The package stops before execution. The caller owns the workspace, process, Git, network, credential, and evidence boundaries.

## Fail-closed selection

The catalog is static. Unknown PATH names are never executed. Explicit selection requires a matching probe hit. Automatic selection requires either one hit or a caller-supplied preference order.

`probeInstalledAgentsWith` accepts a process executor so the probe can run inside the same boundary that will run the agent. It asks only for `which` and version commands. It does not inspect provider config files.

## Plain invocation plans

An invocation plan contains vendor command-line details, not security claims. It records:

- harness and binary;
- arguments;
- working directory;
- non-secret environment additions;
- model and timeout;
- structured-output mode;
- session and user-config mode;
- the vendor permission mode used for unattended execution.

It does not contain support files, sandbox policy, generated extensions, network rules, path-confinement code, or isolation receipts.

Claude and Pi expose a `files` profile that omits process tools. The `full` profile includes the normal shell tool. Codex and the other cataloged harnesses fail closed when asked for `files` because their tool surfaces cannot make that promise reliably.

## Unattended execution

The unattended plans are intended for an external sandbox. Claude receives an explicit allowed-tool set. Codex disables its inner sandbox and uses a non-interactive approval policy. Pi receives explicit built-in tools and disables user extensions, MCP, skills, prompt templates, themes, context files, and session persistence.

These flags are harness configuration, not isolation. A caller must not run an unattended plan in an untrusted host checkout.

## Usage normalization

The normalizer scans structured JSON lines without discarding raw output. It returns token, cost, elapsed-time, turn, command, and byte fields when the harness reports them, with zeroes for unavailable fields.
