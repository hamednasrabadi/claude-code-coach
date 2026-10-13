# Learnings log

Tips added from real sessions rather than from the mastery corpus. One dated line each; the crumb itself lives in `crumbs.json`.

Add here only what was **non-obvious and repeatable**. A fact about one repo belongs in that repo's CLAUDE.md.

---

- 2026-08-23 — bank seeded with 55 tips distilled from `ROADMAP/mastery/PLAYBOOK.md` and modules 01–11, plus Claude Code specifics from Persian course modules 26–33.
- 2026-08-23 — review pass: cross-checked every slash command in the bank against code.claude.com/docs/en/commands (all verified); corrected `/btw` (it answers *without* adding to conversation history); dropped an unverified claim about Shift+Tab's cycle order; replaced `over-engineering-setup`, a near-duplicate of `automate-when-stable`, with `one-liner-reflex`; rewrote `eternal-session` as a diagnostic so it stops repeating `resume-not-eternal`; added `subagent-needs-context` and `explore-before-plan`. Bank integrity (unique ids, required fields, 180-char body cap) is now enforced by `test-schedule.mjs`.
- 2026-10-13: rebuilt as Try crumbs. The bank was rewritten into 77 one-line crumbs (46 from the original tips, 31 new, 9 dropped or merged), each checked against code.claude.com/docs. Delivery moved from model context injection to Claude Code's `spinnerTipsOverride` setting, which also takes over rotation and repetition, so the SessionStart hook, `coach.mjs` scheduler, `tips.json`, and `digest.md` were removed.
