// Data strategy:
// 1. Read from /public/data/*.json (static, committed to repo, zero API calls)
// 2. Fall back to live API-Football calls + localStorage cache if static file missing
//
// To refresh static data:  node scripts/fetchData.mjs

import type { AFCoach, AFLineup, AFPlayer, AFTopScorer } from './apiFootballTypes';
export type { AFCoach, AFLineup, AFPlayer, AFTopScorer };

// ── Static JSON loader ────────────────────────────────────────────────────────

async function loadStatic<T>(file: string): Promise<T | null> {
  try {
    const res = await fetch(`/data/${file}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
}

// Cached in module scope (only fetched once per session)
let staticSquads: Record<string, AFPlayer[]> | null = null;
let staticCoaches: Record<string, AFCoach | null> | null = null;
let staticLineups: Record<string, AFLineup | null> | null = null;
let staticTeams: Array<{ apiId: number; name: string }> | null = null;

async function getStaticSquads() {
  if (!staticSquads) staticSquads = await loadStatic<Record<string, AFPlayer[]>>('squads.json');
  return staticSquads;
}
async function getStaticCoaches() {
  if (!staticCoaches) staticCoaches = await loadStatic<Record<string, AFCoach | null>>('coaches.json');
  return staticCoaches;
}
async function getStaticLineups() {
  if (!staticLineups) staticLineups = await loadStatic<Record<string, AFLineup | null>>('lineups.json');
  return staticLineups;
}
async function getStaticTeams() {
  if (!staticTeams) staticTeams = await loadStatic<Array<{ apiId: number; name: string }>>('teams.json');
  return staticTeams;
}

// ── Live API fallback ─────────────────────────────────────────────────────────

const KEY = import.meta.env.VITE_AF_KEY as string;
const BASE = 'https://v3.football.api-sports.io';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (static data changes rarely)

function cacheGet<T>(key: string, ttl = TTL): T | null {
  try {
    const raw = localStorage.getItem(`af:${key}`);
    if (!raw) return null;
    const { d, t } = JSON.parse(raw);
    if (Date.now() - t > ttl) { localStorage.removeItem(`af:${key}`); return null; }
    return d as T;
  } catch { return null; }
}
function cacheSet<T>(key: string, d: T): void {
  try { localStorage.setItem(`af:${key}`, JSON.stringify({ d, t: Date.now() })); } catch {}
}

async function apiFetch<T>(path: string): Promise<T[]> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY } });
  const json = await res.json();
  if (!res.ok) throw new Error(String(res.status));
  return json.response as T[];
}

// Overrides: openfootball name → API-Football name
const OVERRIDES: Record<string, string> = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'IR Iran': 'Iran',
  'Curaçao': 'Curacao',
  'Congo DR': 'DR Congo',
};

// Fuzzy name lookup within a static/live teams list
function findTeamName(haystack: string[], needle: string): string | undefined {
  const q = (OVERRIDES[needle] ?? needle).toLowerCase();
  return (
    haystack.find(n => n.toLowerCase() === q) ??
    haystack.find(n => n.toLowerCase().includes(q) || q.includes(n.toLowerCase()))
  );
}

async function resolveTeamId(teamName: string): Promise<number | null> {
  // Try static teams list first (no API call)
  const staticT = await getStaticTeams();
  if (staticT) {
    const q = (OVERRIDES[teamName] ?? teamName).toLowerCase();
    const t =
      staticT.find(x => x.name.toLowerCase() === q) ??
      staticT.find(x => x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase()));
    if (t) return t.apiId;
  }

  // Live fallback: fetch WC teams
  const ck = 'wc_teams';
  let teams = cacheGet<Array<{ id: number; name: string }>>(ck);
  if (!teams) {
    const rows = await apiFetch<{ team: { id: number; name: string } }>('/teams?league=1&season=2026');
    teams = rows.map(r => ({ id: r.team.id, name: r.team.name }));
    cacheSet(ck, teams);
  }
  const q = (OVERRIDES[teamName] ?? teamName).toLowerCase();
  const t =
    teams.find(x => x.name.toLowerCase() === q) ??
    teams.find(x => x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase()));
  return t?.id ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchSquad(teamName: string): Promise<AFPlayer[]> {
  // 1. Static file
  const squads = await getStaticSquads();
  if (squads) {
    const key = findTeamName(Object.keys(squads), teamName);
    if (key && squads[key]?.length) return squads[key]!;
  }

  // 2. localStorage cache
  const ck = `squad:${teamName}`;
  const cached = cacheGet<AFPlayer[]>(ck);
  if (cached) return cached;

  // 3. Live API
  const teamId = await resolveTeamId(teamName);
  if (!teamId) return [];
  const rows = await apiFetch<{ team: object; players: AFPlayer[] }>(`/players/squads?team=${teamId}`);
  const players = rows[0]?.players ?? [];
  cacheSet(ck, players);
  return players;
}

export async function fetchCoach(teamName: string): Promise<AFCoach | null> {
  // 1. Static file
  const coaches = await getStaticCoaches();
  if (coaches) {
    const key = findTeamName(Object.keys(coaches), teamName);
    if (key && coaches[key] != null) return coaches[key]!;
  }

  // 2. localStorage cache
  const ck = `coach:${teamName}`;
  const cached = cacheGet<AFCoach>(ck);
  if (cached) return cached;

  // 3. Live API
  const teamId = await resolveTeamId(teamName);
  if (!teamId) return null;
  const rows = await apiFetch<AFCoach>(`/coachs?team=${teamId}`);
  const coach = rows[0] ?? null;
  if (coach) cacheSet(ck, coach);
  return coach;
}

export async function fetchLastLineup(teamName: string): Promise<AFLineup | null> {
  // 1. Static file
  const lineups = await getStaticLineups();
  if (lineups) {
    const key = findTeamName(Object.keys(lineups), teamName);
    if (key && lineups[key] != null) return lineups[key]!;
  }

  // 2. localStorage cache
  const ck = `lineup:${teamName}`;
  const cached = cacheGet<AFLineup>(ck);
  if (cached) return cached;

  // 3. Live API
  const teamId = await resolveTeamId(teamName);
  if (!teamId) return null;
  type Fixture = { fixture: { id: number; status: { short: string } } };
  const fixtures = await apiFetch<Fixture>(`/fixtures?team=${teamId}&league=1&season=2026`);
  const played = fixtures.filter(f => ['FT', 'AET', 'PEN'].includes(f.fixture.status.short));
  if (!played.length) return null;
  const fixtureId = played.at(-1)!.fixture.id;
  type RawLU = { team: { id: number }; formation: string; startXI: AFLineup['startXI']; substitutes: AFLineup['substitutes'] };
  const lus = await apiFetch<RawLU>(`/fixtures/lineups?fixture=${fixtureId}`);
  const mine = lus.find(l => l.team.id === teamId);
  if (!mine) return null;
  const result: AFLineup = { formation: mine.formation, startXI: mine.startXI, substitutes: mine.substitutes };
  cacheSet(ck, result);
  return result;
}

const TTL_HOUR = 60 * 60 * 1000;

export async function fetchTopScorers(): Promise<AFTopScorer[]> {
  const ck = 'topscorers:2026';
  const cached = cacheGet<AFTopScorer[]>(ck, TTL_HOUR);
  if (cached) return cached;
  const rows = await apiFetch<AFTopScorer>('/players/topscorers?league=1&season=2026');
  cacheSet(ck, rows);
  return rows;
}
