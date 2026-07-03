import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemeMode } from '@/types';
import { BRAND_PRESETS } from '@/lib/calc';

interface ThemeContextValue {
  mode: ThemeMode;
  brand: string;
  setMode: (m: ThemeMode) => void;
  setBrand: (c: string) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'pagodefin-theme';

function loadInitial(): { mode: ThemeMode; brand: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { mode: 'dark', brand: BRAND_PRESETS[0] };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ mode, brand }, setState] = useState(loadInitial);

  useEffect(() => {
    document.body.classList.toggle('light', mode === 'light');
    document.documentElement.style.setProperty('--brand', brand);
    document.documentElement.style.setProperty('--brand-ink', brand);
    document.documentElement.style.setProperty('--brand-soft', hexToSoft(brand));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, brand }));
  }, [mode, brand]);

  const setMode = (m: ThemeMode) => setState((s) => ({ ...s, mode: m }));
  const setBrand = (c: string) => setState((s) => ({ ...s, brand: c }));
  const toggleMode = () => setState((s) => ({ ...s, mode: s.mode === 'dark' ? 'light' : 'dark' }));

  return (
    <ThemeContext.Provider value={{ mode, brand, setMode, setBrand, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

function hexToSoft(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},.16)`;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
