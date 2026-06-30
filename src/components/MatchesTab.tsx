import { useState, useMemo } from 'react';
import { Flag } from './Flag';
import { teamPT } from '../data/teamNames';
import type { Match } from '../types';
import type { ESPNMatch } from '../data/espnApi';
import { resolveRef, type UserScores } from '../store/knockout';
import cazeTvLogo from '../assets/cazetv.png';

const KO_ROUND_PT: Record<string, string> = {
  'Round of 32': 'Fase 16',
  'Round of 16': 'Oitavas de Final',
  'Quarter-finals': 'Quartas de Final',
  'Semi-finals': 'Semifinais',
  'Third place play-off': '3° Lugar',
  'Final': 'Final',
};

function roundLabel(round: string): string {
  if (KO_ROUND_PT[round]) return KO_ROUND_PT[round];
  const md = round.match(/^Matchday\s+(\d+)$/i);
  if (md) return `Fase de Grupos · Rodada ${md[1]}`;
  return round;
}

const CAZETV_URL = 'https://www.youtube.com/@CazeTV/streams';

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseKickoff(dateStr: string, timeStr: string): Date | null {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d+):(\d+)\s+UTC([+-]\d?\d?)/);
  if (!m) return null;
  const [, hh, mm, off] = m;
  const offsetH = parseInt(off, 10);
  const sign = offsetH >= 0 ? '+' : '-';
  const absH = String(Math.abs(offsetH)).padStart(2, '0');
  const iso = `${dateStr}T${hh.padStart(2, '0')}:${mm}:00${sign}${absH}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function findESPNMatch(m: Match, espnAll: ESPNMatch[]): ESPNMatch | null {
  if (!espnAll.length) return null;
  return espnAll.find(e => {
    const h  = e.home.name.toLowerCase();
    const a  = e.away.name.toLowerCase();
    const t1 = m.team1.toLowerCase();
    const t2 = m.team2.toLowerCase();
    return (h.includes(t1) || t1.includes(h)) && (a.includes(t2) || t2.includes(a))
      ||   (h.includes(t2) || t2.includes(h)) && (a.includes(t1) || t1.includes(a));
  }) ?? null;
}

type MatchStatus = 'live' | 'upcoming' | 'finished';

function getStatus(m: Match, espn: ESPNMatch | null): MatchStatus {
  if (espn?.status === 'live' || espn?.status === 'halftime') return 'live';
  if (m.score?.ft || espn?.status === 'final') return 'finished';
  return 'upcoming';
}

// ── Date column ───────────────────────────────────────────────────────────────
function DateCol({ kicked, status }: { kicked: Date | null; status: MatchStatus }) {
  const isLive = status === 'live';
  const isDone = status === 'finished';

  if (isLive) {
    return (
      <div style={{ width: 46, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'livePulse 1.4s ease-in-out infinite' }} />
      </div>
    );
  }

  if (!kicked) {
    return <div style={{ width: 46, flexShrink: 0, textAlign: 'center', fontSize: 10, color: '#1e293b' }}>—</div>;
  }

  const day   = WEEKDAY[kicked.getDay()];
  const date  = kicked.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const time  = kicked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ width: 46, flexShrink: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: isDone ? '#334155' : '#94a3b8', letterSpacing: '0.04em' }}>
        {day} {date}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: isDone ? '#334155' : '#64748b' }}>
        {time}
      </div>
    </div>
  );
}

// ── Score area ────────────────────────────────────────────────────────────────
function ScoreCol({ m, espn, status }: { m: Match; espn: ESPNMatch | null; status: MatchStatus }) {
  if (status === 'live' && espn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {espn.home.score ?? '–'} : {espn.away.score ?? '–'}
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.06em' }}>
          {espn.status === 'halftime' ? 'INT' : espn.shortDetail}
        </span>
      </div>
    );
  }

  if (status === 'finished') {
    const ft = m.score?.ft;
    const espnFt = espn && espn.status === 'final'
      ? [Number(espn.home.score) || 0, Number(espn.away.score) || 0] as [number, number]
      : null;
    const score = ft ?? espnFt;
    if (score) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#64748b', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {score[0]} : {score[1]}
          </span>
          {m.score?.p && (
            <span style={{ fontSize: 8, color: '#334155', fontWeight: 600 }}>
              ({m.score.p[0]}:{m.score.p[1]} pen)
            </span>
          )}
        </div>
      );
    }
  }

  return <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>×</span>;
}

// ── Single match row ──────────────────────────────────────────────────────────
function MatchRow({ m, espn, status, kicked, resolvedTeam1, resolvedTeam2 }: {
  m: Match; espn: ESPNMatch | null; status: MatchStatus; kicked: Date | null;
  resolvedTeam1?: string | null; resolvedTeam2?: string | null;
}) {
  const isLive = status === 'live';
  const isUpcoming = status === 'upcoming';
  const isDone = status === 'finished';
  const nameColor = isDone ? '#475569' : '#e2e8f0';

  const displayTeam1 = resolvedTeam1 ?? m.team1;
  const displayTeam2 = resolvedTeam2 ?? m.team2;

  const row = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
      borderBottom: '1px solid rgba(30,41,59,0.35)',
      background: isLive ? 'rgba(239,68,68,0.05)' : 'transparent',
      cursor: (isLive || isUpcoming) ? 'pointer' : 'default',
      textDecoration: 'none',
    }}>
      <DateCol kicked={kicked} status={status} />

      {/* Team 1 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minWidth: 0 }}>
        <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: displayTeam1 && !displayTeam1.startsWith('W') && !displayTeam1.startsWith('L') ? nameColor : '#1e293b', textAlign: 'right' }}>
          {displayTeam1 && !displayTeam1.startsWith('W') && !displayTeam1.startsWith('L') ? teamPT(displayTeam1) : displayTeam1 ?? '—'}
        </span>
        {displayTeam1 && !displayTeam1.startsWith('W') && !displayTeam1.startsWith('L')
          ? <Flag team={displayTeam1} className="w-7 h-5 rounded-sm shrink-0" style={isDone ? { opacity: 0.5 } : undefined} />
          : <span className="w-7 h-5 rounded-sm shrink-0 inline-block" style={{ background: 'rgba(15,23,42,0.7)' }} />
        }
      </div>

      {/* Score */}
      <div style={{ width: 72, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ScoreCol m={m} espn={espn} status={status} />
      </div>

      {/* Team 2 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {displayTeam2 && !displayTeam2.startsWith('W') && !displayTeam2.startsWith('L')
          ? <Flag team={displayTeam2} className="w-7 h-5 rounded-sm shrink-0" style={isDone ? { opacity: 0.5 } : undefined} />
          : <span className="w-7 h-5 rounded-sm shrink-0 inline-block" style={{ background: 'rgba(15,23,42,0.7)' }} />
        }
        <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: displayTeam2 && !displayTeam2.startsWith('W') && !displayTeam2.startsWith('L') ? nameColor : '#1e293b' }}>
          {displayTeam2 && !displayTeam2.startsWith('W') && !displayTeam2.startsWith('L') ? teamPT(displayTeam2) : displayTeam2 ?? '—'}
        </span>
      </div>

      {/* CazeTV badge for live & upcoming */}
      {(isLive || status === 'upcoming') ? (
        <a href={CAZETV_URL} target="_blank" rel="noopener noreferrer"
          style={{
            flexShrink: 0, borderRadius: 6, overflow: 'hidden',
            background: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '3px 6px',
            display: 'flex', alignItems: 'center',
            cursor: 'pointer',
          }}>
          <img src={cazeTvLogo} alt="CazeTV" style={{ height: 14, width: 'auto', display: 'block' }} />
        </a>
      ) : (
        <div style={{ width: 44, flexShrink: 0 }} />
      )}
    </div>
  );

  return (isLive || isUpcoming)
    ? <a href={CAZETV_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>{row}</a>
    : row;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px 6px',
      borderBottom: `1px solid ${color}22`,
    }}>
      <span style={{ fontSize: 10, fontWeight: 900, color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, color,
        background: `${color}18`, border: `1px solid ${color}33`,
        borderRadius: 4, padding: '1px 5px',
      }}>
        {count}
      </span>
    </div>
  );
}

// ── Round sub-header ──────────────────────────────────────────────────────────
function RoundSubHeader({ round }: { round: string }) {
  return (
    <div style={{
      padding: '5px 14px', fontSize: 9, fontWeight: 800,
      color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase',
      borderBottom: '1px solid rgba(30,41,59,0.3)',
      background: 'rgba(15,23,42,0.4)',
    }}>
      {roundLabel(round)}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  matches: Match[];
  liveMatches: ESPNMatch[];
}

interface EnrichedMatch {
  m: Match;
  espn: ESPNMatch | null;
  status: MatchStatus;
  kicked: Date | null;
}

export function MatchesTab({ matches, liveMatches }: Props) {
  const [koUs] = useState<UserScores>(() => {
    try { return JSON.parse(localStorage.getItem('wc2026_ko') ?? '{}'); }
    catch { return {}; }
  });

  const koByNum = useMemo(() => {
    const map: Record<number, Match> = {};
    for (const m of matches) if (!m.group && m.num) map[m.num] = m;
    return map;
  }, [matches]);

  function resolveTeam(ref: string): string | null {
    return resolveRef(ref, koByNum, koUs, liveMatches);
  }

  // Enrich each match
  const enriched: EnrichedMatch[] = matches.map(m => {
    const espn   = findESPNMatch(m, liveMatches);
    const status = getStatus(m, espn);
    const kicked = parseKickoff(m.date, m.time);
    return { m, espn, status, kicked };
  });

  // Split by status
  const live     = enriched.filter(e => e.status === 'live');
  const upcoming = enriched
    .filter(e => e.status === 'upcoming')
    .sort((a, b) => (a.kicked?.getTime() ?? 0) - (b.kicked?.getTime() ?? 0));
  const finished = enriched
    .filter(e => e.status === 'finished')
    .sort((a, b) => (b.kicked?.getTime() ?? 0) - (a.kicked?.getTime() ?? 0));

  // Group by round within a section (preserves round labels)
  function groupByRound(items: EnrichedMatch[]): { round: string; items: EnrichedMatch[] }[] {
    const out: { round: string; items: EnrichedMatch[] }[] = [];
    for (const e of items) {
      const last = out[out.length - 1];
      if (last && last.round === e.m.round) {
        last.items.push(e);
      } else {
        out.push({ round: e.m.round, items: [e] });
      }
    }
    return out;
  }

  const upcomingGroups = groupByRound(upcoming);
  const finishedGroups = groupByRound(finished);

  const key = (e: EnrichedMatch, i: number) => `${e.m.team1}|${e.m.team2}|${e.m.date}|${i}`;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}`}</style>

      {/* AO VIVO */}
      {live.length > 0 && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(239,68,68,0.2)' }}>
          <SectionHeader label="Ao Vivo" color="#ef4444" count={live.length} />
          {live.map((e, i) => (
            <MatchRow key={key(e, i)} m={e.m} espn={e.espn} status={e.status} kicked={e.kicked}
              resolvedTeam1={resolveTeam(e.m.team1)} resolvedTeam2={resolveTeam(e.m.team2)} />
          ))}
        </div>
      )}

      {/* PRÓXIMOS */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(30,41,59,0.5)' }}>
          <SectionHeader label="Próximos" color="#3b82f6" count={upcoming.length} />
          {upcomingGroups.map(({ round, items }) => (
            <div key={round}>
              <RoundSubHeader round={round} />
              {items.map((e, i) => (
                <MatchRow key={key(e, i)} m={e.m} espn={e.espn} status={e.status} kicked={e.kicked}
                  resolvedTeam1={resolveTeam(e.m.team1)} resolvedTeam2={resolveTeam(e.m.team2)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ENCERRADOS */}
      {finished.length > 0 && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(30,41,59,0.4)' }}>
          <SectionHeader label="Encerrados" color="#475569" count={finished.length} />
          {finishedGroups.map(({ round, items }) => (
            <div key={round}>
              <RoundSubHeader round={round} />
              {items.map((e, i) => (
                <MatchRow key={key(e, i)} m={e.m} espn={e.espn} status={e.status} kicked={e.kicked}
                  resolvedTeam1={resolveTeam(e.m.team1)} resolvedTeam2={resolveTeam(e.m.team2)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
