import { FLAG_SKIPPED, type Dataset } from './types'
import { MIN_PLAY_MS } from './stats'
import { dayKey } from './habits'

export interface TrackDetail {
  id: number
  name: string
  creator: number
  album: string
  kind: 'music' | 'podcast'
  totalMs: number
  /** Reproduções de 30 s ou mais. */
  plays: number
  /** Vezes que começou a tocar e quantas dessas você pulou. */
  starts: number
  skips: number
  /** Posição entre todas as músicas (ou episódios), 1 = mais ouvida. */
  rank: number
  rankOf: number
  /** Parte do tempo que você passou ouvindo o artista. */
  artistShare: number
  first: number | null
  last: number | null
  /** Dias diferentes em que tocou. */
  days: number
  /** Dia em que mais tocou. */
  bestDay: { day: string; plays: number } | null
  /** Reproduções por mês, do primeiro ao último mês em que tocou. */
  monthly: { month: string; plays: number }[]
  yearly: { year: number; plays: number; ms: number; rank: number }[]
  /** Reproduções em cada hora do dia (0 a 23). */
  byHour: number[]
}

const pad = (n: number) => String(n).padStart(2, '0')
const monthKey = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`

export function trackDetail(d: Dataset, id: number): TrackDetail | null {
  const me = d.items[id]
  if (!me) return null
  const { start, ms, item, flags } = d.plays
  const totals = new Float64Array(d.items.length)
  const yearTotals = new Map<number, Map<number, number>>()
  let artistMs = 0
  let totalMs = 0
  let plays = 0
  let starts = 0
  let skips = 0
  let first: number | null = null
  let last: number | null = null
  const byMonth = new Map<string, number>()
  const byDay = new Map<string, number>()
  const byYear = new Map<number, { plays: number; ms: number }>()
  const byHour = new Array<number>(24).fill(0)

  for (let i = 0; i < start.length; i++) {
    const it = item[i]
    const other = d.items[it]
    if (other.kind !== me.kind) continue
    const played = ms[i]
    totals[it] += played
    const dt = new Date(start[i])
    const y = dt.getFullYear()
    let yt = yearTotals.get(y)
    if (!yt) yearTotals.set(y, (yt = new Map()))
    yt.set(it, (yt.get(it) ?? 0) + played)
    if (other.creator === me.creator) artistMs += played
    if (it !== id) continue

    totalMs += played
    starts++
    if (flags[i] & FLAG_SKIPPED) skips++
    const ye = byYear.get(y) ?? { plays: 0, ms: 0 }
    ye.ms += played
    byYear.set(y, ye)
    if (played < MIN_PLAY_MS) continue
    plays++
    ye.plays++
    first ??= start[i]
    last = start[i]
    const mk = monthKey(dt)
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1)
    const dk = dayKey(dt)
    byDay.set(dk, (byDay.get(dk) ?? 0) + 1)
    byHour[dt.getHours()]++
  }
  if (totalMs === 0) return null

  let rank = 1
  let rankOf = 0
  for (let it = 0; it < totals.length; it++) {
    if (totals[it] === 0) continue
    rankOf++
    if (totals[it] > totalMs) rank++
  }

  const months = [...byMonth.keys()].sort()
  const monthly: TrackDetail['monthly'] = []
  if (months.length) {
    const [fy, fm] = months[0].split('-').map(Number)
    const lastKey = months[months.length - 1]
    const cur = new Date(fy, fm - 1, 1)
    while (monthKey(cur) <= lastKey) {
      const k = monthKey(cur)
      monthly.push({ month: k, plays: byMonth.get(k) ?? 0 })
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  let bestDay: TrackDetail['bestDay'] = null
  for (const [day, n] of byDay) if (!bestDay || n > bestDay.plays) bestDay = { day, plays: n }

  const yearly = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => {
      const yt = yearTotals.get(year)!
      return { year, plays: v.plays, ms: v.ms, rank: [...yt.values()].filter((x) => x > v.ms).length + 1 }
    })

  return {
    id,
    name: me.name,
    creator: me.creator,
    album: me.album,
    kind: me.kind,
    totalMs,
    plays,
    starts,
    skips,
    rank,
    rankOf,
    artistShare: artistMs ? totalMs / artistMs : 0,
    first,
    last,
    days: byDay.size,
    bestDay,
    monthly,
    yearly,
    byHour,
  }
}
