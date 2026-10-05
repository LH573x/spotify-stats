import { useEffect, useState } from 'react'

/**
 * Como o cabeçalho fica ao rolar: no topo da página, grande; rolando para baixo, some;
 * rolando para cima, volta menor (para dar mais espaço ao conteúdo).
 */
export function useHeader(): 'rest' | 'up' | 'away' {
  const [state, setState] = useState<'rest' | 'up' | 'away'>('rest')
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const on = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (y > 8 && Math.abs(y - last) < 6) return
        // No fim da página, o cabeçalho encolher deixa a página mais curta e o navegador sobe um
        // pouquinho sozinho: isso não é a pessoa rolando para cima.
        const end = y + window.innerHeight >= document.documentElement.scrollHeight - 1
        if (end && y < last && last - y < 20) {
          last = y
          return
        }
        setState(y <= 8 ? 'rest' : y > last && y > 120 ? 'away' : 'up')
        last = y
      })
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => {
      window.removeEventListener('scroll', on)
      cancelAnimationFrame(frame)
    }
  }, [])
  return state
}
