import type { Dataset } from './types'
import { MIN_PLAY_MS, kindMatches, summarize, type Filter, type KindFilter, type Ranked } from './stats'
import { DAY_PARTS, dayKey } from './habits'

/** Pausa máxima entre duas faixas para ainda contar como a mesma sessão. */
const SESSION_GAP_MS = 10 * 60_000

export interface Records {
  /** Maior tempo ouvindo sem pausa de mais de 10 minutos. */
  marathon: { start: number; end: number; tracks: number } | null
  /** A mesma música mais vezes num só dia. */
  repeatDay: { item: number; day: string; count: number } | null
  /** A madrugada (0h às 6h) com mais tempo ouvindo; `day` é a data dessa madrugada. */
  lateNight: { day: string; ms: number } | null
  /** Mais faixas seguidas do mesmo artista. */
  artistRun: { creator: number; count: number; start: number } | null
  /** A faixa ouvida no maior número de dias diferentes. */
  loyal: { item: number; days: number } | null
  /** A primeira faixa do período. */
  first: { item: number; t: number } | null
  /** O dia com mais artistas diferentes. */
  variety: { day: string; artists: number } | null
}

export function records(d: Dataset, f: Filter): Records {
  const { start, ms, item, flags } = d.plays
  let marathon: Records['marathon'] = null
  let sStart = 0
  let sEnd = -Infinity
  let sTracks = 0
  const perDayItem = new Map<string, number>()
  let repeatDay: Records['repeatDay'] = null
  const nights = new Map<string, number>()
  let artistRun: Records['artistRun'] = null
  let runCreator = -1
  let runCount = 0
  let runStart = 0
  const days = new Map<number, Set<string>>()
  let first: Records['first'] = null
  const artistsByDay = new Map<string, Set<number>>()

  const closeSession = () => {
    if (sTracks > 1 && (!marathon || sEnd - sStart > marathon.end - marathon.start)) {
      marathon = { start: sStart, end: sEnd, tracks: sTracks }
    }
  }

  for (let i = 0; i < start.length; i++) {
    if (!kindMatches(flags[i], f.kind)) continue
    const dt = new Date(start[i])
    if (f.year !== null && dt.getFullYear() !== f.year) continue
    const t = start[i]
    const played = ms[i]

    if (t - sEnd <= SESSION_GAP_MS) {
      sTracks++
      sEnd = Math.max(sEnd, t + played)
    } else {
      closeSession()
      sStart = t
      sEnd = t + played
      sTracks = 1
    }

    const k = dayKey(dt)
    if (dt.getHours() < 6) nights.set(k, (nights.get(k) ?? 0) + played)
    if (played < MIN_PLAY_MS) continue

    first ??= { item: item[i], t }
    const it = item[i]
    const c = d.items[it].creator

    const dk = `${k}|${it}`
    const n = (perDayItem.get(dk) ?? 0) + 1
    perDayItem.set(dk, n)
    if (!repeatDay || n > repeatDay.count) repeatDay = { item: it, day: k, count: n }

    if (c === runCreator) runCount++
    else {
      runCreator = c
      runCount = 1
      runStart = t
    }
    if (!artistRun || runCount > artistRun.count) artistRun = { creator: c, count: runCount, start: runStart }

    let ds = days.get(it)
    if (!ds) days.set(it, (ds = new Set()))
    ds.add(k)

    let as = artistsByDay.get(k)
    if (!as) artistsByDay.set(k, (as = new Set()))
    as.add(c)
  }
  closeSession()

  let lateNight: Records['lateNight'] = null
  for (const [day, v] of nights) if (!lateNight || v > lateNight.ms) lateNight = { day, ms: v }
  let loyal: Records['loyal'] = null
  for (const [it, s] of days) if (!loyal || s.size > loyal.days) loyal = { item: it, days: s.size }
  let variety: Records['variety'] = null
  for (const [day, s] of artistsByDay) if (!variety || s.size > variety.artists) variety = { day, artists: s.size }

  return { marathon, repeatDay, lateNight, artistRun, loyal, first, variety }
}

export interface Forgotten {
  id: number
  /** Reproduções no período escolhido. */
  plays: number
  /** Última vez que tocou (em qualquer época). */
  last: number
  /** Ano em que mais tocou. */
  peakYear: number
}

/** Quanto tempo sem tocar para uma música contar como esquecida. */
const FORGOTTEN_AFTER_MS = 365 * 86_400_000

/**
 * Músicas que você ouviu muito e não toca há mais de um ano (contando até o fim do export).
 * Episódios de podcast ficam de fora: é normal não ouvir um episódio de novo.
 */
export function forgotten(d: Dataset, f: Filter, n = 12): Forgotten[] {
  const { start, ms, item } = d.plays
  if (start.length === 0) return []
  const cut = start[start.length - 1] - FORGOTTEN_AFTER_MS
  const minPlays = f.year === null ? 20 : 10
  const last = new Map<number, number>()
  const plays = new Map<number, number>()
  const perYear = new Map<number, Map<number, number>>()

  for (let i = 0; i < start.length; i++) {
    const it = item[i]
    if (d.items[it].kind !== 'music') continue
    last.set(it, start[i])
    if (ms[i] < MIN_PLAY_MS) continue
    const y = new Date(start[i]).getFullYear()
    let py = perYear.get(it)
    if (!py) perYear.set(it, (py = new Map()))
    py.set(y, (py.get(y) ?? 0) + 1)
    if (f.year === null || y === f.year) plays.set(it, (plays.get(it) ?? 0) + 1)
  }

  return [...plays.entries()]
    .filter(([it, p]) => p >= minPlays && (last.get(it) ?? 0) < cut)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, p]) => {
      let peakYear = 0
      let peak = -1
      for (const [y, v] of perYear.get(id)?.entries() ?? []) if (v > peak) [peakYear, peak] = [y, v]
      return { id, plays: p, last: last.get(id) ?? 0, peakYear }
    })
}

export interface YearProfile {
  year: number
  totalMs: number
  plays: number
  creators: number
  items: number
  top: Ranked[]
  topItem: Ranked | null
  /** Artistas (ou programas) ouvidos pela primeira vez nesse ano. */
  newCreators: number
  /** Primeiro ano do export: tudo é novo, então "novos" não diz nada. */
  firstYear: boolean
  /** Parte do dia em que mais ouviu. */
  part: string | null
  /** O export não cobre o ano inteiro. */
  partial: boolean
  /** Última reprodução do ano. */
  last: number | null
}

/** Um ano resumido, para comparar dois anos lado a lado. */
export function yearProfile(d: Dataset, year: number, kind: KindFilter): YearProfile {
  const s = summarize(d, { year, kind }, 5)
  const { start, ms, item, flags } = d.plays
  const seen = new Set<number>()
  let newCreators = 0
  const byHour = new Array<number>(24).fill(0)
  for (let i = 0; i < start.length; i++) {
    if (!kindMatches(flags[i], kind)) continue
    const dt = new Date(start[i])
    const y = dt.getFullYear()
    if (y > year) break
    if (y === year) byHour[dt.getHours()] += ms[i]
    if (ms[i] < MIN_PLAY_MS) continue
    const c = d.items[item[i]].creator
    if (seen.has(c)) continue
    seen.add(c)
    if (y === year) newCreators++
  }
  const parts = DAY_PARTS.map((p) => ({ name: p.name, ms: byHour.slice(p.from, p.to).reduce((a, b) => a + b, 0) }))
  const part = parts.reduce((a, b) => (b.ms > a.ms ? b : a))
  const from = s.first === null ? null : new Date(s.first)
  const to = s.last === null ? null : new Date(s.last)
  return {
    year,
    totalMs: s.totalMs,
    plays: s.plays,
    creators: s.creators,
    items: s.items,
    top: s.topCreators,
    topItem: s.topItems[0] ?? null,
    newCreators,
    firstYear: start.length > 0 && new Date(start[0]).getFullYear() === year,
    part: part.ms > 0 ? part.name : null,
    partial: !!from && !!to && (from.getMonth() > 0 || to.getMonth() < 11),
    last: s.last,
  }
}
