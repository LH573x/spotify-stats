import type { Dataset } from './types'
import { MIN_PLAY_MS, summarize, type Ranked } from './stats'
import { dayParts, habits, type Habits } from './habits'
import { timeline, type Discovery } from './timeline'

/** Um artista (ou podcast) no ano, com a faixa favorita e desde quando você ouve. */
export interface Favorite extends Ranked {
  topItem: { name: string; ms: number; plays: number } | null
  /** Quantas músicas (ou episódios) diferentes dele você ouviu no ano. */
  itemCount: number
  /** Primeira reprodução de todos os tempos. */
  since: number | null
}

export interface WrappedYear {
  year: number
  /** Primeira e última reprodução do ano. */
  from: number
  to: number
  /** O export não cobre o ano inteiro. */
  partial: boolean
  /** Primeiro ano do export: tudo é "novo", então não há descobertas de verdade. */
  firstYear: boolean
  /** Música e podcast juntos. */
  totalMs: number
  podcastMs: number
  previousYearMs: number | null
  activeDays: number
  /** Artistas e músicas diferentes (só música). */
  artists: number
  songs: number
  topArtists: Ranked[]
  topSongs: Ranked[]
  topArtist: Favorite | null
  topPodcast: Favorite | null
  /** Horas em cada mês (12) e em cada hora do dia (24). */
  months: number[]
  hours: number[]
  part: { name: string; from: number; to: number; share: number } | null
  peak: Habits['peak']
  streak: Habits['streak']
  bestDay: Habits['bestDay']
  discovery: Discovery | null
}

/** Podcast com menos que isso no ano não ganha cartão próprio. */
const MIN_PODCAST_MS = 30 * 60_000

function favorite(d: Dataset, r: Ranked | undefined, year: number): Favorite | null {
  if (!r) return null
  const { start, ms, item } = d.plays
  const byItem = new Map<number, { ms: number; plays: number }>()
  let since: number | null = null
  for (let i = 0; i < start.length; i++) {
    if (d.items[item[i]].creator !== r.id) continue
    if (since === null && ms[i] >= MIN_PLAY_MS) since = start[i]
    if (new Date(start[i]).getFullYear() !== year) continue
    const e = byItem.get(item[i]) ?? { ms: 0, plays: 0 }
    e.ms += ms[i]
    if (ms[i] >= MIN_PLAY_MS) e.plays++
    byItem.set(item[i], e)
  }
  let best: [number, { ms: number; plays: number }] | null = null
  for (const e of byItem) if (!best || e[1].ms > best[1].ms) best = e
  return {
    ...r,
    topItem: best && { name: d.items[best[0]].name, ms: best[1].ms, plays: best[1].plays },
    itemCount: byItem.size,
    since,
  }
}

export function wrapped(d: Dataset, year: number): WrappedYear | null {
  const all = summarize(d, { year, kind: 'all' }, 1)
  if (all.first === null || all.last === null) return null
  const music = summarize(d, { year, kind: 'music' }, 5)
  const podcast = summarize(d, { year, kind: 'podcast' }, 1)
  const h = habits(d, { year, kind: 'all' }, year)

  const parts = dayParts(h.clock)
  const partTotal = parts.reduce((a, p) => a + p.hours, 0)
  const topPart = parts.reduce((a, b) => (b.hours > a.hours ? b : a))
  const hours = Array.from({ length: 24 }, (_, hr) => h.clock.reduce((a, row) => a + row[hr], 0))

  const from = new Date(all.first)
  const to = new Date(all.last)
  const pod = podcast.topCreators[0]
  const firstYear = new Date(d.plays.start[0]).getFullYear() === year

  return {
    year,
    from: all.first,
    to: all.last,
    partial: from.getMonth() > 0 || to.getMonth() < 11,
    firstYear,
    totalMs: all.totalMs,
    podcastMs: podcast.totalMs,
    previousYearMs: all.previousYearMs,
    activeDays: all.activeDays,
    artists: music.creators,
    songs: music.items,
    topArtists: music.topCreators,
    topSongs: music.topItems,
    topArtist: favorite(d, music.topCreators[0], year),
    topPodcast: pod && pod.ms >= MIN_PODCAST_MS ? favorite(d, pod, year) : null,
    months: all.monthly.map((m) => m.hours),
    hours,
    part: partTotal > 0 ? { name: topPart.name, from: topPart.from, to: topPart.to, share: topPart.hours / partTotal } : null,
    peak: h.peak,
    streak: h.streak,
    bestDay: h.bestDay,
    discovery: firstYear ? null : (timeline(d, 'music').discoveries.find((x) => x.year === year) ?? null),
  }
}
