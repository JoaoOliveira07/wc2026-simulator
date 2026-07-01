import { useMemo } from 'react';
import type { Group, Match, Predictions, Prediction } from '../types';
import { calcStandings } from '../store/standings';
import { MatchRow } from './MatchRow';
import { Flag } from './Flag';
import { teamPT } from '../data/teamNames';

interface Props {
  group: Group;
  matches: Match[];
  predictions: Predictions;
  onPredict: (key: string, pred: Prediction) => void;
  onTeamClick: (team: string) => void;
  qualifiedThirds: Set<string>;
}

const GROUP_COLORS: Record<string, string> = {
  'Group A': '#3b82f6', 'Group B': '#10b981', 'Group C': '#f59e0b',
  'Group D': '#ef4444', 'Group E': '#8b5cf6', 'Group F': '#06b6d4',
  'Group G': '#f97316', 'Group H': '#ec4899', 'Group I': '#84cc16',
  'Group J': '#14b8a6', 'Group K': '#a78bfa', 'Group L': '#fb923c',
};

export function GroupCard({ group, matches, predictions, onPredict, onTeamClick, qualifiedThirds }: Props) {
  const groupMatches = useMemo(
    () => matches.filter((m) => m.group === group.name),
    [matches, group.name],
  );
  const standings = useMemo(
    () => calcStandings(group.teams, groupMatches, predictions),
    [group.teams, groupMatches, predictions],
  );

  const allDecided = useMemo(
    () => groupMatches.every(m => m.score?.ft || predictions[`${m.team1}|${m.team2}|${m.date}`]),
    [groupMatches, predictions],
  );

  const color = GROUP_COLORS[group.name] ?? '#6b7280';
  const letter = group.name.replace('Group ', '');

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex flex-col">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: `linear-gradient(135deg, ${color}22 0%, transparent 100%)`, borderBottom: `1px solid ${color}44` }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0"
          style={{ background: color }}
        >
          {letter}
        </div>
        <span className="font-semibold text-white text-sm">{group.name}</span>
        <span className="ml-auto text-xs text-slate-500">{groupMatches.filter(m => m.score?.ft).length}/{groupMatches.length} jogos</span>
      </div>

      {/* Standings */}
      <div className="px-3 pt-3 pb-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-600 text-[10px] uppercase tracking-wide">
              <th className="text-left pb-1.5 pl-8 font-medium">Seleção</th>
              <th className="pb-1.5 font-medium w-5 text-center">J</th>
              <th className="pb-1.5 font-medium w-5 text-center">V</th>
              <th className="pb-1.5 font-medium w-5 text-center">E</th>
              <th className="pb-1.5 font-medium w-5 text-center">D</th>
              <th className="pb-1.5 font-medium w-7 text-center">SG</th>
              <th className="pb-1.5 font-medium w-7 text-center" style={{ color }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const isTop2      = i < 2;
              const isThird     = i === 2;
              const isThirdQual = isThird && qualifiedThirds.has(s.team);
              const isQualified = isTop2 || isThirdQual;

              // Dim eliminated teams (4th place when all games decided, or 3rd not qualified when decided)
              const isEliminated = allDecided && (i === 3 || (i === 2 && !isThirdQual));
              const opacity = isEliminated ? 0.6 : 1;

              const dotColor  = isTop2 ? color : isThirdQual ? '#f59e0b' : undefined;
              const textColor = isEliminated
                ? '#374151'
                : isQualified ? '#f1f5f9' : isThird ? '#64748b' : '#475569';
              const ptsColor  = isEliminated ? '#374151' : isTop2 ? color : isThirdQual ? '#f59e0b' : '#475569';

              const borderTop = i === 2
                ? '1px dashed rgba(255,255,255,0.08)'
                : i === 3
                  ? '1px dashed rgba(255,255,255,0.05)'
                  : undefined;

              return (
                <tr key={s.team} style={{
                  borderTop,
                  color: textColor,
                  opacity,
                  transition: 'opacity 0.4s ease',
                }}>
                  <td className="py-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={dotColor
                          ? { background: dotColor, color: '#fff' }
                          : { color: isEliminated ? '#1f2937' : '#374151' }}
                      >
                        {i + 1}
                      </span>
                      <Flag team={s.team} className="w-7 h-5 rounded-sm"
                        style={{ filter: isEliminated ? 'grayscale(0.7)' : undefined, transition: 'filter 0.4s ease' }} />
                      <span
                        className="truncate max-w-[90px] text-xs cursor-pointer hover:text-white hover:underline"
                        onClick={() => onTeamClick(s.team)}
                        style={{ color: 'inherit' }}
                      >{teamPT(s.team)}</span>
                      {isThird && (
                        <span style={{
                          fontSize: 8, fontWeight: 800, padding: '1px 4px',
                          borderRadius: 3, marginLeft: 2, letterSpacing: '0.04em', flexShrink: 0,
                          background: isThirdQual ? 'rgba(245,158,11,0.18)' : 'rgba(71,85,105,0.25)',
                          color: isThirdQual ? '#f59e0b' : '#475569',
                          border: `1px solid ${isThirdQual ? 'rgba(245,158,11,0.35)' : 'rgba(71,85,105,0.3)'}`,
                        }}>
                          {isThirdQual ? 'CLASSIF.' : '3° LUG.'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-1 tabular-nums">{s.played}</td>
                  <td className="text-center py-1 tabular-nums">{s.won}</td>
                  <td className="text-center py-1 tabular-nums">{s.drawn}</td>
                  <td className="text-center py-1 tabular-nums">{s.lost}</td>
                  <td className="text-center py-1 tabular-nums">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                  <td className="text-center py-1 font-bold tabular-nums" style={{ color: ptsColor }}>
                    {s.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Separator */}
      <div className="mx-3 border-t border-slate-800" />

      {/* Matches */}
      <div className="px-1 py-2 flex-1 overflow-hidden">
        {groupMatches.map((m) => (
          <MatchRow
            key={`${m.team1}-${m.team2}-${m.date}`}
            match={m}
            predictions={predictions}
            onPredict={onPredict}
          />
        ))}
      </div>
    </div>
  );
}
