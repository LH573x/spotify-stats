import { useEffect, useRef } from 'react'

/** Partes da página que já usam o dedo para os lados (stories, janelas, linhas do Explorar): ali o arrastar não troca de aba. */
const OWN_GESTURE = 'canvas, input, textarea, select, dialog, .wstage, .ex-swipe, [data-noswipe]'

function scrollsSideways(el: Element | null, stop: Element): boolean {
  for (; el && el !== stop; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 2) {
      const o = getComputedStyle(el).overflowX
      if (o === 'auto' || o === 'scroll') return true
    }
  }
  return false
}

/**
 * Arrastar o dedo para os lados no conteúdo troca de aba (no celular).
 * `onSwipe(1)` = próxima aba (dedo para a esquerda), `onSwipe(-1)` = anterior.
 */
export function useTabSwipe(enabled: boolean, onSwipe: (dir: 1 | -1) => void) {
  const cb = useRef(onSwipe)
  useEffect(() => {
    cb.current = onSwipe
  })
  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number; at: number } | null = null
    const down = (e: TouchEvent) => {
      start = null
      if (e.touches.length !== 1) return
      const tch = e.touches[0]
      const target = e.target instanceof Element ? e.target : null
      const main = target?.closest('main')
      // Perto da borda fica para o gesto de voltar do navegador.
      if (!main || tch.clientX < 24 || tch.clientX > window.innerWidth - 24) return
      if (target!.closest(OWN_GESTURE) || scrollsSideways(target, main)) return
      start = { x: tch.clientX, y: tch.clientY, at: Date.now() }
    }
    const up = (e: TouchEvent) => {
      if (!start) return
      const tch = e.changedTouches[0]
      const dx = tch.clientX - start.x
      const dy = tch.clientY - start.y
      const quick = Date.now() - start.at < 700
      start = null
      if (quick && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2.2) cb.current(dx < 0 ? 1 : -1)
    }
    const cancel = () => {
      start = null
    }
    document.addEventListener('touchstart', down, { passive: true })
    document.addEventListener('touchend', up, { passive: true })
    document.addEventListener('touchcancel', cancel, { passive: true })
    return () => {
      document.removeEventListener('touchstart', down)
      document.removeEventListener('touchend', up)
      document.removeEventListener('touchcancel', cancel)
    }
  }, [enabled])
}
