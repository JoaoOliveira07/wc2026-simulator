#!/usr/bin/env node
/**
 * Fetches squad + coach data for the 17 WC 2026 teams missing from
 * public/data/squads.json.  Uses /teams?name= search (avoids season-locked
 * league endpoint).  Saves progress after each team — re-run safely.
 *
 *   node scripts/fetchMissing2026.mjs
 *
 * Expected: ~51 API calls (~6 min, fits within 100 req/day free plan).
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');
const OUT   = resolve(root, 'public/data');

const env = readFileSync(resolve(root, '.env'), 'utf8');
const KEY = env.match(/VITE_AF_KEY=(.+)/)?.[1]?.trim();
if (!KEY) { console.error('VITE_AF_KEY missing in .env'); process.exit(1); }

const BASE    = 'https://v3.football.api-sports.io';
const HEADERS = { 'x-apisports-key': KEY };
const DELAY   = 7000;
const sleep   = ms => new Promise(r => setTimeout(r, ms));
let reqCount  = 0;

async function apiFetch(path) {
  await sleep(DELAY);
  reqCount++;
  const res  = await fetch(`${BASE}${path}`, { headers: HEADERS });
  const json = await res.json();
  const rem  = res.headers.get('x-ratelimit-requests-remaining');
  if (rem !== null) process.stdout.write(` [${rem} left]`);
  const errs = json.errors;
  if (errs && Object.keys(errs).length > 0) {
    const msg = JSON.stringify(errs);
    if (msg.includes('rateLimit')) {
      process.stdout.write(' [rate-limit, waiting 65s…]');
      await sleep(65_000);
      return apiFetch(path);
    }
    throw new Error(msg);
  }
  return json.response ?? [];
}

function load(f) { return JSON.parse(readFileSync(`${OUT}/${f}`, 'utf8')); }
function save(f, d) { writeFileSync(`${OUT}/${f}`, JSON.stringify(d, null, 2)); }

const squads  = load('squads.json');
const coaches = load('coaches.json');
const teams   = load('teams.json');  // [{ name, apiId }]
const idMap   = Object.fromEntries(teams.map(t => [t.name, t.apiId]));

// [displayName, apiSearchTerm, requireNational]
const MISSING = [
  ['South Korea',        'South Korea',         true],
  ['Czech Republic',     'Czech Republic',       true],
  ['Bosnia & Herzegovina', 'Bosnia',             true],
  ['Haiti',              'Haiti',                true],
  ['Scotland',           'Scotland',             true],
  ['Turkey',             'Turkey',               true],
  ['Curaçao',            'Curacao',              true],
  ['Ivory Coast',        "Cote d'Ivoire",        true],
  ['Sweden',             'Sweden',               true],
  ['Iran',               'Iran',                 true],
  ['Cape Verde',         'Cape Verde',           true],
  ['Iraq',               'Iraq',                 true],
  ['Norway',             'Norway',               true],
  ['Austria',            'Austria',              true],
  ['Jordan',             'Jordan',               true],
  ['DR Congo',           'DR Congo',             true],
  ['Uzbekistan',         'Uzbekistan',           true],
];

for (const [name, search, national] of MISSING) {
  if (squads[name]?.length > 0) {
    console.log(`✓ ${name} already fetched (${squads[name].length} players)`);
    continue;
  }

  console.log(`\n→ ${name}`);

  // Resolve team ID
  let apiId = idMap[name];
  if (!apiId) {
    process.stdout.write(`  Searching "${search}"…`);
    try {
      const rows = await apiFetch(`/teams?name=${encodeURIComponent(search)}`);
      const team = national
        ? (rows.find(r => r.team.national === true) ?? rows[0])
        : rows[0];
      if (!team) { console.log(' NOT FOUND — skipping'); continue; }
      apiId = team.team.id;
      idMap[name] = apiId;
      teams.push({ name, apiId });
      save('teams.json', teams);
      console.log(` id=${apiId} (${team.team.name})`);
    } catch (e) {
      console.log(` ERROR: ${e.message}`);
      if (e.message.includes('plan') || e.message.includes('limit')) {
        console.log('Quota reached. Re-run tomorrow.');
        process.exit(0);
      }
      continue;
    }
  } else {
    console.log(`  ID known: ${apiId}`);
  }

  // Fetch squad
  process.stdout.write(`  Fetching squad…`);
  try {
    const rows = await apiFetch(`/players/squads?team=${apiId}`);
    squads[name] = rows[0]?.players ?? [];
    save('squads.json', squads);
    console.log(` ${squads[name].length} players`);
  } catch (e) {
    console.log(` ERROR: ${e.message}`);
    if (e.message.includes('plan') || e.message.includes('limit')) { process.exit(0); }
  }

  // Fetch coach
  process.stdout.write(`  Fetching coach…`);
  try {
    const rows = await apiFetch(`/coachs?team=${apiId}`);
    coaches[name] = rows[0] ?? null;
    save('coaches.json', coaches);
    console.log(` ${coaches[name]?.name ?? 'not found'}`);
  } catch (e) {
    console.log(` ERROR: ${e.message}`);
    if (e.message.includes('plan') || e.message.includes('limit')) { process.exit(0); }
  }
}

console.log(`\nDone. ${reqCount} API calls used.`);
console.log('Commit public/data/ to repo.\n');
