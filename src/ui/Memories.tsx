import type { Dataset } from '../data/types'
import type { DayMemory } from '../data/onThisDay'
import { artistRef, itemRef } from '../data/refs'
import { Art } from './Thumb'
import { PlayButton } from './player'
import { trackOf } from './playerStore'
import { artistHref, songHref } from './links'
import { cleanTitle } from './format'
import { useTint } from './tint'
import { t } from '../i18n'

function Memory({ data, m }: { data: Dataset; m: DayMemory }) {
  const it = data.items[m.item]
  const cover = itemRef(data, m.item)
  const photo = artistRef(data, m.creator)
  const creator = data.creators[m.creator]
  const tint = useTint(cover, it.name)
  return (
    <li className="memory tinted-card" style={tint}>
      <p className="kicker">
        {m.yearsAgo === 1
          ? t('Há 1 ano', '1 year ago', 'Hace 1 año')
          : t(`Há ${m.yearsAgo} anos`, `${m.yearsAgo} years ago`, `Hace ${m.yearsAgo} años`)}
      </p>
      <div className="memory-row">
        <span className="thumb-wrap">
          <Art image={cover} label={it.name} size={56} round={false} />
          <PlayButton track={trackOf(data, m.item)} className="play-thumb" />
        </span>
        <span className="memory-text">
          <small>{it.kind === 'podcast' ? t('Episódio', 'Episode', 'Episodio') : t('Música', 'Song', 'Canción')}</small>
          <a href={songHref(m.item)}>{cleanTitle(it.name)}</a>
        </span>
      </div>
      <div className="memory-row">
        <Art image={photo} label={creator} size={56} />
        <span className="memory-text">
          <small>{photo.kind === 'podcast' ? t('Podcast', 'Podcast', 'Podcast') : t('Artista', 'Artist', 'Artista')}</small>
          <a href={artistHref(m.creator)}>{creator}</a>
        </span>
      </div>
    </li>
  )
}

/** "Seu 4 de outubro": um cartão por ano, com a música e o artista que mais tocaram nesta data. */
export function Memories({ data, list }: { data: Dataset; list: DayMemory[] }) {
  return (
    <ol className="memories">
      {list.map((m) => (
        <Memory key={m.year} data={data} m={m} />
      ))}
    </ol>
  )
}
