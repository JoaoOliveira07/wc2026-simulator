import LZString from 'lz-string';
import type { Predictions } from '../types';
import type { UserScores } from '../store/knockout';

interface SharePayload {
  predictions: Predictions;
  ko: UserScores;
}

// v2: compressão LZ + URI-safe base64 (~60-70% menor que v1)
// v1 legacy: btoa(encodeURIComponent(JSON)) — mantido no decode para retrocompatibilidade

export function encodeShareState(predictions: Predictions, ko: UserScores): string {
  const payload: SharePayload = { predictions, ko };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShareState(encoded: string): SharePayload | null {
  try {
    // Tenta v2 (LZ)
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (json) return JSON.parse(json) as SharePayload;
  } catch { /* fall through */ }
  try {
    // Fallback v1 (base64 legacy)
    return JSON.parse(decodeURIComponent(atob(encoded))) as SharePayload;
  } catch { return null; }
}

export function buildShareURL(predictions: Predictions, ko: UserScores): string {
  const encoded = encodeShareState(predictions, ko);
  const url = new URL(window.location.href);
  url.searchParams.set('s', encoded);
  url.hash = '';
  return url.toString();
}
