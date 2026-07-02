import { useState, useMemo, useEffect, useRef } from 'react';
import { Trophy, Zap, Trash2, ChevronRight, Share2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toBlob } from 'html-to-image';
import type { Match } from '../types';
import type { ESPNMatch } from '../data/espnApi';
import { teamsMatch } from '../data/espnApi';
import { Flag } from './Flag';
import { ScoreInput } from './ScoreInput';
import trofeuImg from '../assets/trofeu_copa.png';
import { teamPT } from '../data/teamNames';
import { getWinner, resolveRef, resolveWinner, simulate, type UserScores } from '../store/knockout';
import { buildShareURL } from '../utils/shareState';

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

interface Props { matches: Match[]; liveMatches?: ESPNMatch[] }

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


// ── Live match detection ──────────────────────────────────────────────────────

function matchTeams(t1: string | null, t2: string | null, e: ESPNMatch): boolean {
  if (!t1 || !t2) return false;
  return (teamsMatch(e.home.name, t1) && teamsMatch(e.away.name, t2)) ||
         (teamsMatch(e.home.name, t2) && teamsMatch(e.away.name, t1));
}

function findLiveESPN(t1: string | null, t2: string | null, liveMatches: ESPNMatch[]): ESPNMatch | null {
  if (!t1 || !t2 || !liveMatches.length) return null;
  return liveMatches.find(e =>
    (e.status === 'live' || e.status === 'halftime') && matchTeams(t1, t2, e),
  ) ?? null;
}

function findESPNByTeams(t1: string | null, t2: string | null, espnAll: ESPNMatch[]): ESPNMatch | null {
  if (!t1 || !t2 || !espnAll.length) return null;
  return espnAll.find(e => matchTeams(t1, t2, e)) ?? null;
}

// ── Center trophy section ─────────────────────────────────────────────────────
interface CenterProps {
  byNum: Record<number, Match>;
  us: UserScores;
  onScore: (num: number, s: [number, number]) => void;
  liveMatches?: ESPNMatch[];
  hasChampion?: boolean;
  champion?: string | null;
}

function CenterSection({ byNum, us, onScore, liveMatches, hasChampion, champion }: CenterProps) {
  const imgSize = 148;

  const lineY        = TOTAL_H / 2;
  const finalCardTop = lineY - CARD_H / 2;
  const trophyTop = (finalCardTop - imgSize) / 2;

  const thirdLabelY  = finalCardTop + CARD_H + 8;
  const thirdCardTop = thirdLabelY + 14;

  const miniLabel: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  };

  return (
    <div style={{ width: CENTER_W, height: TOTAL_H, position: 'relative', flexShrink: 0 }}>

      {/* "FINAL" column header */}
      <div style={{
        position: 'absolute', top: -24, left: 0, right: 0,
        textAlign: 'center', fontSize: 10, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        color: '#b45309',
      }}>
        Final
      </div>

      {/* Trophy — pulses when champion is known */}
      <div style={{ position: 'absolute', top: trophyTop, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <img
          src={trofeuImg}
          alt="Troféu"
          style={{
            width: imgSize, height: imgSize,
            animation: hasChampion
              ? 'championGlow 2s ease-in-out infinite'
              : undefined,
            filter: hasChampion
              ? undefined
              : 'drop-shadow(0 0 16px rgba(234,179,8,0.55)) drop-shadow(0 4px 10px rgba(0,0,0,0.6))',
            transition: 'filter 0.5s ease',
          }}
        />
      </div>

      {/* Champion below trophy */}
      {champion && (
        <div style={{
          position: 'absolute',
          top: trophyTop + imgSize + 4,
          left: 8, right: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          animation: 'bracketPop 0.4s ease',
          background: 'linear-gradient(180deg, rgba(234,179,8,0.18) 0%, rgba(234,179,8,0.07) 100%)',
          border: '1px solid rgba(234,179,8,0.45)',
          borderRadius: 10,
          padding: '8px 12px',
          boxShadow: '0 0 24px rgba(234,179,8,0.25), inset 0 0 12px rgba(234,179,8,0.06)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#fbbf24' }}>
            🏆 Campeão
          </div>
          <Flag team={champion} style={{ width: 40, height: 27, borderRadius: 3, objectFit: 'cover', boxShadow: '0 1px 6px rgba(0,0,0,0.5)' }} />
          <span style={{ fontSize: 15, fontWeight: 900, color: '#fef08a', textAlign: 'center', textShadow: '0 0 12px rgba(234,179,8,0.6)' }}>
            {teamPT(champion)}
          </span>
        </div>
      )}

      {/* Final card */}
      <div style={{ position: 'absolute', top: finalCardTop, left: 4, right: 4, height: CARD_H }}>
        <KoCard matchNum={FINAL_NUM} byNum={byNum} us={us} onScore={onScore} isChampion liveMatches={liveMatches} />
      </div>

      {/* 3° Lugar */}
      <div style={{ ...miniLabel, top: thirdLabelY, color: '#374151' }}>3° Lugar</div>
      <div style={{ position: 'absolute', top: thirdCardTop, left: 4, right: 4, height: CARD_H }}>
        <KoCard matchNum={THIRD_NUM} byNum={byNum} us={us} onScore={onScore} isThird liveMatches={liveMatches} />
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
  liveMatches?: ESPNMatch[];
}

function KoCard({ matchNum, byNum, us, onScore, isChampion, isThird, liveMatches }: KoCardProps) {
  const match = byNum[matchNum];
  const phase = isChampion ? 'final' : isThird ? 'third' : getPhase(matchNum);
  const pal   = PHASE_PALETTE[phase];

  if (!match) {
    return <div style={{ height: CARD_H, border: '1px solid rgba(30,41,59,0.4)', borderRadius: 12, background: pal.idle }} />;
  }

  const t1 = resolveRef(match.team1, byNum, us, liveMatches ?? []);
  const t2 = resolveRef(match.team2, byNum, us, liveMatches ?? []);
  const espnMatch = findESPNByTeams(t1, t2, liveMatches ?? []);
  const played    = !!match.score?.ft || espnMatch?.status === 'final';
  const canEdit   = !played && !!(t1 && t2);
  const userScore = us[matchNum];
  const winner    = getWinner(matchNum, byNum, us, liveMatches ?? []);
  const isActive  = canEdit && !winner;

  const liveEspn  = !played ? findLiveESPN(t1, t2, liveMatches ?? []) : null;
  const isLive    = !!liveEspn;

  const espnForScore = espnMatch;
  const isHomeT1  = espnForScore ? espnForScore.home.name.toLowerCase().includes((t1 ?? '').toLowerCase()) : false;
  const liveScore1 = espnForScore && espnForScore.home.score != null ? Number(isHomeT1 ? espnForScore.home.score : espnForScore.away.score) : undefined;
  const liveScore2 = espnForScore && espnForScore.away.score != null ? Number(isHomeT1 ? espnForScore.away.score : espnForScore.home.score) : undefined;
  const tentativeWinner = isLive && liveScore1 !== undefined && liveScore2 !== undefined && liveScore1 !== liveScore2
    ? (liveScore1 > liveScore2 ? t1 : t2) : null;

  let border: string;
  let shadow: string;
  let bg: string;

  if (isLive) {
    border = 'rgba(239,68,68,0.55)';
    shadow = '0 0 18px rgba(239,68,68,0.2)';
    bg     = 'rgba(239,68,68,0.05)';
  } else if (winner) {
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
      position: 'relative',
      transition: 'box-shadow 0.35s ease, border-color 0.35s ease, background 0.35s ease',
    }}>
      {/* Live pulsing dot */}
      {isLive && (
        <div style={{
          position: 'absolute', top: 5, right: 7, zIndex: 2,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%', background: '#ef4444',
            animation: 'livePulse 1.4s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 7, fontWeight: 900, color: '#ef4444', letterSpacing: '0.08em' }}>
            {liveEspn?.status === 'halftime' ? 'INT' : liveEspn?.shortDetail ?? 'AO VIVO'}
          </span>
        </div>
      )}

      {([t1, t2] as const).map((team, i) => {
        const effectiveWinner = isLive ? tentativeWinner : winner;
        const isW = !!(effectiveWinner && effectiveWinner === team);
        const isTentative = isLive && isW;

        const sc = played
          ? (match.score?.ft
              ? (i === 0 ? match.score.ft[0] : match.score.ft[1])
              : (i === 0 ? liveScore1 : liveScore2))
          : isLive
            ? (i === 0 ? liveScore1 : liveScore2)
            : userScore?.[i as 0 | 1];

        let rowBg = 'transparent';
        if (isW && !isTentative) rowBg = isChampion ? 'rgba(234,179,8,0.13)' : 'rgba(34,197,94,0.09)';
        if (isTentative) rowBg = 'rgba(239,68,68,0.07)';

        let nameColor = team ? '#e2e8f0' : '#1f2937';
        if (isW && !isTentative) nameColor = isChampion ? '#fde68a' : '#86efac';
        if (isTentative) nameColor = '#fca5a5';

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
                  style={{ animation: 'bracketPop 0.35s ease' }} />
              : <span className="w-7 h-5 rounded-sm shrink-0 inline-block" style={{ background: 'rgba(15,23,42,0.7)' }} />
            }

            <span className="flex-1 truncate min-w-0 font-semibold"
              style={{ fontSize: 12, color: nameColor, animation: team ? 'bracketPop 0.35s ease' : undefined }}>
              {team ? teamPT(team) : '—'}
            </span>

            {isW && !isTentative && (
              <span style={{ animation: 'bracketPop 0.4s ease' }} className="shrink-0">
                {isChampion
                  ? <Trophy size={11} style={{ color: '#eab308' }} />
                  : <ChevronRight size={11} style={{ color: nameColor }} />
                }
              </span>
            )}

            {isTentative && (
              <ChevronRight size={11} style={{ color: '#ef4444', opacity: 0.5 }} className="shrink-0" />
            )}

            {(played || isLive) ? (
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
  liveMatches?: ESPNMatch[];
}

function BracketCol({ nums, byNum, us, onScore, label, liveMatches }: ColProps) {
  const n = nums.length;
  const rowSpan = TOTAL_H / n;

  return (
    <div style={{ flex: 1, minWidth: CARD_W, height: TOTAL_H, position: 'relative' }}>
      {label && (
        <div style={{ position: 'absolute', top: -30, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{
            display: 'inline-block',
            fontSize: 9, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b',
            background: 'linear-gradient(135deg,#1a2332,#0f172a)',
            border: '1px solid #1e293b', borderRadius: 6,
            padding: '3px 10px',
          }}>
            {label}
          </span>
        </div>
      )}
      {nums.map((num, i) => {
        const top = i * rowSpan + (rowSpan - CARD_H) / 2;
        return (
          <div key={num} style={{ position: 'absolute', top, left: 0, right: 0, height: CARD_H }}>
            <KoCard matchNum={num} byNum={byNum} us={us} onScore={onScore} liveMatches={liveMatches} />
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function Bracket({ matches, liveMatches }: Props) {
  const [us, setUs] = useState<UserScores>(() => {
    try { return JSON.parse(localStorage.getItem('wc2026_ko') ?? '{}'); }
    catch { return {}; }
  });
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'shared'>('idle');
  const bracketRef = useRef<HTMLDivElement>(null);
  // Blob pré-capturado em background — permite passar a imagem ao navigator.share()
  // como primeiro await (obrigatório no iOS para manter o contexto de gesto)
  const capturedBlobRef = useRef<Blob | null>(null);

  const ko = useMemo(
    () => matches.filter((m) => !m.group).sort((a, b) => (a.num ?? 0) - (b.num ?? 0)),
    [matches],
  );

  const byNum = useMemo(() => {
    const map: Record<number, Match> = {};
    for (const m of ko) if (m.num) map[m.num] = m;
    return map;
  }, [ko]);

  const champion = useMemo(
    () => resolveWinner(FINAL_NUM, byNum, us, liveMatches),
    [byNum, us, liveMatches],
  );

  // Fire confetti when champion is first determined
  const prevChampion = useRef<string | null>(null);
  useEffect(() => {
    if (champion && champion !== prevChampion.current) {
      confetti({ particleCount: 180, spread: 75, origin: { y: 0.55 }, colors: ['#FFD700', '#FFA500', '#fff', '#22c55e', '#fbbf24'] });
      setTimeout(() => {
        confetti({ particleCount: 90, angle: 60, spread: 50, origin: { x: 0 }, colors: ['#FFD700', '#FFA500', '#fff'] });
        confetti({ particleCount: 90, angle: 120, spread: 50, origin: { x: 1 }, colors: ['#FFD700', '#FFA500', '#fff'] });
      }, 350);
    }
    prevChampion.current = champion ?? null;
  }, [champion]);

  // Pré-captura o screenshot em background sempre que os scores mudam.
  // Assim, quando o utilizador clica "Compartilhar", a imagem já está pronta
  // e pode ser passada ao navigator.share() como primeiro await (iOS).
  useEffect(() => {
    if (!bracketRef.current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const el = bracketRef.current;
        if (!el || cancelled) return;
        const blob = await toBlob(el, {
          backgroundColor: '#020617',
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          width: el.scrollWidth,
          height: el.scrollHeight,
          cacheBust: false,
        });
        if (!cancelled) capturedBlobRef.current = blob ?? null;
      } catch {
        // silencioso — fallback para texto+URL no share
      }
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [us]);

  const handleScore = (num: number, s: [number, number]) => {
    setUs((prev) => {
      const next = { ...prev, [num]: s };
      localStorage.setItem('wc2026_ko', JSON.stringify(next));
      return next;
    });
  };

  const handleSimulate = () => {
    setUs((prev) => {
      const next = simulate(ko, byNum, prev, liveMatches);
      localStorage.setItem('wc2026_ko', JSON.stringify(next));
      return next;
    });
  };

  const handleClear = () => { setUs({}); localStorage.removeItem('wc2026_ko'); };

  const handleShare = async () => {
    if (shareStatus === 'sharing') return;
    setShareStatus('sharing');

    const preds = JSON.parse(localStorage.getItem('wc2026_predictions') ?? '{}');
    const shareURL = buildShareURL(preds, us);
    const shareText = 'Confira minha simulação da Copa 2026';

    // Capacidades detectadas sincronamente (sem await)
    const hasMobileShare = typeof navigator.share === 'function';
    const probeFile = new File([], 'x.png', { type: 'image/png' });
    const canShareFiles = hasMobileShare && (navigator.canShare?.({ files: [probeFile] }) ?? false);

    // Blob pré-capturado disponível sincronamente
    const preBlob = capturedBlobRef.current;

    try {
      if (hasMobileShare) {
        if (preBlob && canShareFiles) {
          // Imagem já pronta → File criado sincronamente → navigator.share é o PRIMEIRO await.
          // Funciona em iOS porque não há nenhum await antes deste ponto.
          const imageFile = new File([preBlob], 'copa2026.png', { type: 'image/png' });
          try {
            await navigator.share({ files: [imageFile], title: shareText, text: shareText, url: shareURL });
            return;
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            // Fallback: share só texto+URL
          }
        }
        // Sem imagem ou canShareFiles=false → share texto+URL (primeiro await → funciona no iOS)
        await navigator.share({ title: shareText, text: shareText, url: shareURL });
        return;
      }

      // Desktop: usa blob pré-capturado ou captura agora
      const blob = preBlob ?? (bracketRef.current ? await toBlob(bracketRef.current, {
        backgroundColor: '#020617',
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: bracketRef.current.scrollWidth,
        height: bracketRef.current.scrollHeight,
      }) : null);

      if (blob) {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `copa2026-chave${champion ? '-' + champion.toLowerCase().replace(/\s/g, '_') : ''}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
      }

      try {
        await navigator.clipboard.writeText(`${shareText}: ${shareURL}`);
      } catch {
        window.prompt('Copie o link da sua simulação:', shareURL);
      }
      setShareStatus('shared');
      setTimeout(() => setShareStatus('idle'), 2500);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Share failed:', err);
      window.prompt('Copie o link da sua simulação:', shareURL);
    } finally {
      setShareStatus(s => s === 'sharing' ? 'idle' : s);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3" style={{ width: '100%', maxWidth: 1760, padding: '0 20px' }}>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleSimulate}
            className="flex items-center gap-1.5 rounded-lg font-bold transition-all"
            style={{
              padding: '6px 10px',
              background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              border: '1px solid rgba(59,130,246,0.4)',
              color: '#fff', fontSize: 12,
              boxShadow: '0 0 16px rgba(37,99,235,0.35), 0 2px 4px rgba(0,0,0,0.4)',
              cursor: 'pointer',
            }}
          >
            <Zap size={13} />
            <span className="hidden sm:inline">Simular Aleatório</span>
          </button>
          <button
            onClick={handleShare}
            disabled={shareStatus === 'sharing'}
            className="flex items-center gap-1.5 rounded-lg font-semibold transition-all"
            style={{
              padding: '6px 10px',
              background: shareStatus === 'shared' ? 'rgba(34,197,94,0.15)' : shareStatus === 'sharing' ? 'rgba(99,102,241,0.2)' : '#1e293b',
              border: shareStatus === 'shared' ? '1px solid rgba(34,197,94,0.4)' : shareStatus === 'sharing' ? '1px solid rgba(99,102,241,0.5)' : '1px solid #334155',
              color: shareStatus === 'shared' ? '#86efac' : shareStatus === 'sharing' ? '#a5b4fc' : '#94a3b8',
              fontSize: 12,
              cursor: shareStatus === 'sharing' ? 'wait' : 'pointer',
              transition: 'all 0.25s ease',
              opacity: shareStatus === 'sharing' ? 0.7 : 1,
            }}
            title="Compartilhar simulação"
          >
            {shareStatus === 'shared' ? <Check size={13} /> : <Share2 size={13} />}
            <span className="hidden sm:inline">
              {shareStatus === 'sharing' ? 'Aguarde…' : shareStatus === 'shared' ? 'Copiado!' : 'Compartilhar'}
            </span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg font-semibold"
            style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', color: '#64748b', fontSize: 12, cursor: 'pointer' }}
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <div className="flex sm:hidden items-center gap-1 px-1" style={{ color: '#334155', fontSize: 10, width: '100%' }}>
        <ChevronRight size={10} />
        <span>Role para ver o bracket completo</span>
      </div>

      {/* Bracket scroll container */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as const, display: 'flex', width: '100%', maxWidth: '100vw' }}>
        <div ref={bracketRef} style={{
          display: 'flex', alignItems: 'flex-start',
          marginLeft: 'auto', marginRight: 'auto',
          paddingTop: 32, paddingBottom: 20, paddingLeft: 20, paddingRight: 20,
          gap: 0, minWidth: 1280,
          background: '#020617',
        }}>
          <BracketCol nums={L_R32} byNum={byNum} us={us} onScore={handleScore} label="Fase 16" liveMatches={liveMatches} />
          <BracketFork fromCount={8} phase="r16" />
          <BracketCol nums={L_R16} byNum={byNum} us={us} onScore={handleScore} label="Oitavas" liveMatches={liveMatches} />
          <BracketFork fromCount={4} phase="qf" />
          <BracketCol nums={L_QF}  byNum={byNum} us={us} onScore={handleScore} label="Quartas" liveMatches={liveMatches} />
          <BracketFork fromCount={2} phase="sf" />
          <BracketCol nums={L_SF}  byNum={byNum} us={us} onScore={handleScore} label="Semifinal" liveMatches={liveMatches} />
          <HorizLine phase="sf" />

          <CenterSection byNum={byNum} us={us} onScore={handleScore} liveMatches={liveMatches} hasChampion={!!champion} champion={champion} />

          <HorizLine phase="sf" />
          <BracketCol nums={R_SF}  byNum={byNum} us={us} onScore={handleScore} label="Semifinal" liveMatches={liveMatches} />
          <BracketFork fromCount={2} rtl phase="sf" />
          <BracketCol nums={R_QF}  byNum={byNum} us={us} onScore={handleScore} label="Quartas" liveMatches={liveMatches} />
          <BracketFork fromCount={4} rtl phase="qf" />
          <BracketCol nums={R_R16} byNum={byNum} us={us} onScore={handleScore} label="Oitavas" liveMatches={liveMatches} />
          <BracketFork fromCount={8} rtl phase="r16" />
          <BracketCol nums={R_R32} byNum={byNum} us={us} onScore={handleScore} label="Fase 16" liveMatches={liveMatches} />
        </div>
      </div>
    </div>
  );
}
