import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'wayfinder-theme';

function initialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  // index.html already resolved stored preference vs. system and applied the
  // class before first paint; read it back rather than deciding again.
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Theme lives in one context because several components colour themselves in
 * JavaScript — the generated category hues and the SVG graph cannot be
 * expressed as static Tailwind classes, so they need to know which palette is
 * active. A per-component hook would let those drift out of sync with the
 * toggle in the header.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset['theme'] = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private browsing — the choice just will not persist */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isDark: theme === 'dark', toggle }),
    [theme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
