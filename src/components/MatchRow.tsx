import type { Match, Predictions, Prediction } from '../types';
import { Flag } from './Flag';
import { ScoreInput } from './ScoreInput';
import { teamPT } from '../data/teamNames';

interface Props {
  match: Match;
  predictions: Predictions;
  onPredict: (key: string, pred: Prediction) => void;
}

export function predKey(m: Match) {
  return `${m.team1}|${m.team2}|${m.date}`;
}

export function MatchRow({ match, predictions, onPredict }: Props) {
  const isPlayed = !!match.score?.ft;
  const key = predKey(match);
  const pred = predictions[key];

  const score1 = isPlayed ? match.score!.ft[0] : pred?.score1;
  const score2 = isPlayed ? match.score!.ft[1] : pred?.score2;

  const w1 = isPlayed && match.score!.ft[0] > match.score!.ft[1];
  const w2 = isPlayed && match.score!.ft[1] > match.score!.ft[0];

  const dateStr = new Date(match.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
  });

  return (
    <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
      <span className="text-slate-600 text-[11px] w-9 shrink-0 tabular-nums">{dateStr}</span>

      <div className={`flex items-center gap-1.5 flex-1 justify-end min-w-0 ${w1 ? 'text-white font-medium' : 'text-slate-400'}`}>
        <span className="truncate text-xs">{teamPT(match.team1)}</span>
        <Flag team={match.team1} className="w-7 h-5 rounded-sm shrink-0" />
      </div>

      {isPlayed ? (
        <div className="flex items-center gap-1 w-14 justify-center shrink-0">
          <span className={`text-sm font-bold tabular-nums ${w1 ? 'text-green-400' : 'text-slate-300'}`}>{score1}</span>
          <span className="text-slate-600 text-xs">–</span>
          <span className={`text-sm font-bold tabular-nums ${w2 ? 'text-green-400' : 'text-slate-300'}`}>{score2}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 w-18 justify-center shrink-0">
          <ScoreInput
            value={pred?.score1}
            onChange={(n) => onPredict(key, { score1: n ?? 0, score2: pred?.score2 ?? 0 })}
          />
          <span className="text-slate-600 text-xs">–</span>
          <ScoreInput
            value={pred?.score2}
            onChange={(n) => onPredict(key, { score1: pred?.score1 ?? 0, score2: n ?? 0 })}
          />
        </div>
      )}

      <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${w2 ? 'text-white font-medium' : 'text-slate-400'}`}>
        <Flag team={match.team2} className="w-7 h-5 rounded-sm shrink-0" />
        <span className="truncate text-xs">{teamPT(match.team2)}</span>
      </div>
    </div>
  );
}
