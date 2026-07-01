import { useMemo } from 'react';
import { TrendingUp, Shuffle, Shield, Target, Zap, Award, Trophy, Activity } from 'lucide-react';
import type { Group, Match, Predictions } from '../types';
import type { ESPNMatch } from '../data/espnApi';
import type { UserScores } from '../store/knockout';
import { resolveWinner, resolveRef } from '../store/knockout';
import { calcStandings } from '../store/standings';
import { getStrength } from '../data/fifaRankings';
import { Flag } from './Flag';
import { teamPT } from '../data/teamNames';

interface Props {
  groups: Group[];
  matches: Match[];
  predictions: Predictions;
  espnAll: ESPNMatch[];
}

const FINAL_NUM = 104;
const KO_NUMS = Array.from({ length: 31 }, (_, i) => i + 74);

function readKO(): UserScores {
  try { return JSON.parse(localStorage.getItem('wc2026_ko') ?? '{}'); }
  catch { return {}; }
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  delay?: number;
}

function StatCard({ label, value, sub, icon, iconBg, iconColor, valueColor = '#f1f5f9', delay = 0 }: StatCardProps) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(10,16,32,0.95))',
      border: '1px solid rgba(30,41,59,0.7)',
      borderRadius: 18,
      padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 10,
      animation: 'statsCountUp 0.45s ease both',
      animationDelay: `${delay}s`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: iconBg, opacity: 0.07,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${iconBg}55`,
        }}>
          <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
        </div>
        <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, lineHeight: 1.3 }}>
          {label}
        </span>
      </div>

      <div style={{ fontSize: 32, fontWeight: 900, color: valueColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>

      {sub && (
        <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{sub}</div>
      )}
    </div>
  );
}

// Card with team (flag + name + value) — used for attack & defense rows
function TeamStatCard({
  label, team, value, unit, iconBg, iconColor, icon, delay,
}: {
  label: string; team: string; value: number; unit: string;
  iconBg: string; iconColor: string; icon: React.ReactNode; delay: number;
}) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(10,16,32,0.95))',
      border: '1px solid rgba(30,41,59,0.7)',
      borderRadius: 18, padding: '20px 22px',
      animation: 'statsCountUp 0.45s ease both', animationDelay: `${delay}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${iconBg}88`, flexShrink: 0 }}>
          <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
        </div>
        <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Flag team={team} className="w-9 h-6 rounded-sm shrink-0" />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamPT(team)}</span>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 900, color: iconColor, fontSize: 22, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>{unit}</div>
        </div>
      </div>
    </div>
  );
}

export function StatsTab({ groups, matches, predictions, espnAll }: Props) {
  const ko = readKO();

  const byNum = useMemo(() => {
    const map: Record<number, Match> = {};
    for (const m of matches.filter(x => !x.group)) {
      if (m.num) map[m.num] = m;
    }
    return map;
  }, [matches]);

  const champion = useMemo(
    () => resolveWinner(FINAL_NUM, byNum, ko, espnAll),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [byNum, espnAll],
  );

  // ── Aggregate goals from ALL matches (groups + knockout) ──────────────────
  const allStats = useMemo(() => {
    const teamGoals: Record<string, number> = {};
    const teamConceded: Record<string, number> = {};
    const teamGames: Record<string, number> = {};
    let totalGoals = 0;
    let matchesWithScore = 0;
    let biggestWin = 0;
    let biggestWinner = '';
    let biggestLoser = '';

    function addResult(t1: string, t2: string, s: [number, number]) {
      matchesWithScore++;
      totalGoals += s[0] + s[1];
      const diff = Math.abs(s[0] - s[1]);
      if (diff > biggestWin) {
        biggestWin = diff;
        biggestWinner = s[0] > s[1] ? t1 : t2;
        biggestLoser  = s[0] > s[1] ? t2 : t1;
      }
      teamGoals[t1]    = (teamGoals[t1]    ?? 0) + s[0];
      teamGoals[t2]    = (teamGoals[t2]    ?? 0) + s[1];
      teamConceded[t1] = (teamConceded[t1] ?? 0) + s[1];
      teamConceded[t2] = (teamConceded[t2] ?? 0) + s[0];
      teamGames[t1]    = (teamGames[t1]    ?? 0) + 1;
      teamGames[t2]    = (teamGames[t2]    ?? 0) + 1;
    }

    // Group stage: real scores + predictions
    for (const m of matches.filter(m => m.group)) {
      const score = m.score?.ft;
      const pred = predictions[`${m.team1}|${m.team2}|${m.date}`];
      const s = score ?? (pred ? [pred.score1, pred.score2] as [number, number] : null);
      if (s) addResult(m.team1, m.team2, s);
    }

    // Knockout stage: real scores + user KO scores
    for (const num of KO_NUMS) {
      const m = byNum[num];
      if (!m) continue;
      const t1 = resolveRef(m.team1, byNum, ko, espnAll);
      const t2 = resolveRef(m.team2, byNum, ko, espnAll);
      if (!t1 || !t2) continue;
      const score = m.score?.ft ?? (m.score?.et ?? null);
      const userScore = ko[num] as [number, number] | undefined;
      const s = score ?? userScore ?? null;
      if (s) addResult(t1, t2, s);
    }

    const avgGoals = matchesWithScore > 0 ? (totalGoals / matchesWithScore).toFixed(1) : '—';

    // Best attack (most scored)
    const topScorer = Object.entries(teamGoals).sort((a, b) => b[1] - a[1])[0] ?? null;

    // Best defense (fewest conceded, among teams that played ≥1 game)
    const played = Object.keys(teamGames);
    const bestDefense = played.length > 0
      ? played
          .map(t => [t, teamConceded[t] ?? 0] as [string, number])
          .sort((a, b) => a[1] - b[1])[0]
      : null;

    return {
      totalGoals, matchesWithScore, avgGoals,
      biggestWin, biggestWinner, biggestLoser,
      topScorer, bestDefense,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, predictions, byNum, espnAll]);

  // ── Unbeaten teams (group stage only — meaningful metric) ─────────────────
  const unbeaten = useMemo(() => {
    const groupMatches = matches.filter(m => m.group);
    const lost = new Set<string>();
    for (const m of groupMatches) {
      const score = m.score?.ft;
      const pred = predictions[`${m.team1}|${m.team2}|${m.date}`];
      const s = score ?? (pred ? [pred.score1, pred.score2] as [number, number] : null);
      if (!s) continue;
      if (s[0] < s[1]) lost.add(m.team1);
      if (s[1] < s[0]) lost.add(m.team2);
    }
    const played = new Set<string>();
    for (const m of groupMatches) {
      const hasScore = m.score?.ft || predictions[`${m.team1}|${m.team2}|${m.date}`];
      if (hasScore) { played.add(m.team1); played.add(m.team2); }
    }
    return Array.from(played).filter(t => !lost.has(t));
  }, [matches, predictions]);

  // ── Upsets in knockout ────────────────────────────────────────────────────
  const upsets = useMemo(() => {
    let count = 0;
    for (const num of KO_NUMS) {
      const m = byNum[num];
      if (!m) continue;
      const t1 = resolveRef(m.team1, byNum, ko, espnAll);
      const t2 = resolveRef(m.team2, byNum, ko, espnAll);
      if (!t1 || !t2) continue;
      const winner = resolveWinner(num, byNum, ko, espnAll);
      if (!winner) continue;
      const s1 = getStrength(t1);
      const s2 = getStrength(t2);
      const favWinner = s1 >= s2 ? t1 : t2;
      if (winner !== favWinner) count++;
    }
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byNum, espnAll]);

  // ── Group leaders ──────────────────────────────────────────────────────────
  const groupSummaries = useMemo(() => {
    return groups.map(g => {
      const gm = matches.filter(m => m.group === g.name);
      const standings = calcStandings(g.teams, gm, predictions);
      return { name: g.name, leader: standings[0]?.team, pts: standings[0]?.pts };
    });
  }, [groups, matches, predictions]);

  const noData = !champion && allStats.matchesWithScore === 0;

  if (noData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#334155' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Activity size={48} color="#1e293b" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>Sem dados ainda</div>
        <div style={{ fontSize: 13, marginTop: 6, color: '#334155' }}>Preencha placares nos Grupos e na Chave para ver as estatísticas.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 4px 48px' }}>

      {/* Champion hero */}
      {champion && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(161,98,7,0.25) 0%, rgba(120,53,15,0.15) 50%, rgba(15,23,42,0.95) 100%)',
          border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: 24,
          padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 20,
          marginBottom: 28,
          animation: 'statsCountUp 0.5s ease both',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -30, top: -30,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(234,179,8,0.06)',
          }} />
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(234,179,8,0.25), rgba(161,98,7,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(234,179,8,0.2)',
          }}>
            <Trophy size={26} color="#eab308" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 8 }}>
              Campeão Simulado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Flag team={champion} className="w-14 h-9 rounded" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }} />
              <span style={{ fontSize: 28, fontWeight: 900, color: '#fef08a', letterSpacing: '-0.02em' }}>{teamPT(champion)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Data source badge */}
      <div className="flex items-center gap-2 mb-4">
        <span style={{ fontSize: 10, color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Dados:
        </span>
        <span style={{ fontSize: 10, color: '#475569', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
          Fase de grupos + Mata-mata
        </span>
        <span style={{ fontSize: 10, color: '#334155' }}>
          · {allStats.matchesWithScore} jogo{allStats.matchesWithScore !== 1 ? 's' : ''} com placar
        </span>
      </div>

      {/* Stats grid — 1 col mobile, 2 col sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <StatCard
          label="Total de gols"
          value={allStats.totalGoals}
          sub="grupos + mata-mata"
          icon={<Activity size={16} />}
          iconBg="rgba(34,197,94,0.3)"
          iconColor="#22c55e"
          valueColor="#4ade80"
          delay={0}
        />
        <StatCard
          label="Média de gols por jogo"
          value={allStats.avgGoals}
          sub="todos os jogos com placar"
          icon={<TrendingUp size={16} />}
          iconBg="rgba(59,130,246,0.3)"
          iconColor="#60a5fa"
          valueColor="#93c5fd"
          delay={0.05}
        />
        <StatCard
          label="Zebras no mata-mata"
          value={upsets}
          sub="azarão bateu favorito (FIFA)"
          icon={<Shuffle size={16} />}
          iconBg="rgba(167,139,250,0.3)"
          iconColor="#a78bfa"
          valueColor="#c4b5fd"
          delay={0.1}
        />
        <StatCard
          label="Times invictos"
          value={unbeaten.length}
          sub={unbeaten.slice(0, 2).map(t => teamPT(t)).join(', ') || '—'}
          icon={<Shield size={16} />}
          iconBg="rgba(245,158,11,0.3)"
          iconColor="#fbbf24"
          valueColor="#fcd34d"
          delay={0.15}
        />
      </div>

      {/* Biggest win */}
      {allStats.biggestWinner && (
        <div style={{
          background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(10,16,32,0.95))',
          border: '1px solid rgba(30,41,59,0.7)',
          borderRadius: 18, padding: '20px 22px',
          marginBottom: 12,
          animation: 'statsCountUp 0.45s ease both',
          animationDelay: '0.2s',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.2)',
          }}>
            <Target size={16} color="#f87171" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
              Maior goleada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Flag team={allStats.biggestWinner} className="w-8 h-5 rounded-sm shrink-0" />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{teamPT(allStats.biggestWinner)}</span>
              <span style={{ fontWeight: 900, color: '#4ade80', fontSize: 18, padding: '0 4px' }}>+{allStats.biggestWin}</span>
              <span style={{ color: '#334155', fontSize: 12 }}>vs</span>
              <Flag team={allStats.biggestLoser} className="w-8 h-5 rounded-sm shrink-0" />
              <span style={{ fontSize: 15, color: '#64748b', fontWeight: 600 }}>{teamPT(allStats.biggestLoser)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Attack / Defense — 1 col mobile, 2 col sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {allStats.topScorer && (
          <TeamStatCard
            label="Melhor ataque"
            team={allStats.topScorer[0]}
            value={allStats.topScorer[1]}
            unit="GOLS"
            iconBg="rgba(34,197,94,0.2)"
            iconColor="#4ade80"
            icon={<Zap size={16} />}
            delay={0.25}
          />
        )}
        {allStats.bestDefense && (
          <TeamStatCard
            label="Melhor defesa"
            team={allStats.bestDefense[0]}
            value={allStats.bestDefense[1]}
            unit="SOFRIDOS"
            iconBg="rgba(59,130,246,0.2)"
            iconColor="#60a5fa"
            icon={<Shield size={16} />}
            delay={0.3}
          />
        )}
      </div>

      {/* Group leaders */}
      {groupSummaries.some(g => g.leader) && (
        <div style={{
          background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(10,16,32,0.95))',
          border: '1px solid rgba(30,41,59,0.7)',
          borderRadius: 18, padding: '20px 22px',
          animation: 'statsCountUp 0.45s ease both', animationDelay: '0.35s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.15)', flexShrink: 0 }}>
              <Award size={16} color="#fbbf24" />
            </div>
            <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Líderes por grupo</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
            {groupSummaries.map(g => g.leader ? (
              <div key={g.name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 10,
                background: 'rgba(30,41,59,0.5)',
                border: '1px solid rgba(30,41,59,0.6)',
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 900, color: '#94a3b8',
                  background: '#0f172a', borderRadius: 4, padding: '2px 6px',
                  letterSpacing: '0.06em', flexShrink: 0, border: '1px solid #1e293b',
                }}>
                  {g.name.replace('Group ', '')}
                </span>
                <Flag team={g.leader} className="w-6 h-4 rounded-sm shrink-0" />
                <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {teamPT(g.leader)}
                </span>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
}
