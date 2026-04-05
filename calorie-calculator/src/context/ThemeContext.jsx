import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_IDS = [
  { id: 'dark',     label: 'Slate',    hint: 'Deep violet — default' },
  { id: 'cosmic',   label: 'Cosmic',   hint: 'Purple depths' },
  { id: 'ember',    label: 'Ember',    hint: 'Warm amber glow' },
  { id: 'forest',   label: 'Forest',   hint: 'Deep green calm' },
  { id: 'arctic',   label: 'Arctic',   hint: 'Cool steel blue' },
  { id: 'midnight', label: 'Midnight', hint: 'Deep indigo night' },
  { id: 'light',    label: 'Daylight', hint: 'Clean & bright' },
];

// Per-theme accent definitions
const THEME_ACCENTS = {
  dark:     { accent: '262 85% 68%', bright: '262 90% 76%', dim: '262 55% 35%', glow: '262,85%,68%,0.3',  fill: '262,80%,68%,0.1', border: '262,70%,68%,0.25' },
  cosmic:   { accent: '272 85% 70%', bright: '272 90% 78%', dim: '272 55% 36%', glow: '272,85%,70%,0.3',  fill: '272,80%,70%,0.1', border: '272,70%,70%,0.25' },
  ember:    { accent: '25  85% 62%', bright: '25  90% 70%', dim: '25  55% 34%', glow: '25,85%,62%,0.3',   fill: '25,80%,62%,0.1',  border: '25,70%,62%,0.25' },
  forest:   { accent: '152 72% 50%', bright: '152 78% 58%', dim: '152 48% 30%', glow: '152,72%,50%,0.3',  fill: '152,68%,50%,0.1', border: '152,60%,50%,0.25' },
  arctic:   { accent: '210 85% 65%', bright: '210 90% 74%', dim: '210 55% 36%', glow: '210,85%,65%,0.3',  fill: '210,80%,65%,0.1', border: '210,70%,65%,0.25' },
  midnight: { accent: '246 80% 68%', bright: '246 86% 76%', dim: '246 50% 36%', glow: '246,80%,68%,0.3',  fill: '246,76%,68%,0.1', border: '246,68%,68%,0.25' },
  light:    { accent: '262 75% 60%', bright: '262 80% 68%', dim: '262 45% 32%', glow: '262,75%,60%,0.25', fill: '262,75%,60%,0.1', border: '262,65%,60%,0.25' },
};

const STORAGE = {
  themeId:   'thirtycal_themeId',
  radius:    'thirtycal_uiRadius',
  fontScale: 'thirtycal_fontScale',
};

function readStored(key) {
  return localStorage.getItem(key);
}

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId,   setThemeId]   = useState(() => readStored(STORAGE.themeId) || 'dark');
  const [radius,    setRadius]    = useState(() => readStored(STORAGE.radius)    || 'default');
  const [fontScale, setFontScale] = useState(() => readStored(STORAGE.fontScale) || 'base');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme',      themeId);
    root.setAttribute('data-radius',     radius);
    root.setAttribute('data-font-scale', fontScale);

    // Apply per-theme accent vars
    const ac = THEME_ACCENTS[themeId] || THEME_ACCENTS.dark;
    root.style.setProperty('--accent',        `hsl(${ac.accent})`);
    root.style.setProperty('--accent-bright', `hsl(${ac.bright})`);
    root.style.setProperty('--accent-dim',    `hsl(${ac.dim})`);
    root.style.setProperty('--accent-glow',   `hsla(${ac.glow})`);
    root.style.setProperty('--accent-fill',   `hsla(${ac.fill})`);
    root.style.setProperty('--accent-border', `hsla(${ac.border})`);

    localStorage.setItem(STORAGE.themeId,   themeId);
    localStorage.setItem(STORAGE.radius,    radius);
    localStorage.setItem(STORAGE.fontScale, fontScale);
  }, [themeId, radius, fontScale]);

  const value = useMemo(() => ({
    themeId, setThemeId,
    radius, setRadius,
    fontScale, setFontScale,
  }), [themeId, radius, fontScale]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
