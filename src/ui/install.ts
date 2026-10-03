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
