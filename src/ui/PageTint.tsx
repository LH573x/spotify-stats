import { useMemo } from 'react'
import type { Dataset } from '../data/types'
import { kindMatches, type KindFilter } from '../data/stats'
import { artistRef } from '../data/refs'
import { usePageTint, useTint } from './tint'

/** Quem você mais ouviu no período (artista ou podcast), ou null se não tem nada. */
function topCreator(d: Dataset, year: number | null, kind: KindFilter): number | null {
  const { start, ms, item, flags } = d.plays
  const total = new Float64Array(d.creators.length)
  const from = year === null ? -Infinity : new Date(year, 0, 1).getTime()
  const to = year === null ? Infinity : new Date(year + 1, 0, 1).getTime()
  for (let i = 0; i < start.length; i++) {
    if (start[i] < from || start[i] >= to || !kindMatches(flags[i], kind)) continue
    total[d.items[item[i]].creator] += ms[i]
  }
  let best = -1
  for (let c = 0; c < total.length; c++) if (total[c] > 0 && (best < 0 || total[c] > total[best])) best = c
  return best < 0 ? null : best
}

/** O topo das abas ganha a cor da foto do seu artista nº 1 do período escolhido, como o Spotify faz. */
export function PageTint({ data, year, kind }: { data: Dataset; year: number | null; kind: KindFilter }) {
  const top = useMemo(() => topCreator(data, year, kind), [data, year, kind])
  usePageTint(useTint(top === null ? null : artistRef(data, top), top === null ? '' : data.creators[top]))
  return null
}
