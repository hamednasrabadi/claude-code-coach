#!/usr/bin/env node
// Installer for claude-code-coach.
//   node install.mjs              link the skill + register the SessionStart hook
//   node install.mjs --uninstall  reverse both
// Idempotent: running it twice changes nothing the second time.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, symlinkSync, lstatSync, realpathSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const SKILLS_DIR = join(CONFIG_DIR, 'skills');
const LINK = join(SKILLS_DIR, 'claude-code-coach');
const SETTINGS = join(CONFIG_DIR, 'settings.json');
// Forward slashes work in the hook command on every platform, Windows included.
const COMMAND = `node "${join(SKILL_DIR, 'coach.mjs').split('\\').join('/')}" session`;
const MATCHERS = ['startup', 'clear'];

const uninstalling = process.argv.includes('--uninstall');
const say = (icon, msg) => console.log(`  ${icon} ${msg}`);
const samePath = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase();

// --------------------------------------------------------------- the symlink

const linkTarget = () => {
  try { return existsSync(LINK) || lstatSync(LINK) ? realpathSync(LINK) : null; } catch { return null; }
};

const linkSkill = () => {
  mkdirSync(SKILLS_DIR, { recursive: true });
  if (existsSync(LINK)) {
    const current = linkTarget();
    if (current && samePath(current, SKILL_DIR)) return say('=', 'skill already linked');
    throw new Error(`${LINK} already exists and points elsewhere (${current}). Remove it first.`);
  }
  // 'junction' on Windows needs no admin rights; 'dir' elsewhere.
  symlinkSync(SKILL_DIR, LINK, process.platform === 'win32' ? 'junction' : 'dir');
  say('+', `linked ${LINK}`);
};

const unlinkSkill = () => {
  if (!existsSync(LINK)) return say('=', 'skill was not linked');
  const current = linkTarget();
  if (current && !samePath(current, SKILL_DIR)) {
    return say('!', `left ${LINK} alone — it points at ${current}, not this repo`);
  }
  rmSync(LINK, { recursive: true, force: true });
  say('-', `unlinked ${LINK}`);
};

// ----------------------------------------------------------------- the hook

const readSettings = () => (existsSync(SETTINGS) ? JSON.parse(readFileSync(SETTINGS, 'utf8')) : {});

const writeSettings = (settings) => {
  if (existsSync(SETTINGS)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backups = join(CONFIG_DIR, 'backups');
    mkdirSync(backups, { recursive: true });
    const backup = join(backups, `settings.json.${stamp}`);
    copyFileSync(SETTINGS, backup);
    say('~', `backed up settings to ${backup}`);
  }
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
};

const isOurs = (entry) => entry?.hooks?.some((h) => h.command === COMMAND);

const addHook = () => {
  const settings = readSettings();
  const existing = settings.hooks?.SessionStart ?? [];
  const missing = MATCHERS.filter((m) => !existing.some((e) => e.matcher === m && isOurs(e)));
  if (!missing.length) return say('=', 'SessionStart hook already registered');

  settings.hooks ??= {};
  settings.hooks.SessionStart = [
    ...existing,
    ...missing.map((matcher) => ({ matcher, hooks: [{ type: 'command', command: COMMAND }] })),
  ];
  writeSettings(settings);
  say('+', `registered SessionStart hook for: ${missing.join(', ')}`);
};

const removeHook = () => {
  const settings = readSettings();
  const existing = settings.hooks?.SessionStart;
  if (!existing) return say('=', 'no SessionStart hook to remove');

  const kept = existing.filter((e) => !isOurs(e));
  if (kept.length === existing.length) return say('=', 'SessionStart hook was not ours');

  if (kept.length) settings.hooks.SessionStart = kept;
  else delete settings.hooks.SessionStart;
  if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;

  writeSettings(settings);
  say('-', 'removed the SessionStart hook (other hooks left untouched)');
};

// ------------------------------------------------------------------- verify

const verify = () => {
  // The smoke test runs a real session, which advances the schedule. Snapshot
  // first and put it back after, so re-running the installer never costs a
  // long-time user their progress.
  const statePath = join(SKILL_DIR, 'state.json');
  const before = existsSync(statePath) ? readFileSync(statePath, 'utf8') : null;

  const out = execFileSync('node', [join(SKILL_DIR, 'coach.mjs'), 'session'], { encoding: 'utf8' });
  const ctx = JSON.parse(out).hookSpecificOutput.additionalContext;
  say('✓', `hook output parses — ${ctx.length} chars (~${Math.round(ctx.length / 4)} tokens per session)`);

  writeFileSync(statePath, before ?? JSON.stringify({ version: 1, tips: {} }, null, 2) + '\n');
  const seen = Object.keys(JSON.parse(readFileSync(statePath, 'utf8')).tips).length;
  say('✓', seen ? `progress preserved — ${seen} tip(s) already in rotation` : 'starting the curriculum from tip one');
};

// --------------------------------------------------------------------- main

try {
  if (uninstalling) {
    console.log('\nUninstalling claude-code-coach\n');
    unlinkSkill();
    removeHook();
    console.log('\nDone. Your settings backup is in ' + join(CONFIG_DIR, 'backups') + '\n');
  } else {
    console.log('\nInstalling claude-code-coach\n');
    linkSkill();
    addHook();
    verify();
    console.log('\nDone. Start a new session (or /clear) and the coach is live.\n');
  }
} catch (err) {
  console.error(`\nInstall failed: ${err.message}\n`);
  process.exit(1);
}
