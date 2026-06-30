import { useState, useMemo } from 'react';
import { Trophy, Zap, Trash2, ChevronRight } from 'lucide-react';
import type { Match } from '../types';
import { Flag } from './Flag';
import { ScoreInput } from './ScoreInput';
import trofeuImg from '../assets/trofeu_copa.png';
import { teamPT } from '../data/teamNames';

// ── Layout constants ─────────────────────────────────────────────────────────
const ROW_H   = 108;
const CARD_H  = 96;
const N_ROWS  = 8;
const TOTAL_H = N_ROWS * ROW_H; // 864px
const CARD_W  = 162;
const FORK_W  = 28;
const HLINE_W = 20;
const CENTER_W = 220;

// ── Bracket structure ────────────────────────────────────────────────────────
const L_R32    = [74, 77, 73, 75, 83, 84, 81, 82];
const L_R16    = [89, 90, 93, 94];
const L_QF     = [97, 98];
const L_SF     = [101];
const R_SF     = [102];
const R_QF     = [99, 100];
const R_R16    = [91, 92, 95, 96];
const R_R32    = [76, 78, 79, 80, 86, 88, 85, 87];
const FINAL_NUM = 104;
const THIRD_NUM = 103;

// ── Phase detection → color palette ─────────────────────────────────────────
type Phase = 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'third';

function getPhase(num: number): Phase {
  if (num <= 88)  return 'r32';
  if (num <= 96)  return 'r16';
  if (num <= 100) return 'qf';
  if (num === 103) return 'third';
  if (num === 104) return 'final';
  return 'sf';
}

const PHASE_PALETTE: Record<Phase, {
  idle: string; active: string; winner: string;
  activeBorder: string; winnerBorder: string;
  activeShadow: string; winnerShadow: string;
  forkColor: string;
}> = {
  r32:   { idle:'#0f172a', active:'#0c1a2e', winner:'#091a10',
            activeBorder:'rgba(59,130,246,0.4)',  winnerBorder:'rgba(34,197,94,0.25)',
            activeShadow:'0 0 14px rgba(59,130,246,0.15)', winnerShadow:'none',
            forkColor:'#1e3a5f' },
  r16:   { idle:'#0f172a', active:'#0e1a32', winner:'#091a10',
            activeBorder:'rgba(99,102,241,0.5)',   winnerBorder:'rgba(34,197,94,0.3)',
            activeShadow:'0 0 18px rgba(99,102,241,0.2)', winnerShadow:'0 0 8px rgba(34,197,94,0.1)',
            forkColor:'#243566' },
  qf:    { idle:'#100f1e', active:'#130f2a', winner:'#091a10',
            activeBorder:'rgba(139,92,246,0.55)',  winnerBorder:'rgba(34,197,94,0.3)',
            activeShadow:'0 0 22px rgba(139,92,246,0.25)', winnerShadow:'0 0 10px rgba(34,197,94,0.12)',
            forkColor:'#2e2466' },
  sf:    { idle:'#110d22', active:'#150f2e', winner:'#091a10',
            activeBorder:'rgba(168,85,247,0.6)',   winnerBorder:'rgba(34,197,94,0.35)',
            activeShadow:'0 0 28px rgba(168,85,247,0.3)', winnerShadow:'0 0 12px rgba(34,197,94,0.15)',
            forkColor:'#3d1f6b' },
  final: { idle:'#160e04', active:'#1c1204', winner:'#1c1006',
            activeBorder:'rgba(234,179,8,0.5)',    winnerBorder:'rgba(234,179,8,0.65)',
            activeShadow:'0 0 28px rgba(234,179,8,0.2)', winnerShadow:'0 0 22px rgba(234,179,8,0.3)',
            forkColor:'#3d2e00' },
  third: { idle:'#0f172a', active:'#0f1a24', winner:'#0a1218',
            activeBorder:'rgba(100,116,139,0.4)',  winnerBorder:'rgba(100,116,139,0.35)',
            activeShadow:'none', winnerShadow:'none',
            forkColor:'#1e2d3d' },
};

interface Props { matches: Match[] }
type UserScores = Record<number, [number, number]>;

// ── Score helpers ─────────────────────────────────────────────────────────────
function getWinner(num: number, byNum: Record<number, Match>, us: UserScores): string | null {
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

function resolveWinner(num: number, byNum: Record<number, Match>, us: UserScores): string | null {
  const raw = getWinner(num, byNum, us);
  if (!raw) return null;
  return resolveRef(raw, byNum, us);
}

function resolveRef(ref: string, byNum: Record<number, Match>, us: UserScores, depth = 0): string | null {
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

function randomND(): [number, number] {
  const p = [0, 0, 1, 1, 1, 2, 2, 3, 4];
  let a = p[Math.floor(Math.random() * p.length)];
  let b = p[Math.floor(Math.random() * p.length)];
  while (a === b) b = p[Math.floor(Math.random() * p.length)];
  return [a, b];
}

function simulate(allKo: Match[], byNum: Record<number, Match>, prev: UserScores): UserScores {
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

// ── SVG fork connector ────────────────────────────────────────────────────────
function BracketFork({ fromCount, rtl, phase }: { fromCount: 2 | 4 | 8; rtl?: boolean; phase: Phase }) {
  const toCount = fromCount / 2;
  const fromRowH = TOTAL_H / fromCount;
  const midX = FORK_W / 2;
  const segs: string[] = [];

  for (let j = 0; j < toCount; j++) {
    const y1   = (2 * j + 0.5) * fromRowH;
    const y2   = (2 * j + 1.5) * fromRowH;
    const midY = (2 * j + 1)   * fromRowH;
    if (!rtl) {
      segs.push(`M 0 ${y1} H ${midX} V ${midY} H ${FORK_W}`, `M 0 ${y2} H ${midX} V ${midY}`);
    } else {
      segs.push(`M ${FORK_W} ${y1} H ${midX} V ${midY} H 0`, `M ${FORK_W} ${y2} H ${midX} V ${midY}`);
    }
  }

  return (
    <svg width={FORK_W} height={TOTAL_H} style={{ flexShrink: 0, display: 'block' }}>
      <path d={segs.join(' ')} stroke={PHASE_PALETTE[phase].forkColor}
        strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HorizLine({ phase }: { phase: Phase }) {
  const y = TOTAL_H / 2;
  return (
    <svg width={HLINE_W} height={TOTAL_H} style={{ flexShrink: 0, display: 'block' }}>
      <line x1={0} y1={y} x2={HLINE_W} y2={y}
        stroke={PHASE_PALETTE[phase].forkColor} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}


// ── Center trophy section ─────────────────────────────────────────────────────
interface CenterProps {
  byNum: Record<number, Match>;
  us: UserScores;
  onScore: (num: number, s: [number, number]) => void;
  stats: Stats;
}

function CenterSection({ byNum, us, onScore }: Omit<CenterProps, 'stats'>) {
  const imgSize = 148;

  // Anchor: SF lines at TOTAL_H/2. Final card center sits there.
  const lineY        = TOTAL_H / 2;          // 432
  const finalCardTop = lineY - CARD_H / 2;   // 384

  // Trophy fills space above final card, centered in that space
  const trophyTop = (finalCardTop - imgSize) / 2;  // vertically centered above final

  // 3rd place compact below Final
  const thirdLabelY  = finalCardTop + CARD_H + 8;
  const thirdCardTop = thirdLabelY + 14;

  const miniLabel: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  };

  return (
    <div style={{ width: CENTER_W, height: TOTAL_H, position: 'relative', flexShrink: 0 }}>

      {/* "FINAL" column header — same position as other column labels */}
      <div style={{
        position: 'absolute', top: -24, left: 0, right: 0,
        textAlign: 'center', fontSize: 10, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        color: '#b45309',
      }}>
        Final
      </div>

      {/* Trophy — large, centered in upper half */}
      <div style={{ position: 'absolute', top: trophyTop, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <img
          src={trofeuImg}
          alt="Troféu"
          style={{
            width: imgSize, height: imgSize,
            filter: 'drop-shadow(0 0 16px rgba(234,179,8,0.55)) drop-shadow(0 4px 10px rgba(0,0,0,0.6))',
          }}
        />
      </div>

      {/* Final card */}
      <div style={{ position: 'absolute', top: finalCardTop, left: 4, right: 4, height: CARD_H }}>
        <KoCard matchNum={FINAL_NUM} byNum={byNum} us={us} onScore={onScore} isChampion />
      </div>

      {/* 3° Lugar */}
      <div style={{ ...miniLabel, top: thirdLabelY, color: '#374151' }}>3° Lugar</div>
      <div style={{ position: 'absolute', top: thirdCardTop, left: 4, right: 4, height: CARD_H }}>
        <KoCard matchNum={THIRD_NUM} byNum={byNum} us={us} onScore={onScore} isThird />
      </div>
    </div>
  );
}

// ── Compact match card ────────────────────────────────────────────────────────
interface KoCardProps {
  matchNum: number;
  byNum: Record<number, Match>;
  us: UserScores;
  onScore: (num: number, s: [number, number]) => void;
  isChampion?: boolean;
  isThird?: boolean;
}

function KoCard({ matchNum, byNum, us, onScore, isChampion, isThird }: KoCardProps) {
  const match = byNum[matchNum];
  const phase = isChampion ? 'final' : isThird ? 'third' : getPhase(matchNum);
  const pal   = PHASE_PALETTE[phase];

  if (!match) {
    return <div style={{ height: CARD_H, border: '1px solid rgba(30,41,59,0.4)', borderRadius: 12, background: pal.idle }} />;
  }

  const t1 = resolveRef(match.team1, byNum, us);
  const t2 = resolveRef(match.team2, byNum, us);
  const played    = !!match.score?.ft;
  const canEdit   = !played && !!(t1 && t2);
  const userScore = us[matchNum];
  const winner    = getWinner(matchNum, byNum, us);
  const isActive  = canEdit && !winner;

  let border: string;
  let shadow: string;
  let bg: string;

  if (winner) {
    border = pal.winnerBorder;
    shadow = pal.winnerShadow;
    bg     = pal.winner;
  } else if (isActive) {
    border = pal.activeBorder;
    shadow = pal.activeShadow;
    bg     = pal.active;
  } else {
    border = 'rgba(30,41,59,0.5)';
    shadow = 'none';
    bg     = pal.idle;
  }

  const handleScore = (idx: 0 | 1, n: number | undefined) => {
    if (!canEdit) return;
    const cur: [number, number] = userScore ?? [0, 0];
    const next: [number, number] = [cur[0], cur[1]];
    next[idx] = n ?? 0;
    onScore(matchNum, next);
  };

  return (
    <div style={{
      height: CARD_H, background: bg, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${border}`,
      boxShadow: shadow,
      transition: 'box-shadow 0.35s ease, border-color 0.35s ease, background 0.35s ease',
    }}>
      {([t1, t2] as const).map((team, i) => {
        const isW = !!(winner && winner === team);
        const sc  = played
          ? (i === 0 ? match.score!.ft![0] : match.score!.ft![1])
          : userScore?.[i as 0 | 1];

        let rowBg = 'transparent';
        if (isW) {
          rowBg = isChampion ? 'rgba(234,179,8,0.13)' : 'rgba(34,197,94,0.09)';
        }

        let nameColor = team ? '#e2e8f0' : '#1f2937';
        if (isW) nameColor = isChampion ? '#fde68a' : '#86efac';

        return (
          <div
            key={`${i}-${team ?? 'empty'}`}
            className="flex items-center gap-2 px-3"
            style={{
              height: CARD_H / 2,
              background: rowBg,
              borderBottom: i === 0 ? '1px solid rgba(30,41,59,0.5)' : undefined,
              transition: 'background 0.3s ease',
            }}
          >
            {team
              ? <Flag team={team} className="w-7 h-5 rounded-sm shrink-0"
                  style={{ animation: team ? 'bracketPop 0.35s ease' : undefined }} />
              : <span className="w-7 h-5 rounded-sm shrink-0 inline-block" style={{ background: 'rgba(15,23,42,0.7)' }} />
            }

            <span className="flex-1 truncate min-w-0 font-semibold"
              style={{ fontSize: 12, color: nameColor, animation: team ? 'bracketPop 0.35s ease' : undefined }}>
              {team ? teamPT(team) : '—'}
            </span>

            {isW && (
              <span style={{ animation: 'bracketPop 0.4s ease' }} className="shrink-0">
                {isChampion
                  ? <Trophy size={11} style={{ color: '#eab308' }} />
                  : <ChevronRight size={11} style={{ color: nameColor }} />
                }
              </span>
            )}

            {played ? (
              <span className="font-bold tabular-nums shrink-0"
                style={{ fontSize: 14, minWidth: 18, textAlign: 'right', color: isW ? nameColor : '#475569' }}>
                {sc ?? 0}
              </span>
            ) : canEdit ? (
              <ScoreInput value={sc} onChange={(n) => handleScore(i as 0 | 1, n)} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Bracket column ────────────────────────────────────────────────────────────
interface ColProps {
  nums: number[];
  byNum: Record<number, Match>;
  us: UserScores;
  onScore: (num: number, s: [number, number]) => void;
  label?: string;
}

function BracketCol({ nums, byNum, us, onScore, label }: ColProps) {
  const n = nums.length;
  const rowSpan = TOTAL_H / n;

  return (
    <div style={{ flex: 1, minWidth: CARD_W, height: TOTAL_H, position: 'relative' }}>
      {label && (
        <div style={{
          position: 'absolute', top: -24, left: 0, right: 0,
          textAlign: 'center', fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b',
        }}>
          {label}
        </div>
      )}
      {nums.map((num, i) => {
        const top = i * rowSpan + (rowSpan - CARD_H) / 2;
        return (
          <div key={num} style={{ position: 'absolute', top, left: 0, right: 0, height: CARD_H }}>
            <KoCard matchNum={num} byNum={byNum} us={us} onScore={onScore} />
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function Bracket({ matches }: Props) {
  const [us, setUs] = useState<UserScores>(() => {
    try { return JSON.parse(localStorage.getItem('wc2026_ko') ?? '{}'); }
    catch { return {}; }
  });

  const ko = useMemo(
    () => matches.filter((m) => !m.group).sort((a, b) => (a.num ?? 0) - (b.num ?? 0)),
    [matches],
  );

  const byNum = useMemo(() => {
    const map: Record<number, Match> = {};
    for (const m of ko) if (m.num) map[m.num] = m;
    return map;
  }, [ko]);

  const champion = resolveWinner(FINAL_NUM, byNum, us);

  const handleScore = (num: number, s: [number, number]) => {
    setUs((prev) => {
      const next = { ...prev, [num]: s };
      localStorage.setItem('wc2026_ko', JSON.stringify(next));
      return next;
    });
  };

  const handleSimulate = () => {
    setUs((prev) => {
      const next = simulate(ko, byNum, prev);
      localStorage.setItem('wc2026_ko', JSON.stringify(next));
      return next;
    });
  };

  const handleClear = () => { setUs({}); localStorage.removeItem('wc2026_ko'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {champion && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-2"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', animation: 'bracketPop 0.4s ease' }}>
            <Flag team={champion} className="w-9 h-6 rounded-sm" />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e' }}>
                Campeão Simulado
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fef08a' }}>{teamPT(champion)}</div>
            </div>
            <Trophy size={16} style={{ color: '#eab308', marginLeft: 4 }} />
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleSimulate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              border: '1px solid rgba(59,130,246,0.4)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(37,99,235,0.35), 0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            <Zap size={13} />
            Simular Aleatório
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}
          >
            <Trash2 size={13} />
            Limpar
          </button>
        </div>
      </div>

      {/* Bracket */}
      <div className="bracket-scroll overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' as const }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          paddingTop: 32, paddingBottom: 20, paddingLeft: 20, paddingRight: 20,
          gap: 0, width: '100%', minWidth: 1280,
        }}>
          <BracketCol nums={L_R32} byNum={byNum} us={us} onScore={handleScore} label="Fase 16" />
          <BracketFork fromCount={8} phase="r16" />
          <BracketCol nums={L_R16} byNum={byNum} us={us} onScore={handleScore} label="Oitavas" />
          <BracketFork fromCount={4} phase="qf" />
          <BracketCol nums={L_QF}  byNum={byNum} us={us} onScore={handleScore} label="Quartas" />
          <BracketFork fromCount={2} phase="sf" />
          <BracketCol nums={L_SF}  byNum={byNum} us={us} onScore={handleScore} label="Semifinal" />
          <HorizLine phase="sf" />

          <CenterSection byNum={byNum} us={us} onScore={handleScore} />

          <HorizLine phase="sf" />
          <BracketCol nums={R_SF}  byNum={byNum} us={us} onScore={handleScore} label="Semifinal" />
          <BracketFork fromCount={2} rtl phase="sf" />
          <BracketCol nums={R_QF}  byNum={byNum} us={us} onScore={handleScore} label="Quartas" />
          <BracketFork fromCount={4} rtl phase="qf" />
          <BracketCol nums={R_R16} byNum={byNum} us={us} onScore={handleScore} label="Oitavas" />
          <BracketFork fromCount={8} rtl phase="r16" />
          <BracketCol nums={R_R32} byNum={byNum} us={us} onScore={handleScore} label="Fase 16" />
        </div>
      </div>
    </div>
  );
}
