import { useState, useCallback } from 'react';
import type { Predictions, Prediction } from '../types';

const LS_KEY = 'wc2026_predictions';

function load(): Predictions {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(p: Predictions) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

export function usePredictions() {
  const [predictions, setPredictions] = useState<Predictions>(load);

  const setPrediction = useCallback((key: string, pred: Prediction) => {
    setPredictions((prev) => {
      const next = { ...prev, [key]: pred };
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setPredictions({});
    localStorage.removeItem(LS_KEY);
  }, []);

  return { predictions, setPrediction, clearAll };
}
