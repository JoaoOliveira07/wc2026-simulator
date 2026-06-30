import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Trophy } from 'lucide-react';
import { fetchGroups, fetchMatches } from './data/api';
import { usePredictions } from './store/usePredictions';
import { calcStandings } from './store/standings';
import { GroupCard } from './components/GroupCard';
import { Bracket } from './components/Bracket';
import { TeamModal } from './components/TeamModal';
import { LiveBanner } from './components/LiveBanner';
import type { Prediction, Match } from './types';

type Tab = 'groups' | 'bracket';

function predKey(m: Match) {
  return `${m.team1}|${m.team2}|${m.date}`;
}


// Simple football SVG icon
function FootballIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2c0 0-2 4-2 10s2 10 2 10" />
      <path d="M2 12h20" />
      <path d="M4.93 6.5l14.14 11M4.93 17.5L19.07 6.5" strokeDasharray="2 3" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('groups');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const { data: groupsData, isLoading: loadingGroups, error: errGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    staleTime: 5 * 60 * 1000,
  });

  const { data: matchesData, isLoading: loadingMatches, error: errMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
    staleTime: 5 * 60 * 1000,
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

  // Compute best 8 third-place qualifiers (WC 2026: top-2 + 8 best 3rds → R32)
  const qualifiedThirds = useMemo<Set<string>>(() => {
    if (!groupsData || !matchesData) return new Set();
    const thirds = groupsData.groups.map((g) => {
      const gm = matchesData.matches.filter((m) => m.group === g.name);
      const standings = calcStandings(g.teams, gm, predictions);
      return standings[2]; // 3rd place
    }).filter(Boolean);
    // Sort: pts → gd → gf
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return new Set(thirds.slice(0, 8).map((s) => s.team));
  }, [groupsData, matchesData, predictions]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header
        className="border-b border-slate-800/60 sticky top-0 z-10 backdrop-blur-md"
        style={{ background: 'rgba(2,6,23,0.96)' }}
      >
        <div
          className="max-w-screen-2xl mx-auto px-5"
          style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', height: 56 }}
        >
          {/* Left: Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#16a34a,#065f46)', boxShadow: '0 0 12px rgba(22,163,74,0.3)' }}
            >
              <FootballIcon size={17} />
            </div>
            <div className="leading-none">
              <span className="font-black text-white" style={{ fontSize: 14, letterSpacing: '-0.01em' }}>
                Copa 2026
              </span>
              <span className="ml-2 font-medium" style={{ fontSize: 11, color: '#334155' }}>·</span>
              <span className="ml-2 font-semibold" style={{ fontSize: 11, color: '#475569' }}>
                Simulador
              </span>
            </div>
          </div>

          {/* Center: Tabs — always fixed, never shifts */}
          <nav
            className="flex gap-1 rounded-xl p-1"
            style={{ background: '#0f172a', border: '1px solid #1e293b' }}
          >
            <button
              onClick={() => setTab('groups')}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={tab === 'groups'
                ? { background: '#1e293b', color: '#f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }
                : { color: '#475569' }}
            >
              <Layers size={12} />
              Fase de Grupos
            </button>
            <button
              onClick={() => setTab('bracket')}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={tab === 'bracket'
                ? { background: '#1e293b', color: '#f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }
                : { color: '#475569' }}
            >
              <Trophy size={12} />
              Chaveamento
            </button>
          </nav>

          {/* Right: Progress — fixed width slot, never shifts nav */}
          <div className="flex justify-end">
            {!loading && !error && (
              <div className="hidden md:flex flex-col gap-1" style={{ width: 200 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Fase de Grupos
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: playedCount === totalGroupMatches ? '#22c55e' : '#475569' }}>
                    {playedCount + predictedCount}/{totalGroupMatches}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((playedCount + predictedCount) / (totalGroupMatches || 1)) * 100}%`,
                      background: playedCount === totalGroupMatches
                        ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                        : 'linear-gradient(90deg,#1d4ed8,#3b82f6)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <LiveBanner />
      </header>

      <main className={`mx-auto ${tab === 'bracket' ? 'px-2 w-full pt-3' : 'max-w-screen-2xl px-4 py-6'}`}>
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

        {!loading && !error && groupsData && matchesData && (
          <>
            {tab === 'groups' && (
              <div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {groupsData.groups.map((group) => (
                    <GroupCard
                      key={group.name}
                      group={group}
                      matches={matchesData.matches}
                      predictions={predictions}
                      onPredict={setPrediction}
                      onTeamClick={setSelectedTeam}
                      qualifiedThirds={qualifiedThirds}
                    />
                  ))}
                </div>
              </div>
            )}

            {tab === 'bracket' && (
              <Bracket matches={matchesData.matches} />
            )}
          </>
        )}
      </main>
      <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
    </div>
  );
}
