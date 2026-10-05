import { useSyncExternalStore } from 'react'

// O Chrome avisa (beforeinstallprompt) quando o site pode ser instalado como app.
// Guardamos o aviso para mostrar o nosso botão "Instalar o app" na hora certa.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let pending: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pending = e as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    pending = null
    notify()
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Função que abre a janela de instalação, ou null quando não dá (já instalado, iPhone, computador sem suporte). */
export function useInstall(): (() => Promise<void>) | null {
  const event = useSyncExternalStore(subscribe, () => pending)
  if (!event) return null
  return async () => {
    await event.prompt()
    await event.userChoice
    pending = null
    notify()
  }
}

// No iPhone e no iPad o Safari não avisa nada: a instalação é pelo Compartilhar → Adicionar à Tela de Início.
// O iPad se apresenta como Mac; o que o entrega é a tela de toque.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
const installed =
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

/** iPhone ou iPad fora do app instalado: mostramos o passo a passo no lugar do botão do Android. */
export const iosInstall = ios && !installed
