import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'

/**
 * Arrastar uma linha para a esquerda com o dedo (como apagar um e-mail no celular).
 * Passou de um terço da largura e soltou: chama `onDone`. O rolar da página continua normal.
 */
export function useSwipe(onDone?: () => void) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number; side: boolean | null } | null>(null)
  const swiped = useRef(false)

  const reset = () => {
    start.current = null
    setDragging(false)
    setDx(0)
  }

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (!onDone || e.pointerType === 'mouse') return
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, side: null }
      swiped.current = false
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const s = start.current
      if (!s || e.pointerId !== s.id) return
      const mx = e.clientX - s.x
      const my = e.clientY - s.y
      if (s.side === null) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
        // Só vale de lado e para a esquerda; para cima ou para baixo é a página rolando.
        s.side = Math.abs(mx) > Math.abs(my) * 1.5 && mx < 0
        if (!s.side) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      }
      if (!s.side) return
      swiped.current = true
      setDx(Math.min(0, mx))
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const s = start.current
      if (!s?.side) return reset()
      const width = e.currentTarget.offsetWidth
      start.current = null
      setDragging(false)
      if (e.clientX - s.x < -Math.max(80, width / 3)) {
        setDx(-width)
        setTimeout(() => {
          onDone?.()
          // A linha volta para o lugar (já escondida), para o "Desfazer" trazê-la de volta inteira.
          setDx(0)
        }, 180)
      } else setDx(0)
    },
    onPointerCancel: reset,
    // Depois de arrastar, o dedo solto em cima do play não deve tocar a música.
    onClickCapture(e: MouseEvent<HTMLElement>) {
      if (!swiped.current) return
      swiped.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }
  return { dx, dragging, handlers }
}
