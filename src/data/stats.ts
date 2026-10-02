import { FLAG_PODCAST, type Dataset } from './types'

export type KindFilter = 'all' | 'music' | 'podcast'

export interface Filter {
  /** null = todos os anos */
  year: number | null
  kind: KindFilter
}

/** Mesmo critério do Spotify: só conta como reprodução a partir de 30 segundos. */
export const MIN_PLAY_MS = 30_000

export interface Ranked {
  id: number
  name: string
  sub: string
  ms: number
  plays: number
}

export interface Summary {
  totalMs: number
  plays: number
  creators: number
  items: number
  activeDays: number
  first: number | null
  last: number | null
  topCreators: Ranked[]
  topItems: Ranked[]
  /** Horas por mês: rótulo "2024-03" e horas. */
  monthly: { month: string; hours: number }[]
  /** Total do ano anterior, quando um ano está selecionado. */
  previousYearMs: number | null
}

export function years(d: Dataset): number[] {
  const set = new Set<number>()
  const s = d.plays.start
  for (let i = 0; i < s.length; i++) set.add(new Date(s[i]).getFullYear())
  return [...set].sort((a, b) => a - b)
}

export function hasPodcasts(d: Dataset): boolean {
  return d.plays.flags.some((f) => (f & FLAG_PODCAST) !== 0)
}

function kindMatches(flags: number, kind: KindFilter): boolean {
  if (kind === 'all') return true
  const podcast = (flags & FLAG_PODCAST) !== 0
  return kind === 'podcast' ? podcast : !podcast
}

const pad = (n: number) => String(n).padStart(2, '0')
const monthKey = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`
const dayKey = (dt: Date) => `${monthKey(dt)}-${pad(dt.getDate())}`

function top(map: Map<number, { ms: number; plays: number }>, n: number, label: (id: number) => [string, string]): Ranked[] {
  return [...map.entries()]
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, n)
    .map(([id, v]) => {
      const [name, sub] = label(id)
      return { id, name, sub, ms: v.ms, plays: v.plays }
    })
}

export function summarize(d: Dataset, f: Filter, topN = 10): Summary {
  const { start, ms, item, flags } = d.plays
  const byCreator = new Map<number, { ms: number; plays: number }>()
  const byItem = new Map<number, { ms: number; plays: number }>()
  const byMonth = new Map<string, number>()
  const days = new Set<string>()
  let totalMs = 0
  let plays = 0
  let previousYearMs = 0
  let first: number | null = null
  let last: number | null = null

  for (let i = 0; i < start.length; i++) {
    if (!kindMatches(flags[i], f.kind)) continue
    const dt = new Date(start[i])
    const y = dt.getFullYear()
    if (f.year !== null && y !== f.year) {
      if (y === f.year - 1) previousYearMs += ms[i]
      continue
    }
    const played = ms[i]
    const counted = played >= MIN_PLAY_MS ? 1 : 0
    totalMs += played
    plays += counted
    first ??= start[i]
    last = start[i]
    days.add(dayKey(dt))
    const mk = monthKey(dt)
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + played)

    const it = item[i]
    const c = d.items[it].creator
    const ce = byCreator.get(c)
    if (ce) {
      ce.ms += played
      ce.plays += counted
    } else byCreator.set(c, { ms: played, plays: counted })
    const ie = byItem.get(it)
    if (ie) {
      ie.ms += played
      ie.plays += counted
    } else byItem.set(it, { ms: played, plays: counted })
  }

  // Meses contínuos (inclui meses sem nada, com zero), para a linha não "pular" buracos.
  const monthly: Summary['monthly'] = []
  if (first !== null && last !== null) {
    const cur = new Date(f.year ?? new Date(first).getFullYear(), f.year ? 0 : new Date(first).getMonth(), 1)
    const end = f.year ? new Date(f.year, 11, 1) : new Date(new Date(last).getFullYear(), new Date(last).getMonth(), 1)
    while (cur <= end) {
      const k = monthKey(cur)
      monthly.push({ month: k, hours: (byMonth.get(k) ?? 0) / 3.6e6 })
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  return {
    totalMs,
    plays,
    creators: byCreator.size,
    items: byItem.size,
    activeDays: days.size,
    first,
    last,
    topCreators: top(byCreator, topN, (id) => [d.creators[id], '']),
    topItems: top(byItem, topN, (id) => [d.items[id].name, d.creators[d.items[id].creator]]),
    monthly,
    previousYearMs: f.year !== null && previousYearMs > 0 ? previousYearMs : null,
  }
}
