import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Dataset } from '../data/types'
import { spotifySearch, type DzTrack } from '../data/deezer'
import { similarTo } from '../data/explore'
import { Section } from './blocks'
import { ExternalIcon } from './icons'
import { hue } from './format'
import { togglePreview, usePreview } from './preview'
import { useAsync } from './useAsync'
import { t } from '../i18n'

/** Foto ou capa vinda do Deezer; sem imagem, a inicial num fundo colorido (como no resto do site). */
export function Pic({ src, label, round = false, size = 48 }: { src: string; label: string; round?: boolean; size?: number }) {
  const [failed, setFailed] = useState(false)
  const css = { '--h': hue(label), width: size, height: size } as CSSProperties
  return (
    <span className={`art ${round ? 'round' : ''}`} style={css} aria-hidden>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="art-initial">{label.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}

/** Tocar ou parar a prévia de 30 segundos. */
export function PreviewButton({ track, className = '' }: { track: DzTrack; className?: string }) {
  const state = usePreview(track.id)
  if (!track.p) return null
  const on = state !== 'idle'
  return (
    <button
      type="button"
      className={`play ${on ? 'on live' : ''} ${className}`}
      aria-label={
        on
          ? t(`Parar ${track.title}`, `Stop ${track.title}`, `Parar ${track.title}`)
          : t(`Ouvir um trecho de ${track.title}`, `Play a clip of ${track.title}`, `Escuchar un fragmento de ${track.title}`)
      }
      onClick={() => togglePreview(track)}
    >
      {state === 'loading' ? (
        <span className="ex-wait" aria-hidden />
      ) : on ? (
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

/** Abre a música no Spotify, para ouvir inteira. */
export function SpotifyLink({ track }: { track: DzTrack }) {
  const label = t('Abrir no Spotify', 'Open in Spotify', 'Abrir en Spotify')
  return (
    <a className="ex-link" href={spotifySearch(track)} target="_blank" rel="noreferrer" aria-label={label} title={label}>
      <ExternalIcon />
    </a>
  )
}

/** Uma música: capa, nome, detalhe, prévia e Spotify. */
export function TrackRow({
  track,
  name = track.title,
  sub,
  why,
  pic = track.cover,
  round = false,
  extra,
}: {
  track: DzTrack
  name?: string
  sub?: string
  why?: string
  pic?: string
  round?: boolean
  extra?: ReactNode
}) {
  return (
    <li className="ex-row">
      <Pic src={pic} label={name} round={round} />
      <div className="ex-body">
        <span className="ex-title">{name}</span>
        {sub && <span className="ex-sub">{sub}</span>}
        {why && <span className="ex-why">{why}</span>}
      </div>
      {extra}
      <PreviewButton track={track} />
      <SpotifyLink track={track} />
    </li>
  )
}

/** Linhas cinzas enquanto carrega. */
export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="ex-list ex-skel" aria-label={t('Carregando', 'Loading', 'Cargando')}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="ex-row">
          <span className="art" />
          <div className="ex-body">
            <i />
            <i />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="ex-fail">
      {t('Não deu para carregar agora.', "Couldn't load this right now.", 'No se ha podido cargar ahora.')}{' '}
      <button className="ghost" onClick={onRetry}>
        {t('Tentar de novo', 'Try again', 'Reintentar')}
      </button>
    </p>
  )
}

/** "Se você gosta de X": 5 artistas parecidos que você nunca ouviu, cada um com a música mais famosa. */
export function SimilarSection({ data, name }: { data: Dataset; name: string }) {
  const { data: list, failed, retry } = useAsync(`s:${data.importedAt}:${name}`, () => similarTo(data, name))
  // O Deezer não conhece o artista (ou só tem parecidos que você já ouve): a seção some.
  if (list && list.length === 0) return null
  return (
    <Section title={t(`Se você gosta de ${name}`, `If you like ${name}`, `Si te gusta ${name}`)}>
      <div className="card">
        {list ? (
          <ul className="ex-list">
            {list.map(({ artist, track }) =>
              track ? (
                <TrackRow key={artist.id} track={track} name={artist.name} sub={track.title} pic={artist.picture} round />
              ) : null,
            )}
          </ul>
        ) : failed ? (
          <Failed onRetry={retry} />
        ) : (
          <Loading rows={5} />
        )}
      </div>
    </Section>
  )
}
