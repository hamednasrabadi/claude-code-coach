#!/usr/bin/env node
// Installer for claude-code-coach.
//   node install.mjs              link the skill + point Claude Code's spinner tips at the crumbs
//   node install.mjs --uninstall  reverse both
// Idempotent: running it twice changes nothing the second time.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, symlinkSync, lstatSync, realpathSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const SKILLS_DIR = join(CONFIG_DIR, 'skills');
const LINK = join(SKILLS_DIR, 'claude-code-coach');
const SETTINGS = join(CONFIG_DIR, 'settings.json');
// Forward slashes work in settings paths on every platform, Windows included.
const TIPS_FILE = join(SKILL_DIR, 'try-tips.json').split('\\').join('/');
const LABEL = 'Try';
const MIN_VERSION = [2, 1, 247]; // first release that reads tipsFile and label

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
    return say('!', `left ${LINK} alone, it points at ${current}, not this repo`);
  }
  rmSync(LINK, { recursive: true, force: true });
  say('-', `unlinked ${LINK}`);
};

// ------------------------------------------------------------- the settings

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

const isOurTipsFile = (p) => typeof p === 'string' && samePath(p, TIPS_FILE);

// The first version registered a SessionStart hook running coach.mjs. It is
// gone now; strip any entry that still calls it so it can't error at startup.
const isLegacyHook = (h) => typeof h?.command === 'string' && /claude-code-coach\/coach\.mjs"? session/.test(h.command.split('\\').join('/'));

const dropLegacyHooks = (settings) => {
  const entries = settings.hooks?.SessionStart;
  if (!entries) return false;
  const kept = entries
    .map((e) => ({ ...e, hooks: (e.hooks ?? []).filter((h) => !isLegacyHook(h)) }))
    .filter((e) => e.hooks.length);
  const removed = entries.reduce((n, e) => n + (e.hooks?.length ?? 0), 0) - kept.reduce((n, e) => n + e.hooks.length, 0);
  if (!removed) return false;
  if (kept.length) settings.hooks.SessionStart = kept;
  else delete settings.hooks.SessionStart;
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
  say('-', `removed ${removed} SessionStart hook entr${removed === 1 ? 'y' : 'ies'} left by the previous version`);
  return true;
};

const configure = () => {
  const settings = readSettings();
  let changed = dropLegacyHooks(settings);

  const override = settings.spinnerTipsOverride ?? {};
  if (override.tipsFile && !isOurTipsFile(override.tipsFile)) {
    throw new Error(`spinnerTipsOverride.tipsFile already points at ${override.tipsFile}. Claude Code reads one tips file; remove that one first.`);
  }
  if (isOurTipsFile(override.tipsFile) && override.label === LABEL) {
    say('=', 'spinner tips already point at the crumbs');
  } else {
    // Keep any inline tips the user already has; only our two fields change.
    settings.spinnerTipsOverride = { ...override, label: LABEL, tipsFile: TIPS_FILE };
    say('+', `spinner tips now read ${TIPS_FILE}`);
    changed = true;
  }

  if (changed) writeSettings(settings);
  if (settings.spinnerTipsEnabled === false) {
    say('!', 'spinnerTipsEnabled is false in your settings, so no tips will show. Turn on "Show tips" in /config.');
  }
};

const unconfigure = () => {
  const settings = readSettings();
  let changed = dropLegacyHooks(settings);

  const override = settings.spinnerTipsOverride;
  if (override && isOurTipsFile(override.tipsFile)) {
    const { tipsFile, label, ...rest } = override;
    if (Object.keys(rest).length) settings.spinnerTipsOverride = rest;
    else delete settings.spinnerTipsOverride;
    say('-', 'spinner tips no longer read the crumbs (your other tip settings left untouched)');
    changed = true;
  } else {
    say('=', 'spinner tips were not pointing at the crumbs');
  }

  if (changed) writeSettings(settings);
};

// ------------------------------------------------------------------- verify

const claudeVersion = () => {
  try {
    const out = execSync('claude --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(/(\d+)\.(\d+)\.(\d+)/);
    return m ? m.slice(1, 4).map(Number) : null;
  } catch {
    return null;
  }
};

const atLeast = (v, min) => {
  for (let i = 0; i < 3; i++) if (v[i] !== min[i]) return v[i] > min[i];
  return true;
};

const verify = () => {
  const tips = JSON.parse(readFileSync(TIPS_FILE, 'utf8'));
  const valid = Array.isArray(tips) && tips.length && tips.every((t) => t.id && t.text && !t.text.includes('\n'));
  if (!valid) throw new Error('try-tips.json is invalid; run node crumbs.mjs build');
  say('✓', `${tips.length} crumbs ready`);

  const v = claudeVersion();
  if (!v) say('!', `could not run "claude --version"; crumbs need Claude Code ${MIN_VERSION.join('.')} or later`);
  else if (!atLeast(v, MIN_VERSION)) say('!', `Claude Code ${v.join('.')} is too old for crumbs; run "claude update" to get ${MIN_VERSION.join('.')} or later`);
  else say('✓', `Claude Code ${v.join('.')} supports crumbs`);
};

// --------------------------------------------------------------------- main

try {
  if (uninstalling) {
    console.log('\nUninstalling claude-code-coach\n');
    unlinkSkill();
    unconfigure();
    console.log('\nDone. Your settings backup is in ' + join(CONFIG_DIR, 'backups') + '\n');
  } else {
    console.log('\nInstalling claude-code-coach\n');
    linkSkill();
    configure();
    verify();
    console.log('\nDone. Start a new Claude Code session; crumbs appear under the spinner while Claude works.\n');
  }
} catch (err) {
  console.error(`\n${uninstalling ? 'Uninstall' : 'Install'} failed: ${err.message}\n`);
  process.exit(1);
}
