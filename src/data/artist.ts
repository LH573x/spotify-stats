import type { Dataset } from './types'
import { MIN_PLAY_MS } from './stats'

export interface ArtistDetail {
  id: number
  name: string
  kind: 'music' | 'podcast'
  totalMs: number
  plays: number
  /** Posição entre todos os artistas (ou programas) de todos os tempos, 1 = mais ouvido. */
  rank: number
  rankOf: number
  first: { t: number; item: string } | null
  last: { t: number; item: string } | null
  monthly: { month: string; hours: number }[]
  yearly: { year: number; ms: number; rank: number }[]
  topItems: { id: number; name: string; album: string; ms: number; plays: number }[]
  itemCount: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const monthKey = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`

export function artistDetail(d: Dataset, id: number): ArtistDetail | null {
  if (!d.creators[id]) return null
  const { start, ms, item } = d.plays
  const kind = d.items.find((it) => it.creator === id)?.kind ?? 'music'

  // Totais de todos os criadores do mesmo tipo, para a posição no ranking geral e por ano.
  const totals = new Map<number, number>()
  const yearTotals = new Map<number, Map<number, number>>()
  const byMonth = new Map<string, number>()
  const byItem = new Map<number, { ms: number; plays: number }>()
  let totalMs = 0
  let plays = 0
  let first: ArtistDetail['first'] = null
  let last: ArtistDetail['last'] = null

  for (let i = 0; i < start.length; i++) {
    const it = d.items[item[i]]
    if (it.kind !== kind) continue
    const c = it.creator
    const played = ms[i]
    const dt = new Date(start[i])
    const y = dt.getFullYear()
    totals.set(c, (totals.get(c) ?? 0) + played)
    let yt = yearTotals.get(y)
    if (!yt) yearTotals.set(y, (yt = new Map()))
    yt.set(c, (yt.get(c) ?? 0) + played)
    if (c !== id) continue

    totalMs += played
    const mk = monthKey(dt)
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + played)
    const e = byItem.get(item[i]) ?? { ms: 0, plays: 0 }
    e.ms += played
    if (played >= MIN_PLAY_MS) {
      e.plays++
      plays++
      first ??= { t: start[i], item: it.name }
      last = { t: start[i], item: it.name }
    }
    byItem.set(item[i], e)
  }
  if (totalMs === 0) return null

  const rankOf = totals.size
  const rank = [...totals.values()].filter((v) => v > totalMs).length + 1

  const months = [...byMonth.keys()].sort()
  const monthly: ArtistDetail['monthly'] = []
  if (months.length) {
    const [fy, fm] = months[0].split('-').map(Number)
    const lastKey = months[months.length - 1]
    const cur = new Date(fy, fm - 1, 1)
    while (monthKey(cur) <= lastKey) {
      const k = monthKey(cur)
      monthly.push({ month: k, hours: (byMonth.get(k) ?? 0) / 3.6e6 })
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  const yearly = [...yearTotals.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([year, m]) => {
      const mine = m.get(id)
      if (!mine) return []
      return [{ year, ms: mine, rank: [...m.values()].filter((v) => v > mine).length + 1 }]
    })

  return {
    id,
    name: d.creators[id],
    kind,
    totalMs,
    plays,
    rank,
    rankOf,
    first,
    last,
    monthly,
    yearly,
    topItems: [...byItem.entries()]
      .sort((a, b) => b[1].ms - a[1].ms)
      .slice(0, 10)
      .map(([iid, v]) => ({ id: iid, name: d.items[iid].name, album: d.items[iid].album, ms: v.ms, plays: v.plays })),
    itemCount: byItem.size,
  }
}
