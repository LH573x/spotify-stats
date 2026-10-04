import { useEffect, useRef, useState } from 'react'

/** Quem pediu ao celular menos movimento vê tudo parado, já no valor final. */
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fica true na primeira vez que o elemento aparece na tela (e não volta a false). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (seen || !ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen] as const
}
