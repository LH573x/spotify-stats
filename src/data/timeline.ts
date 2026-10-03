import type { Dataset } from './types'
import { MIN_PLAY_MS, kindMatches, type KindFilter } from './stats'

export interface YearTop {
  year: number
  totalMs: number
  top: { id: number; name: string; ms: number }[]
  /** As músicas (ou episódios) mais ouvidas do ano. */
  topItems: { id: number; name: string; ms: number }[]
}

export interface Discovery {
  year: number
  /** Artista conhecido nesse ano que você mais ouviu desde então. */
  best: { id: number; name: string; ms: number; first: number } | null
  count: number
}

export interface Phase {
  id: number
  name: string
  /** Mês do pico, "2021-06". */
  month: string
  peakMs: number
  totalMs: number
}

/** Uma música ouvida muito num mês só. */
export interface SongPhase {
  id: number
  /** Mês do pico, "2021-06". */
  month: string
  peakPlays: number
  totalPlays: number
}

export interface Timeline {
  years: YearTop[]
  /** Artistas novos por mês: "2021-06" → quantidade. */
  newPerMonth: { month: string; count: number }[]
  discoveries: Discovery[]
  phases: Phase[]
  /** Todos os artistas, do mais ouvido ao menos ouvido (para a busca). */
  ranking: { id: number; name: string; ms: number }[]
  songPhases: SongPhase[]
  /** As músicas mais ouvidas de todos os tempos (para a busca). */
  songRanking: { id: number; ms: number }[]
}

const pad = (n: number) => String(n).padStart(2, '0')
const monthKey = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`

/** Uma fase precisa de pelo menos 5 h no total e de metade disso concentrada num único mês. */
const PHASE_MIN_MS = 5 * 3.6e6
const PHASE_MIN_SHARE = 0.5
/** Para músicas: pelo menos 12 reproduções, metade delas no mesmo mês. */
const SONG_PHASE_MIN_PLAYS = 12

export function timeline(d: Dataset, kind: KindFilter, topN = 5): Timeline {
  const { start, ms, item, flags } = d.plays
  const perYear = new Map<number, Map<number, number>>()
  const yearTotal = new Map<number, number>()
  const total = new Map<number, number>()
  const firstHeard = new Map<number, number>()
  const perMonth = new Map<number, Map<string, number>>()
  const itemsPerYear = new Map<number, Map<number, number>>()
  const itemTotal = new Map<number, number>()
  const itemPlays = new Map<number, Map<string, number>>()
  let firstMonth: string | null = null
  let lastMonth: string | null = null

  for (let i = 0; i < start.length; i++) {
    if (!kindMatches(flags[i], kind)) continue
    const dt = new Date(start[i])
    const y = dt.getFullYear()
    const mk = monthKey(dt)
    firstMonth ??= mk
    lastMonth = mk
    const c = d.items[item[i]].creator
    const played = ms[i]

    let ym = perYear.get(y)
    if (!ym) perYear.set(y, (ym = new Map()))
    ym.set(c, (ym.get(c) ?? 0) + played)
    yearTotal.set(y, (yearTotal.get(y) ?? 0) + played)
    total.set(c, (total.get(c) ?? 0) + played)
    if (played >= MIN_PLAY_MS && !firstHeard.has(c)) firstHeard.set(c, start[i])

    let cm = perMonth.get(c)
    if (!cm) perMonth.set(c, (cm = new Map()))
    cm.set(mk, (cm.get(mk) ?? 0) + played)

    const it = item[i]
    let iy = itemsPerYear.get(y)
    if (!iy) itemsPerYear.set(y, (iy = new Map()))
    iy.set(it, (iy.get(it) ?? 0) + played)
    itemTotal.set(it, (itemTotal.get(it) ?? 0) + played)
    if (played >= MIN_PLAY_MS) {
      let ip = itemPlays.get(it)
      if (!ip) itemPlays.set(it, (ip = new Map()))
      ip.set(mk, (ip.get(mk) ?? 0) + 1)
    }
  }

  const years: YearTop[] = [...perYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, m]) => ({
      year,
      totalMs: yearTotal.get(year) ?? 0,
      top: [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([id, v]) => ({ id, name: d.creators[id], ms: v })),
      topItems: [...(itemsPerYear.get(year) ?? new Map<number, number>()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([id, v]) => ({ id, name: d.items[id].name, ms: v })),
    }))

  // Descobertas: o primeiro play de 30 s+ de cada artista.
  const newCount = new Map<string, number>()
  const byYear = new Map<number, Discovery>()
  for (const [c, t] of firstHeard) {
    const dt = new Date(t)
    const mk = monthKey(dt)
    newCount.set(mk, (newCount.get(mk) ?? 0) + 1)
    const y = dt.getFullYear()
    const disc = byYear.get(y) ?? { year: y, best: null, count: 0 }
    disc.count++
    const v = total.get(c) ?? 0
    if (!disc.best || v > disc.best.ms) disc.best = { id: c, name: d.creators[c], ms: v, first: t }
    byYear.set(y, disc)
  }
  const newPerMonth: Timeline['newPerMonth'] = []
  if (firstMonth && lastMonth) {
    const [fy, fm] = firstMonth.split('-').map(Number)
    const cur = new Date(fy, fm - 1, 1)
    while (monthKey(cur) <= lastMonth) {
      const k = monthKey(cur)
      newPerMonth.push({ month: k, count: newCount.get(k) ?? 0 })
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  // Fases: artistas cuja escuta se concentrou num mês só.
  const phases: Phase[] = []
  for (const [c, months] of perMonth) {
    const t = total.get(c) ?? 0
    if (t < PHASE_MIN_MS) continue
    let peak: [string, number] = ['', 0]
    for (const e of months) if (e[1] > peak[1]) peak = e
    if (peak[1] / t >= PHASE_MIN_SHARE) {
      phases.push({ id: c, name: d.creators[c], month: peak[0], peakMs: peak[1], totalMs: t })
    }
  }
  phases.sort((a, b) => b.peakMs - a.peakMs)

  const songPhases: SongPhase[] = []
  for (const [it, months] of itemPlays) {
    if (d.items[it].kind !== 'music') continue
    let total = 0
    let peak: [string, number] = ['', 0]
    for (const e of months) {
      total += e[1]
      if (e[1] > peak[1]) peak = e
    }
    if (total >= SONG_PHASE_MIN_PLAYS && peak[1] / total >= PHASE_MIN_SHARE) {
      songPhases.push({ id: it, month: peak[0], peakPlays: peak[1], totalPlays: total })
    }
  }
  songPhases.sort((a, b) => b.peakPlays - a.peakPlays)

  return {
    years,
    newPerMonth,
    discoveries: [...byYear.values()].sort((a, b) => a.year - b.year),
    phases: phases.slice(0, 10),
    ranking: [...total.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ id, name: d.creators[id], ms: v })),
    songPhases: songPhases.slice(0, 10),
    songRanking: [...itemTotal.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, ms]) => ({ id, ms })),
  }
}
