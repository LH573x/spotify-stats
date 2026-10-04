import { useSyncExternalStore } from 'react'

/** Os idiomas do site. Português é o padrão. */
export type Lang = 'pt' | 'en' | 'es'

export const LANGS: readonly { id: Lang; name: string; locale: string }[] = [
  { id: 'pt', name: 'Português', locale: 'pt-BR' },
  { id: 'en', name: 'English', locale: 'en-GB' },
  { id: 'es', name: 'Español', locale: 'es-ES' },
]

const KEY = 'spotify-stats-lang'

function saved(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'en' || v === 'es') return v
  } catch {
    // Sem localStorage (navegação privada, worker): fica no padrão.
  }
  return 'pt'
}

let current: Lang = saved()
const listeners = new Set<() => void>()

function apply() {
  if (typeof document !== 'undefined') document.documentElement.lang = locale()
}
apply()

/** O idioma atual, para código fora dos componentes. */
export const lang = () => current

/** "pt-BR", "en-GB" ou "es-ES", para números e datas. */
export const locale = () => LANGS.find((l) => l.id === current)!.locale

export function setLang(l: Lang, remember = true) {
  if (l === current) return
  current = l
  if (remember) {
    try {
      localStorage.setItem(KEY, l)
    } catch {
      // Sem localStorage: vale só até fechar a página.
    }
  }
  apply()
  listeners.forEach((f) => f())
}

function subscribe(f: () => void) {
  listeners.add(f)
  return () => listeners.delete(f)
}

/** O idioma atual; o componente redesenha quando ele muda. */
export const useLang = () => useSyncExternalStore(subscribe, lang)

/** O mesmo texto nos três idiomas: t('Músicas', 'Songs', 'Canciones'). */
export const t = (pt: string, en: string, es: string) => (current === 'en' ? en : current === 'es' ? es : pt)
