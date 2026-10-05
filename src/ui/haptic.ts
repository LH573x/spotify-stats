/*
 * Vibração leve ao tocar nos botões do celular.
 * Android: navigator.vibrate. iPhone (iOS 18+): o Safari não tem vibrate, mas um interruptor
 * (<input type="checkbox" switch>) vibra de leve quando é tocado, então um invisível é tocado no lugar.
 */

const touch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

export function haptic() {
  if (!touch()) return
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(10)
    return
  }
  const label = document.createElement('label')
  label.ariaHidden = 'true'
  label.style.display = 'none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.appendChild(input)
  document.head.appendChild(label)
  label.click()
  label.remove()
}

/** Liga a vibração em todo botão e link do site. Devolve a função que desliga. */
export function hapticOnTaps() {
  const on = (e: MouseEvent) => {
    const el = e.target instanceof Element ? e.target : null
    if (el?.closest('button, a[href], [role="button"]') && !el.closest('label[aria-hidden]')) haptic()
  }
  document.addEventListener('click', on, true)
  return () => document.removeEventListener('click', on, true)
}
