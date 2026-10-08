import { useMemo, useState } from 'react'
import type { Dataset, SavedTrack } from '../data/types'
import { likedForgotten, playlistStats } from '../data/account'
import { itemRef } from '../data/refs'
import { Art } from '../ui/Thumb'
import { BarList } from '../ui/parts'
import { PlayButton } from '../ui/player'
import { isSpotifyUri, trackOf } from '../ui/playerStore'
import { songHref } from '../ui/links'
import { cleanTitle, date, hours, monthLabel, num } from '../ui/format'
import { t } from '../i18n'

const FEW = 6

/** Suas playlists, da que você mais ouve para a que ficou parada. */
export function Playlists({ data }: { data: Dataset }) {
  const list = useMemo(() => playlistStats(data), [data])
  const [all, setAll] = useState(false)
  if (list.length === 0) return null
  const max = list[0].msYear || 1
  return (
    <>
      <BarList
        numbered={false}
        rows={list.slice(0, all ? list.length : FEW).map((p, i) => ({
          key: i,
          name: p.name,
          sub: t(
            `${num(p.recent)} de ${num(p.songs)} músicas tocaram no último ano`,
            `${num(p.recent)} of ${num(p.songs)} songs played in the last year`,
            `${num(p.recent)} de ${num(p.songs)} canciones sonaron en el último año`,
          ),
          value: hours(p.msYear),
          share: p.msYear / max,
          image: p.top === null ? undefined : itemRef(data, p.top),
          track: p.top === null ? null : trackOf(data, p.top),
        }))}
      />
      {list.length > FEW && (
        <div className="more">
          <button className="ghost" onClick={() => setAll(!all)}>
            {all ? t('Ver menos', 'Show less', 'Ver menos') : t('Ver todas', 'Show all', 'Ver todas')}
          </button>
        </div>
      )}
    </>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const monthOf = (ms: number) => {
  const d = new Date(ms)
  return monthLabel(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
}

const savedTrack = (s: SavedTrack) => (isSpotifyUri(s.uri) ? { uri: s.uri, name: s.name, artist: s.artist } : null)

/** Curtidas que você largou (e as que nunca tocou). */
export function Curtidas({ data }: { data: Dataset }) {
  const f = useMemo(() => likedForgotten(data), [data])
  if (!f || (f.abandoned.length === 0 && f.neverCount === 0)) return null
  return (
    <>
      {f.abandoned.length > 0 && (
        <ol className="wall faded">
          {f.abandoned.map((a) => {
            const name = cleanTitle(data.items[a.id].name)
            return (
              <li
                key={a.id}
                title={t(
                  `${name}: ${num(a.plays)} reproduções, a última em ${date(a.last)}`,
                  `${name}: ${num(a.plays)} plays, last on ${date(a.last)}`,
                  `${name}: ${num(a.plays)} reproducciones, la última el ${date(a.last)}`,
                )}
              >
                <div className="wall-art">
                  <Art image={itemRef(data, a.id)} label={name} round={false} />
                  <PlayButton track={trackOf(data, a.id)} className="play-over" />
                </div>
                <a className="wall-name" href={songHref(a.id)}>
                  {name}
                </a>
                <span className="faded-last">{monthOf(a.last)}</span>
              </li>
            )
          })}
        </ol>
      )}
      {f.neverCount > 0 && (
        <>
          <p className="sec-note liked-never">
            {data.format === 'basic'
              ? t(
                  `${num(f.neverCount)} das suas ${num(f.liked)} curtidas não tocaram nenhuma vez no último ano.`,
                  `${num(f.neverCount)} of your ${num(f.liked)} liked songs didn't play once in the last year.`,
                  `${num(f.neverCount)} de tus ${num(f.liked)} canciones favoritas no sonaron ni una vez en el último año.`,
                )
              : t(
                  `${num(f.neverCount)} das suas ${num(f.liked)} curtidas nunca tocaram de verdade.`,
                  `${num(f.neverCount)} of your ${num(f.liked)} liked songs never really got played.`,
                  `${num(f.neverCount)} de tus ${num(f.liked)} canciones favoritas nunca sonaron de verdad.`,
                )}
          </p>
          <ol className="wall faded">
            {f.never.map((s) => (
              <li key={s.uri ?? `${s.artist}|${s.name}`} title={`${s.name} · ${s.artist}`}>
                <div className="wall-art">
                  <Art image={s.album ? { kind: 'album', artist: s.artist, album: s.album } : { kind: 'artist', name: s.artist }} label={s.name} round={false} />
                  <PlayButton track={savedTrack(s)} className="play-over" />
                </div>
                <span className="wall-name">{cleanTitle(s.name)}</span>
                <span className="wall-value">{s.artist}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  )
}
