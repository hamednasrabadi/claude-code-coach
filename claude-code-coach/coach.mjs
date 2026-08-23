#!/usr/bin/env node
// claude-code-coach — spaced-repetition tip scheduler for Claude Code sessions.
// Invoked by a SessionStart hook; emits ready-rendered tips as additionalContext
// so the model spends zero tool calls and ~400 tokens on coaching per session.

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const TIPS_PATH = join(DIR, 'tips.json');
const STATE_PATH = join(DIR, 'state.json');
const DIGEST_PATH = join(DIR, 'digest.md');

// Leitner intervals in days, indexed by box (1..6). Box 1 = never shown / reset.
const INTERVAL_DAYS = [0, 0, 2, 6, 16, 45, 120];
const MAX_BOX = 6;
const DEFAULT_N = 3;
const DAY_MS = 86400000;

// ---------------------------------------------------------------- io helpers

const readJson = (p, fallback) => {
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, 'utf8'));
};

const writeJsonAtomic = (p, value) => {
  const tmp = p + '.tmp';
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  renameSync(tmp, p);
};

const loadTips = () => {
  const tips = readJson(TIPS_PATH, null);
  if (!Array.isArray(tips)) throw new Error('tips.json missing or not an array: ' + TIPS_PATH);
  return tips;
};

const loadState = () => {
  const state = readJson(STATE_PATH, null);
  if (!state || typeof state !== 'object' || typeof state.tips !== 'object') {
    return { version: 1, tips: {} };
  }
  return state;
};

const entryFor = (state, id) => state.tips[id] ?? { box: 1, lastShown: null, shownCount: 0 };

// Stable hash so never-shown tips surface in a fixed but non-alphabetical order —
// otherwise the first sessions just march through the bank A to Z.
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
};

// ------------------------------------------------------------------ selection

const parseNow = (argv) => {
  const flag = argv.find((a) => a.startsWith('--now='));
  if (!flag) return new Date();
  const d = new Date(flag.slice('--now='.length));
  if (Number.isNaN(d.getTime())) throw new Error('bad --now value: ' + flag);
  return d;
};

const parseN = (argv) => {
  const flag = argv.find((a) => a.startsWith('--n='));
  const n = flag ? Number.parseInt(flag.slice('--n='.length), 10) : DEFAULT_N;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_N;
};

// Days a tip is past due. Never-shown tips get +Infinity so they always win.
const overdueDays = (tip, state, now) => {
  const { box, lastShown } = entryFor(state, tip.id);
  if (!lastShown) return Number.POSITIVE_INFINITY;
  const elapsed = (now.getTime() - new Date(lastShown).getTime()) / DAY_MS;
  return elapsed - INTERVAL_DAYS[Math.min(box, MAX_BOX)];
};

// Due tips, most-overdue first, at most one per topic so a session never
// delivers three variations of the same lesson.
const select = (tips, state, now, n) => {
  const ranked = tips
    .filter((t) => !t.retired)
    .map((t) => ({ tip: t, overdue: overdueDays(t, state, now) }))
    .filter((x) => x.overdue >= 0)
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return b.overdue - a.overdue;
      return hash(a.tip.id) - hash(b.tip.id); // stable, non-alphabetical tiebreak
    });

  // Never-shown tips are infinitely overdue, so without a reserved slot they
  // would crowd out reviews until the whole bank is exhausted — and a tip shown
  // once and never again is a tip not learned. Split the slots deliberately.
  const isFresh = (t) => !entryFor(state, t.id).lastShown;
  const fresh = ranked.filter((x) => isFresh(x.tip));
  const review = ranked.filter((x) => !isFresh(x.tip));

  const picked = [];
  const topics = new Set();
  const take = (pool, upTo) => {
    for (const { tip } of pool) {
      if (picked.length >= upTo) break;
      if (topics.has(tip.topic) || picked.includes(tip)) continue;
      topics.add(tip.topic);
      picked.push(tip);
    }
  };

  const reviewSlots = review.length ? Math.max(1, Math.round(n / 3)) : 0;
  take(fresh, n - reviewSlots);   // new material leads
  take(review, n);                // then the reserved review slot(s)
  take(fresh, n);                 // backfill if reviews were short
  // Last resort: topic diversity starved us, so drop that constraint.
  if (picked.length < n) {
    for (const { tip } of ranked) {
      if (picked.length >= n) break;
      if (!picked.includes(tip)) picked.push(tip);
    }
  }
  return picked;
};

// ------------------------------------------------------------------ rendering

const renderTip = (tip, i) => {
  const action = tip.action ? ' `' + tip.action + '` ·' : '';
  const when = tip.triggers && tip.triggers.length ? ' _[' + tip.triggers[0] + ']_' : '';
  return (i + 1) + '. (' + tip.id + ') **' + tip.title + '** —' + action + ' ' + tip.body + when;
};

const CONTRACT = [
  '### Coach mode — hold these, deliver during the session',
  'One per message max, at a natural seam (task lands, or its trigger occurs). Never interrupt debugging to teach; drop any tip whose trigger never fires.',
  'Format: `💡 **<title>** — <body>` + the literal key/command. No preamble.',
  'Knows it already -> `coach.mjs know <id>`; hits the problem anyway -> `coach.mjs again <id>`.',
].join('\n');

const render = (picked) => {
  const digest = existsSync(DIGEST_PATH) ? readFileSync(DIGEST_PATH, 'utf8').trim() : '';
  const parts = ['## Claude Code Coach (auto-loaded)'];
  if (digest) parts.push(digest);
  if (picked.length) {
    parts.push(CONTRACT);
    parts.push(picked.map(renderTip).join('\n'));
  }
  parts.push('Depth: load the `claude-code-coach` skill.');
  return parts.join('\n\n');
};

const markShown = (state, picked, now) => {
  for (const tip of picked) {
    const e = entryFor(state, tip.id);
    state.tips[tip.id] = {
      box: Math.min(e.box + 1, MAX_BOX),
      lastShown: now.toISOString(),
      shownCount: (e.shownCount ?? 0) + 1,
    };
  }
  writeJsonAtomic(STATE_PATH, state);
};

// ------------------------------------------------------------------- commands

const cmdSession = (argv) => {
  const now = parseNow(argv);
  const tips = loadTips();
  const state = loadState();
  const picked = select(tips, state, now, parseN(argv));
  const additionalContext = render(picked);
  markShown(state, picked, now);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
  }));
};

const cmdPreview = (argv) => {
  const now = parseNow(argv);
  const picked = select(loadTips(), loadState(), now, parseN(argv));
  const out = render(picked);
  process.stdout.write(out + '\n');
  process.stderr.write('\n[preview] ' + picked.length + ' tip(s), ' + out.length + ' chars, state NOT modified\n');
};

const setBox = (id, box) => {
  const tips = loadTips();
  if (!tips.some((t) => t.id === id)) throw new Error('no such tip: ' + id);
  const state = loadState();
  const e = entryFor(state, id);
  state.tips[id] = { ...e, box, lastShown: new Date().toISOString() };
  writeJsonAtomic(STATE_PATH, state);
  process.stdout.write(id + ' -> box ' + box + ' (next due in ' + INTERVAL_DAYS[box] + 'd)\n');
};

const cmdStatus = (argv) => {
  const now = parseNow(argv);
  const tips = loadTips();
  const state = loadState();
  const byTopic = {};
  for (const t of tips) (byTopic[t.topic] ??= []).push(t);
  const lines = [];
  for (const topic of Object.keys(byTopic).sort()) {
    lines.push('\n' + topic);
    for (const t of byTopic[topic]) {
      const e = entryFor(state, t.id);
      const od = overdueDays(t, state, now);
      const when = !e.lastShown ? 'never shown' : od >= 0 ? 'DUE (+' + od.toFixed(1) + 'd)' : 'in ' + (-od).toFixed(1) + 'd';
      lines.push('  box ' + e.box + '  x' + (e.shownCount ?? 0) + '  ' + when.padEnd(16) + ' ' + t.id);
    }
  }
  const seen = tips.filter((t) => entryFor(state, t.id).lastShown).length;
  process.stdout.write(tips.length + ' tips · ' + seen + ' seen · ' + (tips.length - seen) + ' unseen' + lines.join('\n') + '\n');
};

const cmdAdd = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) throw new Error('nothing on stdin; pipe a tip object or an array of them');
  const incoming = JSON.parse(raw);
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const tips = loadTips();
  const ids = new Set(tips.map((t) => t.id));
  for (const t of list) {
    for (const f of ['id', 'topic', 'title', 'body']) {
      if (!t[f]) throw new Error('tip missing required field "' + f + '": ' + JSON.stringify(t));
    }
    if (ids.has(t.id)) throw new Error('duplicate tip id: ' + t.id);
    ids.add(t.id);
    tips.push({ triggers: [], src: 'session-learning', ...t });
  }
  writeJsonAtomic(TIPS_PATH, tips);
  process.stdout.write('added ' + list.length + ' tip(s); bank now ' + tips.length + '\n');
};

const HELP = [
  'claude-code-coach',
  '  session [--now=ISO] [--n=3]   emit SessionStart JSON and advance state (hook entrypoint)',
  '  preview [--now=ISO] [--n=3]   same selection, printed plain, state untouched',
  '  know <id>                     user already does this -> box ' + MAX_BOX,
  '  again <id>                    user hit this problem -> box 1, resurfaces soon',
  '  status [--now=ISO]            per-tip box / due dates',
  '  add                           append tip JSON from stdin',
  '',
].join('\n');

const main = async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  const argv = [cmd, ...rest].filter(Boolean);
  switch (cmd) {
    case 'session': return cmdSession(argv);
    case 'preview': return cmdPreview(argv);
    case 'know': return setBox(rest[0], MAX_BOX);
    case 'again': return setBox(rest[0], 1);
    case 'status': return cmdStatus(argv);
    case 'add': return cmdAdd();
    default: process.stdout.write(HELP);
  }
};

try {
  await main();
} catch (err) {
  // A broken coach must never block a session start: stay silent, exit clean.
  if (process.argv[2] === 'session') process.exit(0);
  process.stderr.write('coach: ' + err.message + '\n');
  process.exit(1);
}
