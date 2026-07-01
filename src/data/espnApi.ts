// ESPN unofficial API — works from browser (CORS allowed), blocked by curl (TLS fingerprint)

const ESPN_NORM: Record<string, string> = {
  'democratic republic of the congo': 'dr congo',
  'democratic republic of congo': 'dr congo',
  'congo, democratic republic of': 'dr congo',
  'republic of korea': 'south korea',
  'korea republic': 'south korea',
  'united states': 'usa',
  'united states of america': 'usa',
  'ir iran': 'iran',
  'iran (islamic republic of)': 'iran',
  'bosnia and herzegovina': 'bosnia & herzegovina',
  "côte d'ivoire": 'ivory coast',
  "cote d'ivoire": 'ivory coast',
};

export function normESPNTeam(s: string): string {
  const l = s.toLowerCase().trim();
  return ESPN_NORM[l] ?? l;
}

export type ESPNStatus = 'live' | 'halftime' | 'final' | 'scheduled' | 'postponed';

export interface ESPNMatch {
  id: string;
  date: string;           // ISO string
  status: ESPNStatus;
  clock: string;          // "45:00", "HT", ""
  period: number;         // 1 or 2
  shortDetail: string;    // "45'", "HT", "FT", "19:00"
  home: { name: string; abbr: string; logo: string; score: string | null };
  away: { name: string; abbr: string; logo: string; score: string | null };
}

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStatus(type: any, statusPeriod: number): ESPNStatus {
  const name  = type.name  ?? '';
  const state = type.state ?? '';   // 'pre' | 'in' | 'post'

  // state is more reliable than name
  if (state === 'post' || type.completed) return 'final';
  if (state === 'in') {
    if (name === 'STATUS_HALFTIME') return 'halftime';
    return 'live';
  }
  if (name === 'STATUS_POSTPONED' || name === 'STATUS_CANCELED') return 'postponed';
  // fallback: if period > 0 and not post → still live
  if (statusPeriod > 0 && state !== 'post') return 'live';
  return 'scheduled';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(ev: any): ESPNMatch {
  const comp   = ev.competitions?.[0] ?? {};
  const status = ev.status ?? {};
  const type   = status.type ?? {};
  const comps  = (comp.competitors ?? []) as any[];
  const home   = comps.find((c: any) => c.homeAway === 'home') ?? comps[0] ?? {};
  const away   = comps.find((c: any) => c.homeAway === 'away') ?? comps[1] ?? {};

  const st = parseStatus(type, status.period ?? 0);

  return {
    id:          ev.id,
    date:        ev.date,
    status:      st,
    clock:       status.displayClock ?? '',
    period:      status.period ?? 0,
    shortDetail: type.shortDetail ?? '',
    home: {
      name:  home.team?.displayName ?? '',
      abbr:  home.team?.abbreviation ?? '',
      logo:  home.team?.logo ?? '',
      score: st !== 'scheduled' ? (home.score ?? null) : null,
    },
    away: {
      name:  away.team?.displayName ?? '',
      abbr:  away.team?.abbreviation ?? '',
      logo:  away.team?.logo ?? '',
      score: st !== 'scheduled' ? (away.score ?? null) : null,
    },
  };
}

export async function fetchESPNToday(): Promise<ESPNMatch[]> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const url   = `${BASE}?dates=${today}`;
  const res   = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const data  = await res.json();
  return (data.events ?? []).map(mapEvent);
}
