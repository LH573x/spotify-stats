import { useEffect, useState } from 'react'

export type ThemeName = 'dark' | 'light'

/** Cores usadas dentro dos gráficos (ECharts não lê variáveis CSS). */
export interface ChartColors {
  surface: string
  ink: string
  ink2: string
  muted: string
  grid: string
  axis: string
  accent: string
  /** Escala sequencial (baixo → alto), um só tom. */
  ramp: string[]
}

export const CHART_COLORS: Record<ThemeName, ChartColors> = {
  dark: {
    surface: '#1a1a19',
    ink: '#ffffff',
    ink2: '#c3c2b7',
    muted: '#898781',
    grid: '#2c2c2a',
    axis: '#383835',
    accent: '#2fbf71',
    ramp: ['#1f2b24', '#1d4a33', '#1c6b42', '#1f8d52', '#2fbf71', '#6ee7a0'],
  },
  light: {
    surface: '#fcfcfb',
    ink: '#0b0b0b',
    ink2: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    accent: '#138a4e',
    ramp: ['#eef1ee', '#c6ead4', '#8fd6aa', '#4cb87c', '#1f9a5a', '#0f6e3e'],
  },
}

const KEY = 'spotify-stats-theme'

function initial(): ThemeName {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // sem localStorage: usa o padrão
  }
  return 'dark' // tema escuro por padrão
}

export function useTheme(): [ThemeName, () => void] {
  const [theme, setTheme] = useState<ThemeName>(initial)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // ignora
    }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}
