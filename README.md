# Claude Code Coach

Learn Claude Code while you use it. While Claude works, a short tip appears under the spinner, in the same place Claude Code shows its own tips:

```
> refactor the auth module into smaller files

✻ Pollinating… (6s · esc to interrupt)
  ⎿ Try: Before a big change, commit first so undoing it is a single git command
```

Each tip is called a crumb. It names one key or command and what it does for you. You install it once. After that it runs on its own.

## What to expect

- **One line at a time, only while Claude is working.** Nothing is printed into the chat, and no tip interrupts you.
- **Basics first.** The bank holds 80 crumbs at three levels. New users see the fundamentals before the advanced material.
- **Crumbs come back.** After a crumb is shown, it waits at least three sessions, then returns when the others have had their turn. Repetition is what makes them stick.
- **Claude Code's own tips stay on.** Crumbs share the rotation with the built-in tips, so you still hear about new features.
- **No cost.** Crumbs use no tokens, run no hook, and add nothing to Claude's context.

### Where crumbs appear

| Surface | Status |
|---|---|
| Terminal (`claude`) | Supported and tested |
| Desktop app (Code tab) | Supported and tested |
| VS Code, JetBrains | Not tested yet. Crumbs appear there if that surface shows spinner tips. |

Both surfaces read the same tip file. A crumb that only applies to one surface says so, for example `In the terminal, press Ctrl+R to search your prompt history and reuse an earlier prompt`.

## Requirements

- Claude Code 2.1.247 or later (`claude --version`; update with `claude update`)
- Node.js 18 or later
- git

## Install

```sh
git clone https://github.com/hamednasrabadi/claude-code-coach.git
cd claude-code-coach/claude-code-coach
node install.mjs
```

The installer prints what it changed:

```
Installing claude-code-coach

  + linked C:\Users\you\.claude\skills\claude-code-coach
  + spinner tips now read C:/src/claude-code-coach/claude-code-coach/try-tips.json
  ~ backed up settings to C:\Users\you\.claude\backups\settings.json.2026-10-13T13-07-55-557Z
  ✓ 80 crumbs ready
  ✓ Claude Code 2.1.296 supports crumbs

Done. Start a new Claude Code session; crumbs appear under the spinner while Claude works.
```

It makes two changes:

1. It links the skill into `~/.claude/skills/claude-code-coach`. That is a junction on Windows and a symlink elsewhere, so no admin rights are needed.
2. It adds one key to `~/.claude/settings.json`:

   ```json
   "spinnerTipsOverride": {
     "label": "Try",
     "tipsFile": "<clone>/claude-code-coach/try-tips.json"
   }
   ```

Your settings are backed up before anything is written, and every other key is left alone. If you already have inline tips under `spinnerTipsOverride`, they are kept. Running the installer again is safe; it reports what is already in place and changes nothing.

Start a new session and the crumbs are live. Claude Code reads the tip file when it starts, so a session that was already open keeps its current tips.

Keep the clone where it is. The setting points at the file inside it.

## Update

```sh
cd claude-code-coach
git pull
```

There is nothing to reinstall. New sessions read the updated crumbs.

## Uninstall

```sh
node install.mjs --uninstall
```

This removes the skill link and the two fields the installer added. Any tips of your own stay in place.

## Using it

There is nothing to run. Use Claude Code as usual and read the crumbs as they appear.

If a crumb catches your eye, ask Claude about it, for example *"what does the /branch tip mean?"* The skill gives Claude reference notes on keys, commands, context management, and workflow, so it can explain the crumb with an example from your current work.

To hide all spinner tips, including Claude Code's own, turn off **Show tips** in `/config`.

### The crumbs

The bank covers the keys you use all day, session and context management, CLAUDE.md and memory, skills, hooks and plugins, subagents, models and effort, review and verification, git and worktrees, and automation. Every command was checked against the official documentation at [code.claude.com/docs](https://code.claude.com/docs).

Crumbs come in a few shapes, chosen to fit the tip:

| Shape | Example |
|---|---|
| Command | `/recap gives a one-line summary of where this session stands, handy after a break` |
| Key | `Press Ctrl+R to search your prompt history and reuse something you already typed once` |
| When | `Before you open a PR, run /code-review to check the changes for bugs; add --fix to apply fixes` |
| Goal | `To keep a long task going when context fills up, run /compact to summarize history and carry on` |
| Fact | `Rewind can't undo rm, mv, or cp run in Bash, so commit before Claude deletes files` |
| Question | `Closed the terminal by accident? claude --continue reopens the last session in this folder` |

To read the whole bank:

```sh
node crumbs.mjs list
```

## How it works

Claude Code has a documented setting, [`spinnerTipsOverride`](https://code.claude.com/docs/en/settings-reference#spinnertipsoverride), that adds your own tips to the spinner. It also does the scheduling: it keeps a show history for each tip by id, shows the tip that has gone unshown the longest, and honors a per-tip cooldown and priority.

This project supplies the content and sets that up:

- `crumbs.json` is the source bank. Each crumb has an id, its text, a topic, a level, and the documentation page it was checked against.
- `try-tips.json` is generated from it and holds only what Claude Code reads: id, text, a cooldown of three sessions, and a priority from the level (basics `2`, everyday `0`, advanced `-2`).
- Crumb wording never changes once published. You recognize a crumb you have seen before by its words, and Claude Code tracks its history by its id. A reworded crumb gets a new id, and the test suite enforces this through `crumbs.lock`.

Earlier versions ran their own scheduler in a `SessionStart` hook and asked Claude to deliver tips in the chat. That spent tokens every session and depended on the model remembering to do it. The installer removes that hook if it finds it.

## Troubleshooting

**No crumbs appear.**

1. Start a new session. The tip file is read once, at startup.
2. Run `claude --version`. You need 2.1.247 or later.
3. Check that **Show tips** is on in `/config`.
4. Run `node install.mjs` again. It reports anything that is not in place.

**I only see Claude Code's own tips.** The tip file path in `~/.claude/settings.json` must exist. If you moved or deleted the clone, run the installer again from its new location.

**The installer refuses to run.** Another tool already set `spinnerTipsOverride.tipsFile`. Claude Code reads one tip file, so remove that setting first, or merge the two tip lists by hand.

## Adding a crumb

1. Add an entry to `claude-code-coach/crumbs.json`. Follow the rules in [SKILL.md](claude-code-coach/SKILL.md#adding-or-editing-crumbs): one action, 70 to 110 characters, checked against the docs, and not something Claude Code's built-in tips already teach.
2. Regenerate the tip file and lock the new id:

   ```sh
   node crumbs.mjs build
   ```

3. Run the tests:

   ```sh
   node test.mjs
   ```

The tests check every crumb against the rules, check that `try-tips.json` is current, and run the installer against a temporary config directory.

## Layout

```
claude-code-coach/
  SKILL.md        the skill Claude loads for questions about Claude Code
  crumbs.json     the crumb bank (source of truth)
  try-tips.json   generated; the file Claude Code reads
  crumbs.lock     pins each id to its text
  crumbs.mjs      build and list the bank
  install.mjs     installer and uninstaller
  test.mjs        bank and installer tests
  learnings.md    dated log of changes to the bank
  references/     keys, context, building blocks, and workflow notes
docs/specs/       design notes
```

## Author

Hamed Nasrabadi. Crumbs distilled from my Claude Code course material and checked against the official documentation.

## License

MIT. See [LICENSE](LICENSE).
