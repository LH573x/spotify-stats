import type { Dataset } from '../data/types'
import type { DayMemory } from '../data/onThisDay'
import { itemRef } from '../data/refs'
import { Art } from './Thumb'
import { PlayButton } from './player'
import { trackOf } from './playerStore'
import { songHref } from './links'
import { cleanTitle, duration } from './format'
import { useTint } from './tint'

function Memory({ data, m }: { data: Dataset; m: DayMemory }) {
  const it = data.items[m.item]
  const image = itemRef(data, m.item)
  const tint = useTint(image, it.name)
  return (
    <li className="memory tinted-card" style={tint}>
      <div className="memory-art">
        <Art image={image} label={it.name} round={false} />
        <PlayButton track={trackOf(data, m.item)} className="play-over" />
      </div>
      <p className="kicker">{m.yearsAgo === 1 ? 'Há 1 ano' : `Há ${m.yearsAgo} anos`}</p>
      <a className="memory-name" href={songHref(m.item)}>
        {cleanTitle(it.name)}
      </a>
      <span className="memory-sub">{data.creators[it.creator]}</span>
      <span className="memory-time">{duration(m.ms)}</span>
    </li>
  )
}

/** "Hoje na sua história": um cartão por ano, com o que mais tocou nesta data. */
export function Memories({ data, list }: { data: Dataset; list: DayMemory[] }) {
  return (
    <ol className="memories">
      {list.map((m) => (
        <Memory key={m.year} data={data} m={m} />
      ))}
    </ol>
  )
}
