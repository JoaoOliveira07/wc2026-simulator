import { Flag } from './Flag';
import { teamPT } from '../data/teamNames';
import type { Match } from '../types';
import type { ESPNMatch } from '../data/espnApi';

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
  // "Matchday N" — any number
  const md = round.match(/^Matchday\s+(\d+)$/i);
  if (md) return `Fase de Grupos · Rodada ${md[1]}`;
  return round;
}

const CAZETV_URL = 'https://www.youtube.com/@CazeTV/streams';

function parseKickoff(dateStr: string, timeStr: string): Date | null {
  const m = timeStr.match(/(\d+):(\d+)\s+UTC([+-]\d?\d?)/);
  if (!m) return null;
  const [, hh, mm, off] = m;
  const offsetH = parseInt(off, 10);
  const sign = offsetH >= 0 ? '+' : '-';
  const absH = String(Math.abs(offsetH)).padStart(2, '0');
  const iso = `${dateStr}T${hh.padStart(2,'0')}:${mm}:00${sign}${absH}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function findESPNMatch(m: Match, liveMatches: ESPNMatch[]): ESPNMatch | null {
  if (!liveMatches.length) return null;
  return liveMatches.find(e => {
    const h = e.home.name.toLowerCase();
    const a = e.away.name.toLowerCase();
    const t1 = m.team1.toLowerCase();
    const t2 = m.team2.toLowerCase();
    return (h.includes(t1) || t1.includes(h)) && (a.includes(t2) || t2.includes(a))
      || (h.includes(t2) || t2.includes(h)) && (a.includes(t1) || t1.includes(a));
  }) ?? null;
}

function ScoreBadge({ score, live }: {
  score?: { ft: [number, number]; p?: [number, number] };
  live?: ESPNMatch | null;
}) {
  if (live && (live.status === 'live' || live.status === 'halftime')) {
    const s1 = live.home.score ?? '–';
    const s2 = live.away.score ?? '–';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
          {s1} : {s2}
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.06em' }}>
          {live.status === 'halftime' ? 'INT' : live.shortDetail}
        </span>
      </div>
    );
  }

  if (score?.ft) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
          {score.ft[0]} : {score.ft[1]}
        </span>
        {score.p && (
          <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>
            ({score.p[0]} : {score.p[1]} pen)
          </span>
        )}
      </div>
    );
  }

  return null;
}

function MatchRow({ m, liveMatches }: { m: Match; liveMatches: ESPNMatch[] }) {
  const kicked = parseKickoff(m.date, m.time);
  const espn   = findESPNMatch(m, liveMatches);
  const isLive = espn?.status === 'live' || espn?.status === 'halftime';
  const isFinal = !!m.score?.ft || espn?.status === 'final';
  const hasScore = !!m.score?.ft;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
      borderBottom: '1px solid rgba(30,41,59,0.4)',
      background: isLive ? 'rgba(239,68,68,0.04)' : 'transparent',
    }}>
      {/* Date + Time */}
      <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
        {kicked ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#475569' }}>{formatDate(kicked)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: isLive ? '#ef4444' : isFinal ? '#334155' : '#64748b' }}>
              {isLive ? '● AO VIVO' : formatTime(kicked)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: '#334155' }}>—</div>
        )}
      </div>

      {/* Team 1 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minWidth: 0 }}>
        <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', textAlign: 'right' }}>
          {teamPT(m.team1)}
        </span>
        <Flag team={m.team1} className="w-7 h-5 rounded-sm shrink-0" />
      </div>

      {/* Score or VS */}
      <div style={{ width: 70, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {(hasScore || isLive) ? (
          <ScoreBadge score={m.score} live={espn} />
        ) : (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>×</span>
        )}
      </div>

      {/* Team 2 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Flag team={m.team2} className="w-7 h-5 rounded-sm shrink-0" />
        <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
          {teamPT(m.team2)}
        </span>
      </div>

      {/* Live button OR nothing */}
      {isLive ? (
        <a
          href={CAZETV_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flexShrink: 0, fontSize: 9, fontWeight: 800, padding: '3px 7px',
            borderRadius: 6, background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444',
            textDecoration: 'none', letterSpacing: '0.04em',
          }}
        >
          CAZE
        </a>
      ) : (
        <div style={{ width: 38, flexShrink: 0 }} />
      )}
    </div>
  );
}

interface Props {
  matches: Match[];
  liveMatches: ESPNMatch[];
}

export function MatchesTab({ matches, liveMatches }: Props) {
  // Group by round, maintaining order
  const groups: { round: string; items: Match[] }[] = [];
  for (const m of matches) {
    const last = groups[groups.length - 1];
    if (last && last.round === m.round) {
      last.items.push(m);
    } else {
      groups.push({ round: m.round, items: [m] });
    }
  }

  const liveCount = liveMatches.filter(e => e.status === 'live' || e.status === 'halftime').length;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {liveCount > 0 && (
        <div style={{
          margin: '0 0 12px', padding: '10px 16px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'livePulse 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
              {liveCount} jogo{liveCount > 1 ? 's' : ''} ao vivo agora
            </span>
          </div>
          <a
            href={CAZETV_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 8,
              background: '#ef4444', color: '#fff', textDecoration: 'none', letterSpacing: '0.04em',
            }}
          >
            Assistir na CazeTV →
          </a>
        </div>
      )}
      <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}`}</style>

      {groups.map(({ round, items }) => (
        <div key={round} style={{ marginBottom: 20 }}>
          <div style={{
            padding: '6px 14px', fontSize: 10, fontWeight: 800,
            color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase',
            borderBottom: '1px solid rgba(30,41,59,0.6)',
          }}>
            {roundLabel(round)}
          </div>
          {items.map((m, i) => (
            <MatchRow key={`${m.team1}-${m.team2}-${m.date}-${i}`} m={m} liveMatches={liveMatches} />
          ))}
        </div>
      ))}
    </div>
  );
}
