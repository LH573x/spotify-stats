import { useEffect, useRef } from 'react'
import { closePlayer, currentTrack, getController, loadApi, play, setController, setPlaying, usePlayer, type Track } from './playerStore'
import { stopPreview } from './preview'
import { t, useLang } from '../i18n'

/** Botão redondo de tocar. Some quando a faixa não tem endereço no Spotify (histórico básico). */
export function PlayButton({ track, className = '' }: { track: Track | null; className?: string }) {
  const { uri, playing } = usePlayer()
  if (!track) return null
  const mine = uri === track.uri
  return (
    <button
      type="button"
      className={`play ${mine ? 'on' : ''} ${mine && playing ? 'live' : ''} ${className}`}
      aria-label={
        mine && playing
          ? t(`Pausar ${track.name}, de ${track.artist}`, `Pause ${track.name}, by ${track.artist}`, `Pausar ${track.name}, de ${track.artist}`)
          : t(`Tocar ${track.name}, de ${track.artist}`, `Play ${track.name}, by ${track.artist}`, `Reproducir ${track.name}, de ${track.artist}`)
      }
      title={mine && playing ? t('Pausar', 'Pause', 'Pausar') : t('Tocar no Spotify', 'Play on Spotify', 'Reproducir en Spotify')}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        stopPreview()
        play(track)
      }}
    >
      {mine && playing ? (
        <span className="eq" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
        </svg>
      )}
    </button>
  )
}

/** O player do Spotify no rodapé. Fica escondido até a primeira faixa. */
export function PlayerDock() {
  // Fica fora da parte que remonta ao trocar o idioma (o player não pode recarregar): redesenha só os textos.
  useLang()
  const { uri } = usePlayer()
  const host = useRef<HTMLDivElement>(null)
  const wantPlay = useRef(false)
  const failed = useRef(false)
  const starting = useRef(false)

  useEffect(() => {
    if (!uri || !host.current) return
    if (failed.current) {
      host.current.innerHTML = embed(uri)
      return
    }
    wantPlay.current = true
    const ready = getController()
    if (ready) {
      ready.loadUri(uri)
      return
    }
    if (starting.current) return
    starting.current = true
    const el = document.createElement('div')
    host.current.replaceChildren(el)
    loadApi().then(
      (a) =>
        a.createController(el, { uri, width: '100%', height: 80 }, (c) => {
          setController(c)
          starting.current = false
          c.addListener('ready', () => {
            if (!wantPlay.current) return
            wantPlay.current = false
            c.play()
          })
          c.addListener('playback_update', (e) => setPlaying(!e.data?.isPaused))
          // Se outra faixa foi escolhida enquanto o player abria, troca para ela.
          const now = currentTrack()
          if (now && now.uri !== uri) c.loadUri(now.uri)
        }),
      () => {
        // Sem a API (bloqueada ou fora do ar): o player comum, em que é só apertar o play dele.
        failed.current = true
        starting.current = false
        const now = currentTrack()
        if (host.current && now) host.current.innerHTML = embed(now.uri)
      },
    )
  }, [uri])

  return (
    <div className="dock" hidden={!uri} aria-label={t('Player do Spotify', 'Spotify player', 'Reproductor de Spotify')}>
      <div className="dock-frame" ref={host} />
      <button
        type="button"
        className="ghost icon dock-close"
        onClick={closePlayer}
        aria-label={t('Fechar o player', 'Close player', 'Cerrar reproductor')}
      >
        ✕
      </button>
    </div>
  )
}

function embed(uri: string) {
  const [, type, id] = uri.split(':')
  const src = `https://open.spotify.com/embed/${encodeURIComponent(type)}/${encodeURIComponent(id)}`
  const title = t('Player do Spotify', 'Spotify player', 'Reproductor de Spotify')
  return `<iframe src="${src}" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="${title}"></iframe>`
}
