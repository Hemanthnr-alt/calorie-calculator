import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_IDS = [
  { id: 'dark',    label: 'Slate',   hint: 'Deep teal — default' },
  { id: 'cosmic',  label: 'Cosmic',  hint: 'Violet depths' },
  { id: 'ember',   label: 'Ember',   hint: 'Warm amber glow' },
  { id: 'forest',  label: 'Forest',  hint: 'Deep green calm' },
  { id: 'arctic',  label: 'Arctic',  hint: 'Cool steel blue' },
  { id: 'light',   label: 'Daylight', hint: 'Clean & bright' },
];

const STORAGE = {
  themeId:    'thirtycal_themeId',
  accentHue:  'thirtycal_accentHue',
  radius:     'thirtycal_uiRadius',
  density:    'thirtycal_uiDensity',
  fontScale:  'thirtycal_fontScale',
  motion:     'thirtycal_motion',
};

const LEGACY = {
  themeId:   'calorielab_themeId',
  accentHue: 'calorielab_accentHue',
  radius:    'calorielab_uiRadius',
  density:   'calorielab_uiDensity',
  fontScale: 'calorielab_fontScale',
};

function readStored(key, legacyKey) {
  return localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
}

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId,   setThemeId]   = useState(() => readStored(STORAGE.themeId, LEGACY.themeId) || 'dark');
  const [accentHue, setAccentHue] = useState(() => {
    const raw = readStored(STORAGE.accentHue, LEGACY.accentHue);
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(360, Math.max(0, n)) : 168;
  });
  const [radius,    setRadius]    = useState(() => readStored(STORAGE.radius, LEGACY.radius) || 'default');
  const [density,   setDensity]   = useState(() => readStored(STORAGE.density, LEGACY.density) || 'comfortable');
  const [fontScale, setFontScale] = useState(() => readStored(STORAGE.fontScale, LEGACY.fontScale) || 'base');
  const [motion,    setMotion]    = useState(() => readStored(STORAGE.motion) || 'standard');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme',      themeId);
    root.setAttribute('data-radius',     radius);
    root.setAttribute('data-density',    density);
    root.setAttribute('data-font-scale', fontScale);
    root.setAttribute('data-motion',     motion);
    root.style.setProperty('--hue', String(accentHue));

    localStorage.setItem(STORAGE.themeId,   themeId);
    localStorage.setItem(STORAGE.accentHue, String(accentHue));
    localStorage.setItem(STORAGE.radius,    radius);
    localStorage.setItem(STORAGE.density,   density);
    localStorage.setItem(STORAGE.fontScale, fontScale);
    localStorage.setItem(STORAGE.motion,    motion);
  }, [themeId, accentHue, radius, density, fontScale, motion]);

  const value = useMemo(() => ({
    themeId, setThemeId,
    accentHue, setAccentHue,
    radius, setRadius,
    density, setDensity,
    fontScale, setFontScale,
    motion, setMotion,
  }), [themeId, accentHue, radius, density, fontScale, motion]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
