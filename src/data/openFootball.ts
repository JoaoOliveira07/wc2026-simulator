const CUP_URL = 'https://raw.githubusercontent.com/openfootball/world-cup/master/2026--usa/cup.txt';
const CACHE_KEY = 'of:topscorers:2026';
const CACHE_TTL = 30 * 60 * 1000;

export interface OFScorer {
  name: string;
  goals: number;
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

// Entry regex: captures (Name)(minutes group)(optional modifier)
// Name: starts with capital (including accented), consumes non-digit/paren/semicolon chars
// Minutes: first_minute,second_minute,... (lazy comma-minute repetition)
// Modifier: (og), (OG), (p), etc.
const ENTRY_RE = /([A-ZÁÉÍÓÚÀÂÃÊÔÕÇÑÜÖÆŒØÅÈÙÌÎÏËÛÄ][^0-9(;)]+?)\s+(\d+(?:\+\d+)?(?:',?\s*\d+(?:\+\d+)?)*)'(\([^)]*\))?/g;

function parseGoals(block: string, counts: Record<string, number>) {
  ENTRY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENTRY_RE.exec(block)) !== null) {
    const name     = m[1].trim();
    const minutes  = m[2]; // e.g. "29',45+3" or "74',90" or "16"
    const modifier = m[3] ?? '';
    if (/og/i.test(modifier)) continue; // own goal — skip
    // Count goals: apostrophes in minutes group + 1
    const goals = (minutes.match(/'/g) ?? []).length + 1;
    counts[name] = (counts[name] ?? 0) + goals;
  }
}

function parseCupTxt(text: string): OFScorer[] {
  const counts: Record<string, number> = {};

  // Collect multi-line goal blocks, then parse each
  const lines = text.split('\n');
  let block = '';
  let inBlock = false;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!inBlock && trimmed.startsWith('(') && /'/.test(trimmed)) {
      block = trimmed;
      inBlock = true;
    } else if (inBlock) {
      block += ' ' + trimmed;
    }

    // Block is complete when parens are balanced
    if (inBlock) {
      const open  = (block.match(/\(/g) ?? []).length;
      const close = (block.match(/\)/g) ?? []).length;
      if (open > 0 && open === close) {
        // Remove outer parens, split on ; for two teams
        const inner = block.slice(block.indexOf('(') + 1, block.lastIndexOf(')'));
        for (const side of inner.split(';')) {
          parseGoals(side, counts);
        }
        block = '';
        inBlock = false;
      }
    }
  }

  return Object.entries(counts)
    .filter(([name]) => name.length > 2)
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals);
}

export async function fetchOFTopScorers(): Promise<OFScorer[]> {
  const cached = cacheGet<OFScorer[]>(CACHE_KEY);
  if (cached?.length) return cached;

  const res = await fetch(CUP_URL);
  if (!res.ok) throw new Error('Dados indisponíveis');

  const text = await res.text();
  const scorers = parseCupTxt(text);
  if (scorers.length) cacheSet(CACHE_KEY, scorers);
  return scorers;
}
