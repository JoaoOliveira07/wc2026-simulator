import type { Match, TeamStanding, Predictions } from '../types';

function predKey(m: Match) {
  return `${m.team1}|${m.team2}|${m.date}`;
}

function getScore(m: Match, predictions: Predictions): [number, number] | null {
  if (m.score?.ft) return m.score.ft;
  const pred = predictions[predKey(m)];
  if (pred) return [pred.score1, pred.score2];
  return null;
}

export function calcStandings(
  teams: string[],
  matches: Match[],
  predictions: Predictions,
): TeamStanding[] {
  const map: Record<string, TeamStanding> = {};
  for (const t of teams) {
    map[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }

  for (const m of matches) {
    if (!teams.includes(m.team1) || !teams.includes(m.team2)) continue;
    const score = getScore(m, predictions);
    if (!score) continue;

    const [g1, g2] = score;
    const s1 = map[m.team1];
    const s2 = map[m.team2];

    s1.played++;
    s2.played++;
    s1.gf += g1; s1.ga += g2;
    s2.gf += g2; s2.ga += g1;

    if (g1 > g2) {
      s1.won++; s1.pts += 3; s2.lost++;
    } else if (g1 < g2) {
      s2.won++; s2.pts += 3; s1.lost++;
    } else {
      s1.drawn++; s2.drawn++;
      s1.pts++; s2.pts++;
    }
  }

  for (const t of teams) {
    map[t].gd = map[t].gf - map[t].ga;
  }

  return teams
    .map((t) => map[t])
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}
