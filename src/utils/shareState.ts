import LZString from 'lz-string';
import type { Predictions } from '../types';
import type { UserScores } from '../store/knockout';

interface SharePayload {
  predictions?: Predictions;
  ko: UserScores;
}

// v3: nibble-packed binary (bracket-only, ~90 char URLs)
// v2: LZ + URI-safe base64 (~230 chars) — legacy, kept for decode
// v1: btoa(encodeURIComponent(JSON)) — oldest, kept for decode

// Fixed match order for v3 encoding (must never change)
const KO_ORDER = [
  74, 77, 73, 75, 83, 84, 81, 82,   // L_R32
  89, 90, 93, 94,                    // L_R16
  97, 98,                            // L_QF
  101,                               // L_SF
  104, 103,                          // Final, 3rd
  102,                               // R_SF
  99, 100,                           // R_QF
  91, 92, 95, 96,                    // R_R16
  76, 78, 79, 80, 86, 88, 85, 87,   // R_R32
] as const;

function encodeKoV3(ko: UserScores): string {
  const nibbles: number[] = [];
  for (const num of KO_ORDER) {
    const s = ko[num];
    if (s) {
      nibbles.push(Math.min(s[0] + 1, 15), Math.min(s[1] + 1, 15));
    } else {
      nibbles.push(0, 0);
    }
  }
  const bytes = new Uint8Array(nibbles.length >> 1);
  for (let i = 0; i < nibbles.length; i += 2) {
    bytes[i >> 1] = (nibbles[i] << 4) | (nibbles[i + 1] & 0xF);
  }
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return 'k3' + b64;
}

function decodeKoV3(encoded: string): UserScores | null {
  if (!encoded.startsWith('k3')) return null;
  const b64 = encoded.slice(2).replace(/-/g, '+').replace(/_/g, '/');
  let binStr: string;
  try { binStr = atob(b64); } catch { return null; }
  const bytes = Uint8Array.from(binStr, c => c.charCodeAt(0));
  const nibbles: number[] = [];
  for (const byte of bytes) {
    nibbles.push((byte >> 4) & 0xF, byte & 0xF);
  }
  const ko: UserScores = {};
  for (let i = 0; i < KO_ORDER.length; i++) {
    const n1 = nibbles[i * 2] ?? 0;
    const n2 = nibbles[i * 2 + 1] ?? 0;
    if (n1 !== 0 || n2 !== 0) {
      ko[KO_ORDER[i]] = [Math.max(0, n1 - 1), Math.max(0, n2 - 1)];
    }
  }
  return ko;
}

export function encodeShareState(ko: UserScores): string {
  return encodeKoV3(ko);
}

export function decodeShareState(encoded: string): SharePayload | null {
  // v3 compact
  if (encoded.startsWith('k3')) {
    const ko = decodeKoV3(encoded);
    if (ko) return { ko };
  }
  try {
    // v2 LZ
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (json) return JSON.parse(json) as SharePayload;
  } catch { /* fall through */ }
  try {
    // v1 base64 legacy
    return JSON.parse(decodeURIComponent(atob(encoded))) as SharePayload;
  } catch { return null; }
}

export function buildShareURL(ko: UserScores): string {
  const encoded = encodeShareState(ko);
  const url = new URL(window.location.href);
  url.searchParams.set('s', encoded);
  url.hash = '';
  return url.toString();
}
