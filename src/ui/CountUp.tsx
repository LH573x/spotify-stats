import { useEffect, useRef, useState } from 'react'
import { num } from './format'
import { reducedMotion, useInView } from './motion'

const DURATION = 1100
const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Número que sobe até o valor quando aparece na tela. Se o valor muda depois
 * (outro ano no toca-discos), corre do número antigo até o novo.
 */
export function CountUp({ value, format = num }: { value: number; format?: (n: number) => string }) {
  const [ref, seen] = useInView<HTMLSpanElement>()
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0))
  const current = useRef(shown)

  useEffect(() => {
    if (!seen) return
    const from = current.current
    const t0 = performance.now()
    const still = reducedMotion() || from === value
    let raf = requestAnimationFrame(function step(now) {
      const t = still ? 1 : (now - t0) / DURATION
      const v = from + (value - from) * ease(t)
      current.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(raf)
  }, [seen, value, ref])

  return (
    <span ref={ref} className="count">
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
