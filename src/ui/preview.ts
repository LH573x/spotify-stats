import { useSyncExternalStore } from 'react'
import { knownPreview, previewOf, type DzTrack } from '../data/deezer'
import { getController } from './playerStore'

/*
 * Prévias de 30 segundos do Deezer (aba Explorar). Uma de cada vez, e o player do Spotify pausa
 * quando uma começa.
 */

// WAV vazio: tocá-lo ainda dentro do toque "destrava" o áudio no iPhone enquanto a prévia carrega.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

type State = 'idle' | 'loading' | 'playing'
let audio: HTMLAudioElement | null = null
let current: number | null = null
let state: State = 'idle'
const listeners = new Set<() => void>()

function set(id: number | null, s: State) {
  current = id
  state = s
  listeners.forEach((f) => f())
}

function el(): HTMLAudioElement {
  if (!audio) {
    const a = new Audio()
    a.addEventListener('ended', () => {
      if (!a.currentSrc.startsWith('data:')) set(null, 'idle')
    })
    audio = a
  }
  return audio
}

function start(a: HTMLAudioElement, id: number, url: string) {
  a.src = url
  a.play().then(
    () => current === id && set(id, 'playing'),
    () => current === id && set(null, 'idle'),
  )
}

/** Chamar no toque, antes de algo demorado que vai terminar em playPreview. */
export function unlockAudio() {
  const a = el()
  if (state !== 'idle') return
  a.src = SILENT
  a.play().catch(() => {})
}

export function playPreview(t: DzTrack) {
  const a = el()
  getController()?.pause()
  set(t.id, 'loading')
  const url = knownPreview(t.id)
  if (url) return start(a, t.id, url)
  a.src = SILENT
  a.play().catch(() => {})
  previewOf(t.id).then(
    (u) => {
      if (current !== t.id) return
      if (u) start(a, t.id, u)
      else set(null, 'idle')
    },
    () => current === t.id && set(null, 'idle'),
  )
}

export function stopPreview() {
  audio?.pause()
  if (current !== null) set(null, 'idle')
}

/** Toca, ou para se já é a que está tocando. */
export function togglePreview(t: DzTrack) {
  if (current === t.id) stopPreview()
  else playPreview(t)
}

function subscribe(f: () => void) {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}

/** O estado da prévia desta música: parada, carregando ou tocando. */
export const usePreview = (id: number) => useSyncExternalStore(subscribe, () => (current === id ? state : 'idle'))
