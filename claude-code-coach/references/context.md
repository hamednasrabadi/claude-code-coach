# Context — the one gauge that predicts answer quality

Source: `mastery/03-context.md`, PLAYBOOK Play 8.

## The mental model

Everything Claude knows in a session lives in a limited context window: your files, the whole chat history, every tool result. **Fill it with junk and Claude gets measurably dumber.** A long session that starts forgetting things and getting sloppier isn't the model degrading — it's a window stuffed with dead-end debugging, abandoned approaches, and stale files crowding out what matters.

Treat it as a **budget, not a bucket**.

## The tools, in escalating order

1. **`/context`** — diagnose first. Usually one thing is hogging the window.
2. **`/btw`** — ask a side question without dragging it into the main thread.
3. **`/compact`** — compress and keep going. Right when the *task* isn't done.
4. **`/clear`** — wipe. Right when the *task is* done. Compaction still carries the old task's shape forward; clear doesn't.
5. **`/add-dir`** — widen the desk on purpose rather than by accident.
6. **Subagents** — "find every place we handle authentication; use subagents." The exploration noise lands in *their* context, and only the conclusion comes back to yours.

## The habit

> Finish a task and start an unrelated one → **`/clear`.** Don't carry the corpse of the last task into the next one.

The eternal-session habit is fear of losing history. `/resume` removes the loss. Once that's true, keeping a bloated session alive is nostalgia, and nostalgia makes Claude dumber.

## The trap

Treating context as infinite and free. It is neither. Two failure modes:

- **Hoarding** — one never-ending session, now 80% noise, where every new question competes with a hundred dead ones.
- **Blind refilling** — `/clear`ing and then re-pasting the same five files by hand every time, instead of putting the durable facts in CLAUDE.md once.
