import type { Predictions } from '../types';
import type { UserScores } from '../store/knockout';

interface SharePayload {
  predictions: Predictions;
  ko: UserScores;
}

export function encodeShareState(predictions: Predictions, ko: UserScores): string {
  const payload: SharePayload = { predictions, ko };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

export function decodeShareState(encoded: string): SharePayload | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as SharePayload;
  } catch {
    return null;
  }
}

export function buildShareURL(predictions: Predictions, ko: UserScores): string {
  const encoded = encodeShareState(predictions, ko);
  const url = new URL(window.location.href);
  url.searchParams.set('s', encoded);
  url.hash = '';
  return url.toString();
}
