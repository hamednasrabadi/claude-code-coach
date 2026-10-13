# Building: CLAUDE.md, skills, subagents, hooks, plugins, MCP

Habits from the author's course notes. Mechanics checked against code.claude.com/docs (`memory`, `skills`, `hooks`, `mcp`) on 2026-10-13.

## The routing rule

> **Fact → CLAUDE.md · Procedure → skill · Non-negotiable law → hook · Repeated prompt → slash command**

Why it matters: a procedure written into CLAUDE.md costs tokens in *every* session even when irrelevant. A skill costs nothing until its description matches. An "always do X" instruction in a prompt is something Claude can forget; a hook is enforced by the harness and cannot be.

## CLAUDE.md

- `~/.claude/CLAUDE.md` — every project you ever open. Environment, tone, standing preferences. Write these **once**, here.
- `CLAUDE.md` in the project root — facts about *this* project.
- `/init` drafts the project one; you add the rules that matter on top.
- `@path/to/file` inside CLAUDE.md imports another file, up to four hops deep. Use it to keep CLAUDE.md short.
- `.claude/rules/*.md` with a `paths:` field in the frontmatter loads only when Claude works on matching files.
- **The compounding habit:** every time Claude gets something wrong, add a line. Over weeks this becomes a sharp description of exactly how you work.

## Skills

A skill is a folder with a `SKILL.md` holding a procedure, checklist, or specialized knowledge, plus optional scripts and reference files. Its `description` frontmatter is what tells Claude when it's relevant — Claude loads it on its own when a request matches.

- Custom commands and skills are the same mechanism now: `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both produce `/deploy`. The real axis is **who invokes it** — by default both you (`/name`) and Claude (description match). `disable-model-invocation: true` makes it manual-only, and also keeps it out of subagent preloads and scheduled runs.
- Skills are preferred for new work because they can carry supporting files. If a command and a skill share a name, the skill wins.
- The reflex to build isn't memorizing the catalog; it's *"a skill probably exists for this"* whenever a task feels specialized, structured, or repetitive. Then check with `/` or `/plugin`.

## Subagents

A second Claude with its own context. It does the messy or large job and hands back only the conclusion. Two problems solved: exploration noise never touches your window, and big jobs don't bog down one train of thought.

Cost: each subagent has to rediscover context you already have. Delegate *breadth* (search across many files), keep *depth* (the reasoning you're in the middle of).

## Hooks

Deterministic code the harness runs on events — the tool for "this must always happen." `SessionStart` can inject context; `PreToolUse` can block a call; `PostToolUse` can run a linter after every edit. Configured in `settings.json` under `"hooks"`. A `SessionStart` hook's stdout, or a `{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}` JSON payload, gets added to the session's context.

**Rule:** a hook must never block a session on its own failure. Exit 0 and stay silent when something goes wrong.

## MCP

- Connect: `claude mcp add`. By default the server is stored in local scope, in `~/.claude.json` for this project only. `--scope project` writes it to `.mcp.json` to share with the team; `--scope user` makes it available everywhere.
- Status: `/mcp` in a session, or `claude mcp list` from the shell. Project servers from `.mcp.json` wait for your approval the first time.
- Permission entries take the form **`mcp__<server>__<tool>`** — the fixed `mcp__` prefix, the name you gave the server, then the tool.

## The module-wide trap: automating too early

A hook, loop, or routine earns its keep once a task is **stable and repeated**. Automating something you do once, or whose steps are still changing, just creates a rigid thing you have to maintain and fight. Do it by hand until the shape stops moving, *then* automate.
