# Improve Extension

Prompt-orchestrated repository improvement workflow for Qwen Code.

## What It Does

The extension adds `/improve`, a command that selects one meaningful,
locally-verifiable codebase improvement, implements it in an isolated git
worktree, and validates the result with a read-only test agent.

When `/improve` is invoked without arguments, it asks which context sources
should guide that single run before selecting a task. Recurring jobs ask once
before scheduling, then reuse the stored context for unattended runs.

It supports:

- one-shot improvements with `/improve`
- directed improvements such as `/improve improve CLI error messages`
- session-scoped recurring jobs such as `/improve --every 2h`
- context-guided task selection from GitHub issues, repository specs, and
  codebase signals
- isolated `improve/<kind>-<task-slug>-YYYY-MM-DD-<hash>` branches

## Usage

```text
/improve
/improve <direction>
/improve --every <interval> [direction]
/improve list
/improve clear
```

Use `/improve list` to show only scheduled improve jobs created by this
extension. Use `/improve clear` to delete those scheduled improve jobs without
touching unrelated cron jobs.

Recurring jobs require Qwen Code's experimental cron tools:

```json
{
  "experimental": {
    "cron": true
  }
}
```

You can also enable them for a session with `QWEN_CODE_ENABLE_CRON=1`.

## Contents

- `commands/improve.md`: public controller command
- `commands/improve/once.md`: internal hidden one-shot command used by scheduled jobs
- `agents/improve-dev.md`: implementation worker
- `agents/improve-test.md`: read-only validation worker
