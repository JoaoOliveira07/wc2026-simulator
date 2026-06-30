#!/usr/bin/env node
/**
 * Pre-fetches all WC 2026 squad + coach data from API-Football and writes
 * static JSON to public/data/.  Run once; commit the files.
 *
 *   node scripts/fetchData.mjs
 *
 * The script saves progress to scripts/.progress.json and resumes if
 * interrupted (useful when hitting the 100 req/day free-tier limit).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');
const OUT   = resolve(root, 'public/data');
const PROG  = resolve(__dir, '.progress.json');

mkdirSync(OUT, { recursive: true });

// ── Config ───────────────────────────────────────────────────────────────────

const env = readFileSync(resolve(root, '.env'), 'utf8');
const KEY = env.match(/VITE_AF_KEY=(.+)/)?.[1]?.trim();
if (!KEY) { console.error('VITE_AF_KEY not found in .env'); process.exit(1); }

const BASE    = 'https://v3.football.api-sports.io';
const HEADERS = { 'x-apisports-key': KEY };
const DELAY   = 7000; // ms between requests (free plan = 10 req/min)

// WC 2026 teams (from openfootball) + override search terms for API-Football
// Format: [openfootballName, apiFootballSearchTerm (omit if same)]
const TEAMS = [
  ['Canada'],['Mexico'],['United States','USA'],
  ['Argentina'],['Chile'],['Colombia'],['Ecuador'],['Paraguay'],['Peru'],['Uruguay'],['Venezuela'],['Bolivia'],
  ['Costa Rica'],['El Salvador'],['Guatemala'],['Honduras'],['Jamaica'],['Panama'],['Trinidad and Tobago'],
  ['Morocco'],['Cameroon'],['Egypt'],['Ghana'],['Nigeria'],['Senegal'],['South Africa'],['Algeria'],['Tunisia'],
  ['Iran'],['Japan'],['Korea Republic','South Korea'],['Saudi Arabia'],['Australia'],['Indonesia'],['Qatar'],
  ['Germany'],['England'],['France'],['Italy'],['Netherlands'],['Portugal'],['Spain'],['Croatia'],['Belgium'],
  ['Serbia'],['Switzerland'],['Ukraine'],['New Zealand'],
];

const delay = ms => new Promise(r => setTimeout(r, ms));
let reqCount = 0;

async function get(path, retries = 3) {
  await delay(DELAY);
  reqCount++;
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  const remaining = res.headers.get('x-ratelimit-requests-remaining');
  const json = await res.json();
  const errs = json.errors;
  if (errs && Object.keys(errs).length > 0) {
    const msg = JSON.stringify(errs);
    if (msg.includes('rateLimit') && retries > 0) {
      process.stdout.write(' [rate-limit, waiting 65s...]');
      await delay(65000);
      return get(path, retries - 1);
    }
    throw new Error(msg);
  }
  if (!res.ok) throw new Error(String(res.status));
  process.stdout.write(` [${remaining ?? '?'} left]`);
  return json.response;
}

// ── Progress ─────────────────────────────────────────────────────────────────

function loadProgress() {
  if (!existsSync(PROG)) return { ids: {}, squads: {}, coaches: {} };
  try { return JSON.parse(readFileSync(PROG, 'utf8')); }
  catch { return { ids: {}, squads: {}, coaches: {} }; }
}
function saveProgress(p) { writeFileSync(PROG, JSON.stringify(p, null, 2)); }

// ── Main ─────────────────────────────────────────────────────────────────────

const prog = loadProgress();

// ── Phase 1: Resolve team IDs ────────────────────────────────────────────────
console.log('\n[Phase 1] Resolving team IDs via name search...');
for (const [ofName, searchName = ofName] of TEAMS) {
  if (prog.ids[ofName]) { process.stdout.write(`  ${ofName}: cached (${prog.ids[ofName]})\n`); continue; }
  process.stdout.write(`  ${ofName}...`);
  try {
    const rows = await get(`/teams?name=${encodeURIComponent(searchName)}`);
    // Prefer national team (country === team name)
    const team = rows.find(r => r.team.national) ?? rows[0];
    if (team) {
      prog.ids[ofName] = team.team.id;
      saveProgress(prog);
      console.log(` id=${team.team.id} (${team.team.name})`);
    } else {
      console.log(' NOT FOUND');
    }
  } catch (e) {
    console.log(` ERROR: ${e.message}`);
    if (e.message.includes('plan') || e.message.includes('limit')) {
      console.log('\nRequest limit reached. Run again tomorrow to continue.');
      flush(prog);
      process.exit(0);
    }
  }
}

// ── Phase 2: Squads ──────────────────────────────────────────────────────────
console.log('\n[Phase 2] Fetching squads...');
for (const [ofName] of TEAMS) {
  const teamId = prog.ids[ofName];
  if (!teamId) { console.log(`  ${ofName}: no ID, skipping`); continue; }
  if (prog.squads[ofName]) { console.log(`  ${ofName}: cached`); continue; }
  process.stdout.write(`  ${ofName}...`);
  try {
    const rows = await get(`/players/squads?team=${teamId}`);
    prog.squads[ofName] = rows[0]?.players ?? [];
    saveProgress(prog);
    console.log(` ${prog.squads[ofName].length} players`);
  } catch (e) {
    console.log(` ERROR: ${e.message}`);
    if (e.message.includes('plan') || e.message.includes('limit')) {
      console.log('\nRequest limit reached. Run again tomorrow to continue.');
      flush(prog);
      process.exit(0);
    }
  }
}

// ── Phase 3: Coaches ─────────────────────────────────────────────────────────
console.log('\n[Phase 3] Fetching coaches...');
for (const [ofName] of TEAMS) {
  const teamId = prog.ids[ofName];
  if (!teamId) { console.log(`  ${ofName}: no ID, skipping`); continue; }
  if (prog.coaches[ofName] !== undefined) { console.log(`  ${ofName}: cached`); continue; }
  process.stdout.write(`  ${ofName}...`);
  try {
    const rows = await get(`/coachs?team=${teamId}`);
    prog.coaches[ofName] = rows[0] ?? null;
    saveProgress(prog);
    console.log(` ${prog.coaches[ofName]?.name ?? 'not found'}`);
  } catch (e) {
    console.log(` ERROR: ${e.message}`);
    if (e.message.includes('plan') || e.message.includes('limit')) {
      console.log('\nRequest limit reached. Run again tomorrow to continue.');
      flush(prog);
      process.exit(0);
    }
  }
}

// ── Write final files ────────────────────────────────────────────────────────
function flush(p) {
  if (Object.keys(p.squads).length)  writeFileSync(`${OUT}/squads.json`,  JSON.stringify(p.squads,  null, 2));
  if (Object.keys(p.coaches).length) writeFileSync(`${OUT}/coaches.json`, JSON.stringify(p.coaches, null, 2));
  const teamsList = TEAMS
    .filter(([n]) => p.ids[n])
    .map(([n]) => ({ name: n, apiId: p.ids[n] }));
  if (teamsList.length) writeFileSync(`${OUT}/teams.json`, JSON.stringify(teamsList, null, 2));
}

flush(prog);
console.log(`\nDone. Used ${reqCount} requests this run.`);
console.log('Commit public/data/ to repo — zero API calls at runtime.\n');
