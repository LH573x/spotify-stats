import { FLAG_SHUFFLE, FLAG_SKIPPED, type Dataset } from './types'
import { MIN_PLAY_MS, kindMatches, type Filter } from './stats'

export interface SkipRow {
  id: number
  name: string
  sub: string
  starts: number
  skips: number
}

export interface Habits {
  /** Ano mostrado no calendário (o ano filtrado ou o mais recente). */
  calendarYear: number
  /** "2024-03-07" → horas, só do ano do calendário. */
  days: [string, number][]
  /** Dia recorde do período filtrado. */
  bestDay: { day: string; ms: number } | null
  /** Maior sequência de dias seguidos ouvindo, no período filtrado. */
  streak: { days: number; from: string; to: string } | null
  /** [dia da semana 0=seg..6=dom][hora 0..23] → horas */
  clock: number[][]
  peak: { weekday: number; hour: number; hours: number } | null
  platforms: { name: string; ms: number }[]
  /** Fração das reproduções (30 s+) feitas no aleatório. */
  shuffleShare: number | null
  /** Fração das músicas iniciadas que foram puladas. */
  skipShare: number | null
  topSkipped: SkipRow[]
}

const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

/** Partes do dia usadas em "Você é da noite". */
export const DAY_PARTS = [
  { name: 'Madrugada', from: 0, to: 6 },
  { name: 'Manhã', from: 6, to: 12 },
  { name: 'Tarde', from: 12, to: 18 },
  { name: 'Noite', from: 18, to: 24 },
]

/** Horas em cada parte do dia, a partir do relógio [dia da semana][hora]. */
export function dayParts(clock: number[][]) {
  return DAY_PARTS.map((p) => ({
    ...p,
    hours: clock.reduce((sum, row) => sum + row.slice(p.from, p.to).reduce((a, b) => a + b, 0), 0),
  }))
}

/** Músicas com poucas reproduções não entram no ranking de pulos (1 de 1 = 100% não diz nada). */
const MIN_STARTS_FOR_SKIP_RANK = 5

export function habits(d: Dataset, f: Filter, lastYear: number): Habits {
  const { start, ms, item, flags, platform } = d.plays
  const calendarYear = f.year ?? lastYear
  const calDays = new Map<string, number>()
  const allDays = new Map<string, number>()
  const clock = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  const byPlatform = new Map<number, number>()
  const skipsByItem = new Map<number, { starts: number; skips: number }>()
  let counted = 0
  let shuffled = 0
  let starts = 0
  let skips = 0

  for (let i = 0; i < start.length; i++) {
    if (!kindMatches(flags[i], f.kind)) continue
    const dt = new Date(start[i])
    const y = dt.getFullYear()
    const k = dayKey(dt)
    if (y === calendarYear) calDays.set(k, (calDays.get(k) ?? 0) + ms[i])
    if (f.year !== null && y !== f.year) continue

    const played = ms[i]
    allDays.set(k, (allDays.get(k) ?? 0) + played)
    clock[(dt.getDay() + 6) % 7][dt.getHours()] += played
    byPlatform.set(platform[i], (byPlatform.get(platform[i]) ?? 0) + played)
    if (played >= MIN_PLAY_MS) {
      counted++
      if (flags[i] & FLAG_SHUFFLE) shuffled++
    }
    starts++
    const skipped = (flags[i] & FLAG_SKIPPED) !== 0
    if (skipped) skips++
    const e = skipsByItem.get(item[i])
    if (e) {
      e.starts++
      if (skipped) e.skips++
    } else skipsByItem.set(item[i], { starts: 1, skips: skipped ? 1 : 0 })
  }

  // Dia recorde e maior sequência de dias seguidos.
  let bestDay: Habits['bestDay'] = null
  for (const [day, v] of allDays) if (!bestDay || v > bestDay.ms) bestDay = { day, ms: v }
  const sorted = [...allDays.keys()].sort()
  let streak: Habits['streak'] = null
  let runStart = 0
  for (let i = 1; i <= sorted.length; i++) {
    const contiguous =
      i < sorted.length && Date.parse(sorted[i]) - Date.parse(sorted[i - 1]) === 86_400_000
    if (contiguous) continue
    const len = i - runStart
    if (sorted.length && (!streak || len > streak.days)) {
      streak = { days: len, from: sorted[runStart], to: sorted[i - 1] }
    }
    runStart = i
  }

  let peak: Habits['peak'] = null
  for (let w = 0; w < 7; w++) {
    for (let h = 0; h < 24; h++) {
      const v = clock[w][h] / 3.6e6
      if (v > 0 && (!peak || v > peak.hours)) peak = { weekday: w, hour: h, hours: v }
    }
  }

  const known = [...byPlatform.entries()].filter(([p]) => d.platforms[p] !== 'Desconhecido')
  const extended = d.format === 'extended'

  return {
    calendarYear,
    days: [...calDays.entries()].map(([k, v]) => [k, v / 3.6e6]),
    bestDay,
    streak,
    clock: clock.map((row) => row.map((v) => v / 3.6e6)),
    peak,
    platforms: known
      .map(([p, v]) => ({ name: d.platforms[p], ms: v }))
      .sort((a, b) => b.ms - a.ms),
    shuffleShare: extended && counted ? shuffled / counted : null,
    skipShare: extended && starts ? skips / starts : null,
    topSkipped: extended
      ? [...skipsByItem.entries()]
          .filter(([, v]) => v.starts >= MIN_STARTS_FOR_SKIP_RANK && v.skips > 0)
          .sort((a, b) => b[1].skips - a[1].skips || b[1].skips / b[1].starts - a[1].skips / a[1].starts)
          .slice(0, 10)
          .map(([id, v]) => ({
            id,
            name: d.items[id].name,
            sub: d.creators[d.items[id].creator],
            starts: v.starts,
            skips: v.skips,
          }))
      : [],
  }
}
