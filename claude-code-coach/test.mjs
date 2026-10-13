// Bank integrity and installer behavior. Run: node test.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CRUMBS_PATH, TIPS_PATH, LOCK_PATH, readJson, hashText, toTips } from './crumbs.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const FIELDS = ['id', 'text', 'topic', 'format', 'level', 'surface', 'src'];
const FORMATS = ['command', 'key', 'when', 'goal', 'fact', 'question'];
const MIN_LEN = 70;
const MAX_LEN = 110;
const MAX_TIPS = 200; // Claude Code reads at most 200 tips

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

// ------------------------------------------------------------------ the bank

const crumbs = readJson(CRUMBS_PATH, []);
const lock = readJson(LOCK_PATH, {});
const ids = new Set();

check(crumbs.length > 0 && crumbs.length <= MAX_TIPS, `bank has ${crumbs.length} crumbs, must be 1..${MAX_TIPS}`);
for (const c of crumbs) {
  for (const f of FIELDS) check(c[f] !== undefined && c[f] !== '', `${c.id ?? '?'}: missing ${f}`);
  check(!ids.has(c.id), `duplicate id: ${c.id}`);
  ids.add(c.id);
  check(/^[A-Za-z0-9._-]{1,64}$/.test(c.id), `${c.id}: id must be 1-64 letters, digits, . _ -`);
  check(c.text.length >= MIN_LEN && c.text.length <= MAX_LEN, `${c.id}: ${c.text.length} chars, must be ${MIN_LEN}-${MAX_LEN}`);
  check(!/\n/.test(c.text), `${c.id}: text must be one line`);
  check(FORMATS.includes(c.format), `${c.id}: unknown format ${c.format}`);
  check([1, 2, 3].includes(c.level), `${c.id}: level must be 1, 2, or 3`);
  check(['terminal', 'app', 'both'].includes(c.surface), `${c.id}: unknown surface ${c.surface}`);
  // Fixed text rule: a shown crumb is recognized by its wording, so an id's
  // text never changes. Reword a crumb by giving it a new id.
  check(lock[c.id] === hashText(c.text), `${c.id}: text differs from crumbs.lock; give reworded crumbs a new id, then run node crumbs.mjs build`);
}
const questions = crumbs.filter((c) => c.format === 'question').length;
check(questions <= crumbs.length / 8, `${questions} question crumbs, at most one in eight allowed`);

// Parsed comparison, so CRLF checkouts on Windows don't fail it.
check(JSON.stringify(readJson(TIPS_PATH, null)) === JSON.stringify(toTips(crumbs)), 'try-tips.json is stale; run node crumbs.mjs build');

console.log(`bank: ${crumbs.length} crumbs, ${questions} questions, ${failures.length ? 'FAIL' : 'ok'}`);

// ------------------------------------------------------------- the installer

const failuresBefore = failures.length;
const cfg = mkdtempSync(join(tmpdir(), 'coach-test-'));
const settingsPath = join(cfg, 'settings.json');
const tipsFile = TIPS_PATH.split('\\').join('/');
const run = (...args) => execFileSync('node', [join(DIR, 'install.mjs'), ...args], {
  encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: cfg }, stdio: ['ignore', 'pipe', 'pipe'],
});
const settings = () => JSON.parse(readFileSync(settingsPath, 'utf8'));
const backups = () => (existsSync(join(cfg, 'backups')) ? readdirSync(join(cfg, 'backups')).length : 0);

try {
  // Existing settings with an unrelated key, a user tip, and the v1 hook.
  writeFileSync(settingsPath, JSON.stringify({
    theme: 'dark',
    spinnerTipsOverride: { tips: ['my own tip'] },
    hooks: { SessionStart: [
      { matcher: 'startup', hooks: [{ type: 'command', command: `node "${DIR.split('\\').join('/')}/coach.mjs" session` }] },
      { matcher: 'startup', hooks: [{ type: 'command', command: 'echo other' }] },
    ] },
  }));

  run();
  let s = settings();
  check(s.theme === 'dark', 'install: unrelated setting lost');
  check(s.spinnerTipsOverride?.label === 'Try', 'install: label not set');
  check(s.spinnerTipsOverride?.tipsFile === tipsFile, 'install: tipsFile not set');
  check(s.spinnerTipsOverride?.tips?.[0] === 'my own tip', 'install: user tip lost');
  check(s.hooks?.SessionStart?.length === 1 && s.hooks.SessionStart[0].hooks[0].command === 'echo other', 'install: v1 hook not removed cleanly');
  check(existsSync(join(cfg, 'skills', 'claude-code-coach', 'crumbs.json')), 'install: skill not linked');
  check(backups() === 1, `install: expected 1 backup, found ${backups()}`);

  run();
  check(backups() === 1, 'reinstall: settings rewritten although nothing changed');

  run('--uninstall');
  s = settings();
  check(s.spinnerTipsOverride?.tips?.[0] === 'my own tip' && !s.spinnerTipsOverride.tipsFile && !s.spinnerTipsOverride.label, 'uninstall: did not leave only the user tip');
  check(s.hooks?.SessionStart?.length === 1, 'uninstall: removed a hook that was not ours');
  check(!existsSync(join(cfg, 'skills', 'claude-code-coach')), 'uninstall: skill still linked');

  // A tipsFile someone else owns is never overwritten.
  writeFileSync(settingsPath, JSON.stringify({ spinnerTipsOverride: { tipsFile: '/elsewhere/tips.json' } }));
  let refused = false;
  try { run(); } catch { refused = true; }
  check(refused && settings().spinnerTipsOverride.tipsFile === '/elsewhere/tips.json', 'install: overwrote a foreign tipsFile');

  // Fresh machine: no settings file at all, then a clean uninstall leaves nothing of ours.
  rmSync(settingsPath);
  run();
  check(settings().spinnerTipsOverride?.tipsFile === tipsFile, 'fresh install: tipsFile not set');
  run('--uninstall');
  check(!('spinnerTipsOverride' in settings()), 'fresh uninstall: left spinnerTipsOverride behind');
} catch (err) {
  failures.push('installer crashed: ' + (err.stderr || err.message));
} finally {
  rmSync(cfg, { recursive: true, force: true });
}

console.log(`installer: ${failures.length > failuresBefore ? 'FAIL' : 'ok'}`);

if (failures.length) {
  console.log('\n' + failures.map((f) => '  x ' + f).join('\n'));
  process.exit(1);
}
console.log('\nall checks passed');
