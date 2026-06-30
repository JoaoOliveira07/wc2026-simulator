import { useQuery } from '@tanstack/react-query';
import { fetchESPNToday, type ESPNMatch } from '../data/espnApi';

const CAZETV_URL = 'https://www.youtube.com/@CazeTV/streams';


function statusColor(s: ESPNMatch['status']): string {
  if (s === 'live' || s === 'halftime') return '#ef4444';
  if (s === 'final') return '#475569';
  return '#3b82f6';
}

function MatchChip({ m }: { m: ESPNMatch }) {
  const isLive = m.status === 'live' || m.status === 'halftime';
  const dotColor = statusColor(m.status);

  const localTime = new Date(m.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  });

  const chipStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px',
    borderRadius: 10,
    background: isLive ? 'rgba(239,68,68,0.08)' : 'rgba(15,23,42,0.6)',
    border: `1px solid ${isLive ? 'rgba(239,68,68,0.25)' : 'rgba(30,41,59,0.7)'}`,
    flexShrink: 0,
    cursor: isLive ? 'pointer' : 'default',
    textDecoration: 'none',
  };

  const inner = (
    <>
      {/* Team logos or abbr */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <TeamLogo src={m.home.logo} abbr={m.home.abbr} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{m.home.abbr}</span>
      </div>

      {/* Score or time */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        minWidth: 52, justifyContent: 'center',
      }}>
        {m.status === 'scheduled' ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{localTime}</span>
        ) : (
          <>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
              {m.home.score ?? '–'}
            </span>
            <span style={{ fontSize: 10, color: '#334155', fontWeight: 700 }}>:</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
              {m.away.score ?? '–'}
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{m.away.abbr}</span>
        <TeamLogo src={m.away.logo} abbr={m.away.abbr} />
      </div>

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: dotColor,
          animation: isLive ? 'livePulse 1.4s ease-in-out infinite' : undefined,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: dotColor, letterSpacing: '0.05em' }}>
          {m.status === 'live' ? m.shortDetail
            : m.status === 'halftime' ? 'INT'
            : m.status === 'final' ? 'ENC'
            : ''}
        </span>
      </div>
    </>
  );

  if (isLive) {
    return (
      <a href={CAZETV_URL} target="_blank" rel="noopener noreferrer" style={chipStyle}>
        {inner}
      </a>
    );
  }
  return <div style={chipStyle}>{inner}</div>;
}

function TeamLogo({ src, abbr }: { src: string; abbr: string }) {
  if (!src) return <span style={{ fontSize: 9, color: '#475569', width: 20, textAlign: 'center' }}>{abbr.slice(0, 3)}</span>;
  return (
    <img src={src} alt={abbr}
      style={{ width: 20, height: 20, objectFit: 'contain' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

export function LiveBanner() {
  const { data: matches = [] } = useQuery({
    queryKey: ['espn-today'],
    queryFn: fetchESPNToday,
    staleTime: 0,
    refetchInterval: 60_000,   // poll every 60s
    retry: 1,
  });

  const display = matches;

  // Sort: live first, then scheduled by time, then final
  const sorted = [...display].sort((a, b) => {
    const order = { live: 0, halftime: 0, scheduled: 1, final: 2, postponed: 3 };
    const od = order[a.status] - order[b.status];
    if (od !== 0) return od;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const hasLive = sorted.some(m => m.status === 'live' || m.status === 'halftime');

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
      <div style={{ borderTop: '1px solid rgba(30,41,59,0.5)', padding: '5px 0' }}>
      <div style={{
        maxWidth: '96rem', margin: '0 auto', padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {display.length === 0 ? (
          <span style={{ fontSize: 11, color: '#334155', fontWeight: 500 }}>
            Nenhum jogo acontecendo nesse momento
          </span>
        ) : (
          <>
            {/* Label */}
            {hasLive ? (
              <a
                href={CAZETV_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  textDecoration: 'none',
                }}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#ef4444',
                  animation: 'livePulse 1.4s ease-in-out infinite',
                }} />
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                  color: '#ef4444', textTransform: 'uppercase',
                }}>
                  Ao vivo
                </span>
              </a>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                  color: '#475569', textTransform: 'uppercase',
                }}>
                  Hoje
                </span>
              </div>
            )}
            <div style={{ width: 1, height: 16, background: '#1e293b', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
              {sorted.map(m => <MatchChip key={m.id} m={m} />)}
            </div>
          </>
        )}
      </div>
      </div>
    </>
  );
}
