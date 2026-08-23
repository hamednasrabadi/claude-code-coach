// Simulates N sessions across a timeline and asserts the spaced-repetition
// contract: nothing repeats inside its interval, new tips keep arriving, and
// old tips do circle back. Run: node test-schedule.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const STATE = join(DIR, 'state.json');
const BACKUP = join(DIR, 'state.json.testbak');
const INTERVAL_DAYS = [0, 0, 2, 6, 16, 45, 120];

// Sessions at day 0,1,2,3,5,8,12,20,30,45,70,110,200 — realistic-ish cadence.
const DAYS = [0, 1, 2, 3, 5, 8, 12, 20, 30, 45, 70, 110, 200];
const START = Date.parse('2026-09-01T09:00:00Z');
const iso = (d) => new Date(START + d * 86400000).toISOString();

if (existsSync(STATE)) renameSync(STATE, BACKUP);
const restore = () => {
  if (existsSync(STATE)) unlinkSync(STATE);
  if (existsSync(BACKUP)) renameSync(BACKUP, STATE);
};

const tips = JSON.parse(readFileSync(join(DIR, 'tips.json'), 'utf8'));
const byId = Object.fromEntries(tips.map((t) => [t.id, t]));
const failures = [];

// --- bank integrity: keeps a careless `coach.mjs add` from blowing the budget
const seenIds = new Set();
for (const t of tips) {
  for (const f of ['id', 'topic', 'title', 'body', 'triggers', 'src']) {
    if (!t[f] || (Array.isArray(t[f]) && !t[f].length)) failures.push(`${t.id ?? '?'}: missing ${f}`);
  }
  if (seenIds.has(t.id)) failures.push(`duplicate id: ${t.id}`);
  seenIds.add(t.id);
  if (t.body?.length > 180) failures.push(`${t.id}: body ${t.body.length} chars, cap is 180`);
  if (t.title?.length > 60) failures.push(`${t.id}: title ${t.title.length} chars, cap is 60`);
}
console.log(`bank: ${tips.length} tips, ${new Set(tips.map((t) => t.topic)).size} topics — integrity ${failures.length ? 'FAIL' : 'ok'}\n`);

const shownAt = {};   // id -> [day, ...]
const boxAt = {};     // id -> box it was in when shown
let ctxChars = [];

for (const day of DAYS) {
  const out = execFileSync('node', [join(DIR, 'coach.mjs'), 'session', `--now=${iso(day)}`], { encoding: 'utf8' });
  const ctx = JSON.parse(out).hookSpecificOutput.additionalContext;
  ctxChars.push(ctx.length);
  const ids = [...ctx.matchAll(/^\d+\. \(([a-z0-9-]+)\)/gm)].map((m) => m[1]);

  if (ids.length !== 3) failures.push(`day ${day}: got ${ids.length} tips, expected 3`);

  const topics = ids.map((id) => byId[id].topic);
  if (new Set(topics).size !== topics.length) {
    failures.push(`day ${day}: duplicate topic in one session -> ${topics.join(', ')}`);
  }

  for (const id of ids) {
    const prev = shownAt[id]?.at(-1);
    if (prev !== undefined) {
      const gap = day - prev;
      const required = INTERVAL_DAYS[boxAt[id]];
      if (gap < required) {
        failures.push(`day ${day}: ${id} repeated after ${gap}d but box ${boxAt[id]} requires ${required}d`);
      }
    }
    (shownAt[id] ??= []).push(day);
    boxAt[id] = Math.min((boxAt[id] ?? 1) + 1, 6);
  }
  console.log(`day ${String(day).padStart(3)}  ${ids.join(', ')}`);
}

const seen = Object.keys(shownAt).length;
const repeated = Object.values(shownAt).filter((a) => a.length > 1).length;
console.log(`\n${DAYS.length} sessions · ${seen}/${tips.length} distinct tips seen · ${repeated} circled back`);
console.log(`additionalContext: min ${Math.min(...ctxChars)} / max ${Math.max(...ctxChars)} chars`);

if (seen < 20) failures.push(`only ${seen} distinct tips over ${DAYS.length} sessions — bank is not being explored`);
if (repeated === 0) failures.push('no tip ever circled back — spaced repetition is not reviewing');
if (Math.max(...ctxChars) > 1700) failures.push(`context block hit ${Math.max(...ctxChars)} chars, over the 1700 budget`);

restore();

if (failures.length) {
  console.error(`\nFAIL (${failures.length}):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nPASS — spacing, topic diversity, coverage, review, and budget all hold.');
