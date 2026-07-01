import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { decodeShareState } from './utils/shareState';

// Load shared simulation state from URL param before React mounts
const url = new URL(window.location.href);
const s = url.searchParams.get('s');
if (s) {
  try {
    const decoded = decodeShareState(s);
    if (decoded) {
      if (decoded.predictions) localStorage.setItem('wc2026_predictions', JSON.stringify(decoded.predictions));
      if (decoded.ko && Object.keys(decoded.ko).length > 0) localStorage.setItem('wc2026_ko', JSON.stringify(decoded.ko));
      url.searchParams.delete('s');
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // Silently ignore malformed share URLs
  }
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
