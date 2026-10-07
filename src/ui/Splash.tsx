import { useEffect, useState } from 'react'
import { LyraShape } from './LyraMark'
import { t } from '../i18n'

const SEEN = 'lyra-abertura'
const SHOW_MS = 1500
const FADE_MS = 400

/**
 * A abertura só aparece quando o app instalado é aberto (não no navegador nem ao recarregar).
 * `?abertura` no endereço força, para ver no computador.
 */
function shouldShow(): boolean {
  try {
    if (new URLSearchParams(location.search).has('abertura')) return true
    const app =
      matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!app || sessionStorage.getItem(SEEN)) return false
    sessionStorage.setItem(SEEN, '1')
    return true
  } catch {
    return false
  }
}

/** Ao abrir o app: as estrelas de Lyra acendem uma a uma, o nome aparece e o crédito embaixo. */
export function Splash() {
  const [phase, setPhase] = useState<'on' | 'out' | 'gone'>(() => (shouldShow() ? 'on' : 'gone'))

  useEffect(() => {
    if (phase === 'on') {
      const id = setTimeout(() => setPhase('out'), SHOW_MS)
      return () => clearTimeout(id)
    }
    if (phase === 'out') {
      const id = setTimeout(() => setPhase('gone'), FADE_MS)
      return () => clearTimeout(id)
    }
  }, [phase])

  if (phase === 'gone') return null
  return (
    <div className={`splash ${phase}`} onClick={() => setPhase('out')} aria-hidden>
      <div className="splash-mid">
        <svg viewBox="9 2 15 28" className="splash-mark">
          <LyraShape color="currentColor" />
        </svg>
        <span className="splash-name">Lyra</span>
      </div>
      <p className="splash-credit">
        <span>{t('desenvolvido por', 'developed by', 'desarrollado por')}</span>
        <strong>Luiz Hong</strong>
      </p>
    </div>
  )
}
