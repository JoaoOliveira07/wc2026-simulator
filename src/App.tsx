import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Trophy, CalendarDays, BarChart2, TrendingUp } from 'lucide-react';
import logoImg from './assets/image-removebg-preview.png';
import { fetchGroups, fetchMatches } from './data/api';
import { fetchESPNToday } from './data/espnApi';
import { usePredictions } from './store/usePredictions';
import { calcStandings } from './store/standings';
import { GroupCard } from './components/GroupCard';
import { Bracket } from './components/Bracket';
import { TeamModal } from './components/TeamModal';
import { TopScorers } from './components/TopScorers';
import { LiveBanner } from './components/LiveBanner';
import { MatchesTab } from './components/MatchesTab';
import { StatsTab } from './components/StatsTab';
import { ToastContainer, useToasts, useClassificationTracker } from './components/ClassificationToast';
import type { Match } from './types';

type Tab = 'groups' | 'bracket' | 'jogos' | 'artilheiros' | 'stats';

function predKey(m: Match) {
  return `${m.team1}|${m.team2}|${m.date}`;
}


export default function App() {
  const [tab, setTab] = useState<Tab>('groups');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const { data: groupsData, isLoading: loadingGroups, error: errGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    staleTime: 60_000,
    refetchInterval: 3 * 60_000,
  });

  const { data: matchesData, isLoading: loadingMatches, error: errMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });

  const { data: espnData = [] } = useQuery({
    queryKey: ['espn-today'],
    queryFn: fetchESPNToday,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { predictions, setPrediction } = usePredictions();

  const loading = loadingGroups || loadingMatches;
  const error = errGroups || errMatches;

  const groupMatches = matchesData?.matches.filter((m) => m.group) ?? [];
  const playedCount = groupMatches.filter((m) => m.score?.ft).length;
  const totalGroupMatches = groupMatches.length;
  const predictedCount = groupMatches.filter(
    (m) => !m.score?.ft && predictions[predKey(m)],
  ).length;

  const qualifiedThirds = useMemo<Set<string>>(() => {
    if (!groupsData || !matchesData) return new Set();
    const thirds = groupsData.groups.map((g) => {
      const gm = matchesData.matches.filter((m) => m.group === g.name);
      const standings = calcStandings(g.teams, gm, predictions);
      return standings[2];
    }).filter(Boolean);
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return new Set(thirds.slice(0, 8).map((s) => s.team));
  }, [groupsData, matchesData, predictions]);

  // All currently qualified teams (for toast tracking)
  const allQualified = useMemo<Set<string>>(() => {
    if (!groupsData || !matchesData) return new Set();
    const q = new Set<string>();
    for (const g of groupsData.groups) {
      const gm = matchesData.matches.filter(m => m.group === g.name);
      const standings = calcStandings(g.teams, gm, predictions);
      // Only show as qualified if enough games played to confirm
      if (standings[0]) q.add(standings[0].team);
      if (standings[1]) q.add(standings[1].team);
    }
    qualifiedThirds.forEach(t => q.add(t));
    return q;
  }, [groupsData, matchesData, predictions, qualifiedThirds]);

  const { toasts, addToast } = useToasts();
  useClassificationTracker(allQualified, addToast);

  const NAV_TABS: { id: Tab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'groups',      label: 'Fase de Grupos', shortLabel: 'Grupos',     icon: <Layers size={12} /> },
    { id: 'jogos',       label: 'Confrontos',      shortLabel: 'Jogos',      icon: <CalendarDays size={12} /> },
    { id: 'bracket',     label: 'Chaveamento',     shortLabel: 'Chave',      icon: <Trophy size={12} /> },
    { id: 'artilheiros', label: 'Artilheiros',     shortLabel: 'Gols',       icon: <BarChart2 size={12} /> },
    { id: 'stats',       label: 'Estatísticas',    shortLabel: 'Stats',      icon: <TrendingUp size={12} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Header */}
      <header
        className="border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md"
        style={{ background: 'rgba(2,6,23,0.97)', position: 'relative', overflow: 'hidden' }}
      >
        {/* Ambient glow — brand signature */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 320px 80px at 10% 50%, rgba(22,163,74,0.08) 0%, transparent 100%)',
        }} />

        {/* Mobile: 2-row */}
        <div className="md:hidden px-4" style={{ position: 'relative' }}>
          <div className="flex items-center h-11">
            <img
              src={logoImg}
              alt="Copa do Mundo 2026 Simulador"
              style={{ height: 32, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(22,163,74,0.3))' }}
            />
          </div>
          <div className="flex justify-center pb-2">
            <nav className="flex gap-0.5 rounded-xl p-1" style={{ background: '#020c18', border: '1px solid rgba(30,41,59,0.8)' }}>
              {NAV_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
                  style={tab === t.id
                    ? {
                        background: 'rgba(34,197,94,0.12)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.25)',
                        boxShadow: '0 0 8px rgba(34,197,94,0.12)',
                        cursor: 'pointer',
                      }
                    : { color: '#334155', cursor: 'pointer', border: '1px solid transparent' }}
                >
                  {t.icon}
                  {t.shortLabel}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Desktop: 3-col grid */}
        <div
          className="hidden md:grid max-w-screen-2xl mx-auto px-5"
          style={{ gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', height: 56, position: 'relative' }}
        >
          {/* Wordmark */}
          <div className="flex items-center">
            <img
              src={logoImg}
              alt="Copa do Mundo 2026 Simulador"
              style={{ height: 44, objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(22,163,74,0.3))' }}
            />
          </div>

          {/* Nav */}
          <nav className="flex gap-0.5 rounded-xl p-1" style={{ background: '#020c18', border: '1px solid rgba(30,41,59,0.8)' }}>
            {NAV_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
                style={tab === t.id
                  ? {
                      background: 'rgba(34,197,94,0.12)',
                      color: '#4ade80',
                      border: '1px solid rgba(34,197,94,0.25)',
                      boxShadow: '0 0 10px rgba(34,197,94,0.1)',
                      cursor: 'pointer',
                    }
                  : { color: '#334155', cursor: 'pointer', border: '1px solid transparent' }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Progress */}
          <div className="flex justify-end">
            {!loading && !error && (
              <div className="flex flex-col gap-1" style={{ width: 200 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 9, color: '#1e3a2e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Fase de Grupos
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: playedCount === totalGroupMatches ? '#22c55e' : '#1e3a5f', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {playedCount + predictedCount}/{totalGroupMatches}
                  </span>
                </div>
                <div className="h-0.5 rounded-full overflow-hidden" style={{ background: '#0d1f12' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((playedCount + predictedCount) / (totalGroupMatches || 1)) * 100}%`,
                      background: playedCount === totalGroupMatches
                        ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                        : 'linear-gradient(90deg,#1d4ed8,#3b82f6)',
                      boxShadow: playedCount === totalGroupMatches ? '0 0 6px rgba(74,222,128,0.5)' : '0 0 6px rgba(59,130,246,0.5)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <LiveBanner />
      </header>

      <main className={`mx-auto ${tab === 'bracket' ? 'px-2 w-full pt-3' : tab === 'jogos' ? 'max-w-screen-2xl px-4 pt-4 pb-6' : 'max-w-screen-2xl px-4 py-6'}`}>
        {loading && (
          <div className="flex items-center justify-center py-32 gap-3">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Carregando dados da Copa 2026...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-32">
            <p className="text-red-400 font-medium">Erro ao carregar dados</p>
            <p className="text-slate-600 text-sm mt-1">Verifique sua conexão.</p>
          </div>
        )}

        {tab === 'artilheiros' && (
          <div key="artilheiros" style={{ animation: 'fadeSlideUp 0.25s ease both' }}>
            <TopScorers />
          </div>
        )}

        {!loading && !error && groupsData && matchesData && (
          <>
            {tab === 'groups' && (
              <div key="groups" style={{ animation: 'fadeSlideUp 0.25s ease both' }}>
                <div className="flex items-center gap-2 text-xs mb-5">
                  <span className="text-slate-500">{groupsData.groups.length} grupos</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-green-500 font-medium">{playedCount} jogados</span>
                  {predictedCount > 0 && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-blue-400 font-medium">{predictedCount} simulados</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {groupsData.groups.map((group, i) => (
                    <div key={group.name} style={{ animation: 'fadeSlideUp 0.35s ease both', animationDelay: `${i * 0.04}s`, opacity: 0, animationFillMode: 'both' }}>
                      <GroupCard
                        group={group}
                        matches={matchesData.matches}
                        predictions={predictions}
                        onPredict={setPrediction}
                        onTeamClick={setSelectedTeam}
                        qualifiedThirds={qualifiedThirds}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'jogos' && (
              <div key="jogos" style={{ animation: 'fadeSlideUp 0.25s ease both' }}>
                <MatchesTab matches={matchesData.matches} liveMatches={espnData} />
              </div>
            )}

            {tab === 'bracket' && (
              <div key="bracket" style={{ animation: 'fadeSlideUp 0.25s ease both' }}>
                <Bracket matches={matchesData.matches} liveMatches={espnData} />
              </div>
            )}

            {tab === 'stats' && (
              <div key="stats" style={{ animation: 'fadeSlideUp 0.25s ease both' }}>
                <StatsTab
                  groups={groupsData.groups}
                  matches={matchesData.matches}
                  predictions={predictions}
                  espnAll={espnData}
                />
              </div>
            )}
          </>
        )}
      </main>

      <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      <ToastContainer toasts={toasts} />
    </div>
  );
}
