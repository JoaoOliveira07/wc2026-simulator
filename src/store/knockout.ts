import type { Match } from '../types';
import { type ESPNMatch, teamsMatch } from '../data/espnApi';

export type UserScores = Record<number, [number, number]>;

function findESPNFor(m: Match, espnAll: ESPNMatch[]): ESPNMatch | null {
  if (!espnAll.length) return null;
  return espnAll.find(e =>
    (teamsMatch(e.home.name, m.team1) && teamsMatch(e.away.name, m.team2)) ||
    (teamsMatch(e.home.name, m.team2) && teamsMatch(e.away.name, m.team1))
  ) ?? null;
}

function getScoreFromESPN(m: Match, espnAll: ESPNMatch[]): [number, number] | null {
  const e = findESPNFor(m, espnAll);
  if (!e || (e.status !== 'final' && e.status !== 'live' && e.status !== 'halftime')) return null;
  if (e.home.score == null || e.away.score == null) return null;
  return [Number(e.home.score) || 0, Number(e.away.score) || 0];
}

export function getWinner(
  num: number,
  byNum: Record<number, Match>,
  us: UserScores,
  espnAll: ESPNMatch[] = [],
): string | null {
  const m = byNum[num];
  if (!m) return null;

  // Official scores from JSON
  if (m.score?.p) return m.score.p[0] > m.score.p[1] ? m.team1 : m.team2;
  if (m.score?.et && m.score.et[0] !== m.score.et[1])
    return m.score.et[0] > m.score.et[1] ? m.team1 : m.team2;
  if (m.score?.ft && m.score.ft[0] !== m.score.ft[1])
    return m.score.ft[0] > m.score.ft[1] ? m.team1 : m.team2;

  // Fallback: ESPN scores (JSON may not be updated yet)
  const espnScore = getScoreFromESPN(m, espnAll);
  if (espnScore && espnScore[0] !== espnScore[1])
    return espnScore[0] > espnScore[1] ? m.team1 : m.team2;

  // User prediction
  const s = us[num];
  if (s && s[0] !== s[1]) return s[0] > s[1] ? m.team1 : m.team2;
  return null;
}

export function resolveRef(
  ref: string,
  byNum: Record<number, Match>,
  us: UserScores,
  espnAll: ESPNMatch[] = [],
  depth = 0,
): string | null {
  if (depth > 8) return null;
  if (!ref.startsWith('W') && !ref.startsWith('L')) return ref;
  const win = ref[0] === 'W';
  const num = parseInt(ref.slice(1), 10);
  const w = getWinner(num, byNum, us, espnAll);
  if (!w) return null;
  const m = byNum[num];
  const raw = win ? w : w === m.team1 ? m.team2 : m.team1;
  return resolveRef(raw, byNum, us, espnAll, depth + 1);
}

export function resolveWinner(
  num: number,
  byNum: Record<number, Match>,
  us: UserScores,
  espnAll: ESPNMatch[] = [],
): string | null {
  const raw = getWinner(num, byNum, us, espnAll);
  if (!raw) return null;
  return resolveRef(raw, byNum, us, espnAll);
}

import { getStrength } from '../data/fifaRankings';

const GOAL_POOL = [0, 0, 1, 1, 1, 2, 2, 3, 4];

function pick(): number {
  return GOAL_POOL[Math.floor(Math.random() * GOAL_POOL.length)];
}

function weightedScore(t1: string | null, t2: string | null): [number, number] {
  let a = pick();
  let b = pick();
  while (a === b) b = pick();

  const s1 = t1 ? getStrength(t1) : 50;
  const s2 = t2 ? getStrength(t2) : 50;
  const pTeam1Wins = s1 / (s1 + s2);

  // a > b means team1 wins; flip if needed based on probability
  const team1ShouldWin = Math.random() < pTeam1Wins;
  const team1Winning = a > b;
  if (team1Winning !== team1ShouldWin) return [b, a];
  return [a, b];
}

export function simulate(
  allKo: Match[],
  byNum: Record<number, Match>,
  prev: UserScores,
  espnAll: ESPNMatch[] = [],
): UserScores {
  const next: UserScores = { ...prev };
  const ordered = [...allKo].sort((a, b) => (a.num ?? 0) - (b.num ?? 0));
  for (const m of ordered) {
    if (!m.num || m.score?.ft || next[m.num]) continue;
    const t1 = resolveRef(m.team1, byNum, next, espnAll);
    const t2 = resolveRef(m.team2, byNum, next, espnAll);
    if (t1 && t2) next[m.num] = weightedScore(t1, t2);
  }
  return next;
}
