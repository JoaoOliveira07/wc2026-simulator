#!/usr/bin/env node
/**
 * Patches missing data in public/data/:
 *   - Fetches Brazil (id + squad + coach) — was never in the original script
 *   - Fetches coaches for the 32 teams that were skipped when quota ran out
 *
 * Uses the same rate-limit delay as fetchData.mjs (7s between requests).
 * Expected API calls: ~35  (~4 minutes on free plan)
 *
 *   node scripts/patchMissing.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');
const OUT   = resolve(root, 'public/data');

// ── Config ───────────────────────────────────────────────────────────────────

const env = readFileSync(resolve(root, '.env'), 'utf8');
const KEY  = env.match(/VITE_AF_KEY=(.+)/)?.[1]?.trim();
if (!KEY) { console.error('VITE_AF_KEY not found in .env'); process.exit(1); }

const BASE    = 'https://v3.football.api-sports.io';
const HEADERS = { 'x-apisports-key': KEY };
const DELAY   = 7000; // 10 req/min on free plan

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));
let reqCount = 0;

async function apiFetch(path, retries = 3) {
  await sleep(DELAY);
  reqCount++;
  const res  = await fetch(`${BASE}${path}`, { headers: HEADERS });
  const json = await res.json();
  const remaining = res.headers.get('x-ratelimit-requests-remaining');
  const errs = json.errors;
  if (errs && Object.keys(errs).length > 0) {
    const msg = JSON.stringify(errs);
    if (msg.includes('rateLimit') && retries > 0) {
      process.stdout.write(' [rate-limit, waiting 65s…]');
      await sleep(65_000);
      return apiFetch(path, retries - 1);
    }
    throw new Error(msg);
  }
  if (!res.ok) throw new Error(String(res.status));
  if (remaining !== null) process.stdout.write(` [${remaining} req left]`);
  return json.response;
}

function load(file) {
  return JSON.parse(readFileSync(`${OUT}/${file}`, 'utf8'));
}

function save(file, data) {
  writeFileSync(`${OUT}/${file}`, JSON.stringify(data, null, 2));
}

// ── Load current state ────────────────────────────────────────────────────────

const squads  = load('squads.json');
const coaches = load('coaches.json');
const teams   = load('teams.json'); // [{ name, apiId }]

// Build id map: name → apiId
const idMap = Object.fromEntries(teams.map(t => [t.name, t.apiId]));

// ── Phase 1: Brazil (completely missing) ──────────────────────────────────────

if (!idMap['Brazil']) {
  console.log('\n[Brazil] Resolving team ID…');
  process.stdout.write('  Searching "Brazil"…');
  const rows = await apiFetch('/teams?name=Brazil');
  const team = rows.find(r => r.team.national) ?? rows[0];
  if (!team) { console.log(' NOT FOUND — check API key or team name'); }
  else {
    const id = team.team.id;
    idMap['Brazil'] = id;
    teams.push({ name: 'Brazil', apiId: id });
    save('teams.json', teams);
    console.log(` id=${id} (${team.team.name})`);

    process.stdout.write('  Fetching squad…');
    const squadRows = await apiFetch(`/players/squads?team=${id}`);
    squads['Brazil'] = squadRows[0]?.players ?? [];
    save('squads.json', squads);
    console.log(` ${squads['Brazil'].length} players`);

    process.stdout.write('  Fetching coach…');
    const coachRows = await apiFetch(`/coachs?team=${id}`);
    coaches['Brazil'] = coachRows[0] ?? null;
    save('coaches.json', coaches);
    console.log(` ${coaches['Brazil']?.name ?? 'not found'}`);
  }
} else {
  console.log('\n[Brazil] Already present — skipping');
}

// ── Phase 2: Missing coaches ──────────────────────────────────────────────────

const missingCoaches = Object.keys(coaches).filter(t => coaches[t] === null || coaches[t] === undefined);
// Also check teams with IDs but no entry in coaches at all
const allKnownTeams = Object.keys(idMap);
const noCoachEntry  = allKnownTeams.filter(t => !(t in coaches));
const toFetch = [...new Set([...missingCoaches, ...noCoachEntry])];

console.log(`\n[Coaches] ${toFetch.length} teams need a coach fetch`);

for (const teamName of toFetch) {
  const id = idMap[teamName];
  if (!id) { console.log(`  ${teamName}: no ID found, skipping`); continue; }
  process.stdout.write(`  ${teamName}…`);
  try {
    const rows = await apiFetch(`/coachs?team=${id}`);
    coaches[teamName] = rows[0] ?? null;
    save('coaches.json', coaches);
    console.log(` ${coaches[teamName]?.name ?? 'not found'}`);
  } catch (e) {
    console.log(` ERROR: ${e.message}`);
    if (e.message.includes('plan') || e.message.includes('limit')) {
      console.log('\nQuota reached. Re-run tomorrow to continue (already-fetched coaches are saved).');
      process.exit(0);
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

const finalMissing = Object.keys(coaches).filter(t => !coaches[t]);
console.log(`\nDone. ${reqCount} API requests used this run.`);
console.log(`Coaches still null: ${finalMissing.length > 0 ? finalMissing.join(', ') : 'none'}`);
console.log('Commit public/data/ to repo.\n');
