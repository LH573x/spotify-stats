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

// Onde o navegador não avisa nada, o botão abre um passo a passo no lugar da janela de instalar.
// O iPad se apresenta como Mac; o que o entrega é a tela de toque.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
const android = /Android/.test(ua)
// O Chrome de verdade: o Samsung, o Edge, o Opera e os navegadores de dentro de apps (wv) também dizem "Chrome".
const chrome = /Chrome\/\d/.test(ua) && !/; wv\)|SamsungBrowser|EdgA|OPR|Firefox|YaBrowser|UCBrowser|MiuiBrowser|HeyTap|DuckDuckGo|Instagram|FBAN|FBAV/.test(ua)
const installed =
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

/**
 * Qual passo a passo mostrar quando não há janela de instalar:
 * - ios: Safari no iPhone (Compartilhar → Adicionar à Tela de Início);
 * - ios-other: Chrome, Firefox etc. no iPhone, que também instalam pelo Compartilhar;
 * - android-chrome: o Chrome ainda não avisou (ou já instalou), então vai pelo menu ⋮;
 * - android-other: navegador que não instala o app do jeito certo; mandamos para o Chrome.
 */
export type InstallGuideKind = 'ios' | 'ios-other' | 'android-chrome' | 'android-other'
export const installGuide: InstallGuideKind | null = installed
  ? null
  : ios
    ? /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
      ? 'ios-other'
      : 'ios'
    : android
      ? chrome
        ? 'android-chrome'
        : 'android-other'
      : null

/** Este mesmo endereço, aberto no Chrome do Android (se ele não estiver instalado, o Android leva à Play Store). */
export const chromeIntent = () =>
  `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`
