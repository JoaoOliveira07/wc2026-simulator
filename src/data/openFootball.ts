const BASE = 'https://raw.githubusercontent.com/openfootball/world-cup/master/2026--usa';
const CACHE_KEY = 'of:topscorers:2026';
const CACHE_TTL = 30 * 60 * 1000;

export interface OFScorer {
  name: string;
  goals: number;
  team: string;
}

function cacheGet<T>(key: string, ttl = CACHE_TTL): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { d, t } = JSON.parse(raw);
    if (Date.now() - t > ttl) { localStorage.removeItem(key); return null; }
    return d as T;
  } catch { return null; }
}

function cacheSet<T>(key: string, d: T): void {
  try { localStorage.setItem(key, JSON.stringify({ d, t: Date.now() })); } catch {}
}

// ── Team extraction from match result lines ───────────────────────────────────
// Handles formats like:
//   "  11:00 UTC-6     Mexico   2-0 (1-0) South Africa   @ ..."
//   "(74) 16:30 UTC-4  Germany 1-1 a.e.t. (1-1, 0-1), 3-4 pen. Paraguay   @ ..."
function extractMatchTeams(line: string): [string, string] | null {
  // Remove optional leading match number "(N)"
  const noNum = line.replace(/^\s*\(\d+\)/, '');
  // Strip time + timezone prefix — line must have one to be a match line
  const afterTime = noNum.replace(/^\s*\d+:\d+\s+UTC[+-]\d+\s+/, '');
  if (afterTime === noNum) return null; // no time = not a match line

  // Find first score: N-N
  const scoreMatch = afterTime.match(/\d+-\d+/);
  if (!scoreMatch) return null; // no score = future match, skip

  const scoreIdx = afterTime.indexOf(scoreMatch[0]);
  const teamA = afterTime.slice(0, scoreIdx).trim();

  // Everything between score and " @" venue marker
  const afterScore = afterTime.slice(scoreIdx);
  const atIdx = afterScore.indexOf(' @');
  if (atIdx < 0) return null;

  const teamB = afterScore
    .slice(0, atIdx)
    .replace(/\d+-\d+/g, '')    // scores
    .replace(/a\.e\.t\./g, '')  // extra time
    .replace(/\([^)]*\)/g, '')  // (N-N) bracket scores
    .replace(/pen\./g, '')      // penalties
    .replace(/,/g, '')          // leftover commas
    .trim();

  if (!teamA || !teamB) return null;
  return [teamA, teamB];
}

// ── Goal entry regex ──────────────────────────────────────────────────────────
// Captures Name + minute group + optional modifier (og, OG, p, etc.)
const ENTRY_RE = /([A-ZÁÉÍÓÚÀÂÃÊÔÕÇÑÜÖÆŒØÅÈÙÌÎÏËÛÄ][^0-9(;)]+?)\s+(\d+(?:\+\d+)?(?:',?\s*\d+(?:\+\d+)?)*)'(\([^)]*\))?/g;

function parseGoals(block: string, team: string, counts: Record<string, OFScorer>) {
  ENTRY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENTRY_RE.exec(block)) !== null) {
    const name     = m[1].trim();
    const minutes  = m[2];
    const modifier = m[3] ?? '';
    if (/og/i.test(modifier)) continue; // own goal — skip
    const goals = (minutes.match(/'/g) ?? []).length + 1;
    if (counts[name]) {
      counts[name].goals += goals;
    } else {
      counts[name] = { name, goals, team };
    }
  }
}

function parseCupIntoMap(text: string, counts: Record<string, OFScorer>) {
  const lines = text.split('\n');
  let currentTeams: [string, string] | null = null;
  let block = '';
  let inBlock = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    // Update current match teams from result lines
    if (!inBlock) {
      const teams = extractMatchTeams(raw);
      if (teams) currentTeams = teams;
    }

    // Detect start of goal block
    if (!inBlock && trimmed.startsWith('(') && /'/.test(trimmed)) {
      block = trimmed;
      inBlock = true;
    } else if (inBlock) {
      block += ' ' + trimmed;
    }

    // Block complete when parens balance
    if (inBlock) {
      const open  = (block.match(/\(/g) ?? []).length;
      const close = (block.match(/\)/g) ?? []).length;
      if (open > 0 && open === close) {
        const inner = block.slice(block.indexOf('(') + 1, block.lastIndexOf(')'));
        inner.split(';').forEach((side, idx) => {
          const team = currentTeams?.[idx] ?? '';
          parseGoals(side, team, counts);
        });
        block = '';
        inBlock = false;
      }
    }
  }
}

export async function fetchOFTopScorers(): Promise<OFScorer[]> {
  const cached = cacheGet<OFScorer[]>(CACHE_KEY);
  if (cached?.length) return cached;

  const [groupRes, finalsRes] = await Promise.all([
    fetch(`${BASE}/cup.txt`),
    fetch(`${BASE}/cup_finals.txt`),
  ]);
  if (!groupRes.ok) throw new Error('Dados indisponíveis');

  const counts: Record<string, OFScorer> = {};
  parseCupIntoMap(await groupRes.text(), counts);
  if (finalsRes.ok) parseCupIntoMap(await finalsRes.text(), counts);

  const scorers = Object.values(counts)
    .filter(s => s.name.length > 2)
    .sort((a, b) => b.goals - a.goals);

  if (scorers.length) cacheSet(CACHE_KEY, scorers);
  return scorers;
}
