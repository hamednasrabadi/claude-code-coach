#!/usr/bin/env node
// Crumb bank tooling. crumbs.json is the source of truth; Claude Code reads the
// generated try-tips.json through the spinnerTipsOverride setting.
//   node crumbs.mjs build   regenerate try-tips.json, record new ids in crumbs.lock
//   node crumbs.mjs list    print every crumb as it appears in the spinner

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
export const CRUMBS_PATH = join(DIR, 'crumbs.json');
export const TIPS_PATH = join(DIR, 'try-tips.json');
export const LOCK_PATH = join(DIR, 'crumbs.lock');

// Claude Code shows a tip again only after this many sessions.
export const COOLDOWN_SESSIONS = 3;
// Basics surface first: priority orders tips that have gone unshown equally long.
export const PRIORITY_BY_LEVEL = { 1: 2, 2: 0, 3: -2 };

export const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
export const hashText = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

// Only documented tip fields go into the file Claude Code reads: an entry it
// considers invalid is dropped silently, so metadata stays in crumbs.json.
export const toTips = (crumbs) => crumbs.map((c) => ({
  id: c.id,
  text: c.text,
  cooldownSessions: COOLDOWN_SESSIONS,
  priority: PRIORITY_BY_LEVEL[c.level],
}));

export const serialize = (value) => JSON.stringify(value, null, 2) + '\n';

const build = () => {
  const crumbs = readJson(CRUMBS_PATH, null);
  if (!Array.isArray(crumbs)) throw new Error('crumbs.json missing or not an array');
  writeFileSync(TIPS_PATH, serialize(toTips(crumbs)));

  // The lock only grows: an existing id keeps its original hash, so editing a
  // crumb's text in place makes the test suite fail instead of slipping through.
  const lock = readJson(LOCK_PATH, {});
  let added = 0;
  for (const c of crumbs) {
    if (!(c.id in lock)) { lock[c.id] = hashText(c.text); added++; }
  }
  writeFileSync(LOCK_PATH, serialize(lock));
  console.log(`wrote ${crumbs.length} crumbs to try-tips.json; ${added} new id(s) locked`);
};

const list = () => {
  for (const c of readJson(CRUMBS_PATH, [])) console.log(`Try: ${c.text}`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === 'build') build();
  else if (cmd === 'list') list();
  else console.log('usage: node crumbs.mjs build | list');
}
