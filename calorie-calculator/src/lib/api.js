// src/lib/api.js — v2 (fixed port priority, dedup, cleaner fallback chain)
const configuredBase = import.meta.env.VITE_API_BASE_URL;

// In dev, prefer same-origin /api (Vite proxy) to avoid CORS and IPv4/IPv6 issues.
// Fallback chain covers both default ports (5002 from vite config, 34567 from server default).
const candidates = [
  ...(import.meta.env.DEV && !configuredBase ? ['/api'] : []),
  configuredBase,
  'http://127.0.0.1:5002/api',
  'http://localhost:5002/api',
  'http://127.0.0.1:34567/api',
  'http://localhost:34567/api',
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

export const API_BASE = candidates[0];

export async function apiFetch(path, options = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  let lastError = null;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${cleanPath}`, options);
      return response;
    } catch (err) {
      // AbortError should propagate immediately — don't try next candidate
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }

  throw lastError ?? new Error('Unable to reach API server');
}
