export interface Score {
  ft: [number, number];
  ht?: [number, number];
  et?: [number, number];
  p?: [number, number];
}

export interface Goal {
  name: string;
  minute: string;
  penalty?: boolean;
  owngoal?: boolean;
}

export interface Match {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  score?: Score;
  goals1?: Goal[];
  goals2?: Goal[];
  group?: string;
  ground: string;
}

export interface Group {
  name: string;
  teams: string[];
}

export interface GroupsData {
  name: string;
  groups: Group[];
}

export interface WorldCupData {
  name: string;
  matches: Match[];
}

export interface TeamStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export type PredictionKey = string; // `${team1}|${team2}|${date}`

export interface Prediction {
  score1: number;
  score2: number;
}

export type Predictions = Record<PredictionKey, Prediction>;

export interface KnockoutMatch {
  id: string;
  round: 'R32' | 'R16' | 'QF' | 'SF' | 'F' | '3RD';
  team1: string | null;
  team2: string | null;
  score?: [number, number];
  winner?: string;
  fromMatch1?: string;
  fromMatch2?: string;
}
