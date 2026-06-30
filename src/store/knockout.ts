import type { Match } from '../types';

export type UserScores = Record<number, [number, number]>;

export function getWinner(num: number, byNum: Record<number, Match>, us: UserScores): string | null {
  const m = byNum[num];
  if (!m) return null;
  if (m.score?.p) return m.score.p[0] > m.score.p[1] ? m.team1 : m.team2;
  if (m.score?.et && m.score.et[0] !== m.score.et[1])
    return m.score.et[0] > m.score.et[1] ? m.team1 : m.team2;
  if (m.score?.ft && m.score.ft[0] !== m.score.ft[1])
    return m.score.ft[0] > m.score.ft[1] ? m.team1 : m.team2;
  const s = us[num];
  if (s && s[0] !== s[1]) return s[0] > s[1] ? m.team1 : m.team2;
  return null;
}

export function resolveRef(ref: string, byNum: Record<number, Match>, us: UserScores, depth = 0): string | null {
  if (depth > 8) return null;
  if (!ref.startsWith('W') && !ref.startsWith('L')) return ref;
  const win = ref[0] === 'W';
  const num = parseInt(ref.slice(1), 10);
  const w = getWinner(num, byNum, us);
  if (!w) return null;
  const m = byNum[num];
  const raw = win ? w : w === m.team1 ? m.team2 : m.team1;
  return resolveRef(raw, byNum, us, depth + 1);
}

export function resolveWinner(num: number, byNum: Record<number, Match>, us: UserScores): string | null {
  const raw = getWinner(num, byNum, us);
  if (!raw) return null;
  return resolveRef(raw, byNum, us);
}

function randomND(): [number, number] {
  const p = [0, 0, 1, 1, 1, 2, 2, 3, 4];
  let a = p[Math.floor(Math.random() * p.length)];
  let b = p[Math.floor(Math.random() * p.length)];
  while (a === b) b = p[Math.floor(Math.random() * p.length)];
  return [a, b];
}

export function simulate(allKo: Match[], byNum: Record<number, Match>, prev: UserScores): UserScores {
  const next: UserScores = { ...prev };
  const ordered = [...allKo].sort((a, b) => (a.num ?? 0) - (b.num ?? 0));
  for (const m of ordered) {
    if (!m.num || m.score?.ft || next[m.num]) continue;
    const t1 = resolveRef(m.team1, byNum, next);
    const t2 = resolveRef(m.team2, byNum, next);
    if (t1 && t2) next[m.num] = randomND();
  }
  return next;
}
