import { useSyncExternalStore } from 'react'
import type { Dataset } from '../data/types'

/*
 * Estado do player do Spotify no rodapé (a parte visual fica em player.tsx).
 * Usa a "iFrame API" pública do Spotify, sem login nem chave. Quem está logado no Spotify
 * neste navegador ouve a faixa inteira; quem não está, ouve um trecho de 30 segundos.
 */

export interface Track {
  uri: string
  name: string
  artist: string
}

export interface Controller {
  loadUri(uri: string): void
  play(): void
  pause(): void
  togglePlay(): void
  addListener(event: string, fn: (e: { data?: { isPaused?: boolean } }) => void): void
}
interface IFrameAPI {
  createController(el: HTMLElement, options: { uri: string; width: string; height: number }, cb: (c: Controller) => void): void
}
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void
  }
}

const SCRIPT = 'https://open.spotify.com/embed/iframe-api/v1'

let current: Track | null = null
let open = false
let playing = false
let controller: Controller | null = null
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

let api: Promise<IFrameAPI> | null = null
/** Carrega a API do Spotify uma vez só. */
export function loadApi(): Promise<IFrameAPI> {
  api ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onerror = () => {
      api = null
      reject(new Error('Não deu para abrir o player do Spotify.'))
    }
    document.head.appendChild(s)
  })
  return api
}

/** Só endereços de faixa ou episódio do Spotify, para montar o player com segurança. */
export const isSpotifyUri = (uri: string | undefined): uri is string => !!uri && /^spotify:(track|episode):[A-Za-z0-9]+$/.test(uri)

/** Toca uma faixa no rodapé (abre o player na primeira vez). Na faixa que já está no player, pausa ou continua. */
export function play(t: Track) {
  if (open && current?.uri === t.uri && controller) {
    controller.togglePlay()
    return
  }
  current = t
  open = true
  emit()
}

export function closePlayer() {
  controller?.pause()
  open = false
  playing = false
  emit()
}

export const currentTrack = () => current
export const getController = () => controller
export function setController(c: Controller) {
  controller = c
}
export function setPlaying(p: boolean) {
  if (p === playing) return
  playing = p
  emit()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** A faixa no player (vazio quando fechado) e se está tocando. */
export function usePlayer() {
  const uri = useSyncExternalStore(subscribe, () => (open && current ? current.uri : ''))
  const isPlaying = useSyncExternalStore(subscribe, () => playing)
  return { uri, playing: isPlaying }
}

/** Endereço da faixa no site do Spotify, para abrir no app. */
export function spotifyUrl(uri: string) {
  const [, type, id] = uri.split(':')
  return `https://open.spotify.com/${type}/${id}`
}

/** A faixa de número `id` do histórico, pronta para o player (ou null sem endereço no Spotify). */
export function trackOf(d: Dataset, id: number): Track | null {
  const it = d.items[id]
  if (!it || !isSpotifyUri(it.uri)) return null
  return { uri: it.uri, name: it.name, artist: d.creators[it.creator] }
}
