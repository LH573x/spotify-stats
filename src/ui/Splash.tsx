import { useEffect, useRef } from 'react'

const SHOW_MS = 2100
const FADE_MS = 400

/**
 * Tira a abertura (que já vem no index.html) depois de ela ficar ~2,1 s de verdade na tela
 * e de os dados terem carregado. O tempo conta só quadros desenhados: enquanto o celular
 * está ocupado lendo os dados e não desenha nada, o relógio da abertura não anda.
 */
export function Splash({ ready }: { ready: boolean }) {
  const readyRef = useRef(ready)
  useEffect(() => {
    readyRef.current = ready
  }, [ready])

  useEffect(() => {
    const el = document.getElementById('splash')
    if (!el || el.hidden) return
    let shown = 0
    let last = 0
    let raf = 0
    let timer = 0
    const close = () => {
      cancelAnimationFrame(raf)
      el.classList.add('out')
      timer = window.setTimeout(() => el.remove(), FADE_MS)
    }
    const tick = (now: number) => {
      if (last) shown += Math.min(now - last, 50)
      last = now
      if (shown >= SHOW_MS && readyRef.current) close()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    el.addEventListener('click', close, { once: true })
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      el.removeEventListener('click', close)
      el.classList.remove('out')
    }
  }, [])
  return null
}
