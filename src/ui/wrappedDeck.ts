import type { TopPeriod, WrappedYear } from '../data/wrapped'
import { t as tr } from '../i18n'
import { cleanTitle, dayMonth, keyToMs, longHours, monthLabel, monthName, num, pct, shortDate } from './format'

export type CardId =
  | 'capa'
  | 'minutos'
  | 'artista'
  | 'top-artistas'
  | 'top-musicas'
  | 'mes'
  | 'horario'
  | 'sequencia'
  | 'descoberta'
  | 'podcast'
  | 'resumo'

export interface CardInfo {
  id: CardId
  /** Nome curto, para a barra de progresso e o arquivo. */
  title: string
  /** O que o cartão diz, para leitores de tela. */
  alt: string
}

export const minutes = (w: WrappedYear) => Math.round(w.totalMs / 60000)
export const peakMonth = (w: WrappedYear) => w.months.reduce((best, v, i, a) => (v > a[best] ? i : best), 0)
export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

/** Hora cheia nas frases em inglês: "18:00", "midnight". */
export const enHour = (h: number) => (h % 24 === 0 ? 'midnight' : `${String(h).padStart(2, '0')}:00`)

/** "Você é da noite" (o nome da parte do dia já vem no idioma da tela). */
export function partTitle(part: { name: string }) {
  const name = part.name.toLowerCase()
  return tr(
    `Você é da ${name}`,
    // "a late-night person": com hífen, por vir antes do substantivo.
    `You're ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name.replace(/ /g, '-')} person`,
    `Eres de ${name}`,
  )
}

/** Os cartões do ano, na ordem; os que não têm dados ficam de fora. */
export function deck(w: WrappedYear): CardInfo[] {
  const cards: CardInfo[] = []
  const add = (id: CardId, title: string, alt: string) => cards.push({ id, title, alt })
  const pm = peakMonth(w)

  add('capa', tr('Capa', 'Cover', 'Portada'), `Lyra, ${w.year}.`)
  add(
    'minutos',
    tr('Minutos', 'Minutes', 'Minutos'),
    tr(
      `Em ${w.year}, você ouviu ${num(minutes(w))} minutos, ou ${longHours(w.totalMs)}.`,
      `In ${w.year}, you listened for ${num(minutes(w))} minutes, or ${longHours(w.totalMs)}.`,
      `En ${w.year}, escuchaste ${num(minutes(w))} minutos, o ${longHours(w.totalMs)}.`,
    ),
  )
  if (w.topArtist) {
    add(
      'artista',
      tr('Artista do ano', 'Artist of the year', 'Artista del año'),
      tr(
        `Seu artista do ano: ${w.topArtist.name}, com ${longHours(w.topArtist.ms)}.`,
        `Your artist of the year: ${w.topArtist.name}, with ${longHours(w.topArtist.ms)}.`,
        `Tu artista del año: ${w.topArtist.name}, con ${longHours(w.topArtist.ms)}.`,
      ),
    )
  }
  if (w.topArtists.length > 1) {
    const list = w.topArtists.map((a, i) => `${i + 1}. ${a.name}`).join(', ')
    add(
      'top-artistas',
      tr('Top artistas', 'Top artists', 'Top artistas'),
      tr(`Seus artistas de ${w.year}: ${list}.`, `Your top artists of ${w.year}: ${list}.`, `Tus artistas de ${w.year}: ${list}.`),
    )
  }
  if (w.topSongs.length > 1) {
    const list = w.topSongs.map((s, i) => tr(`${i + 1}. ${cleanTitle(s.name)}, de ${s.sub}`, `${i + 1}. ${cleanTitle(s.name)}, by ${s.sub}`, `${i + 1}. ${cleanTitle(s.name)}, de ${s.sub}`)).join('; ')
    add(
      'top-musicas',
      tr('Top músicas', 'Top songs', 'Top canciones'),
      tr(`Suas músicas de ${w.year}: ${list}.`, `Your top songs of ${w.year}: ${list}.`, `Tus canciones de ${w.year}: ${list}.`),
    )
  }
  if (w.months[pm] > 0) {
    const h = longHours(w.months[pm] * 3.6e6)
    add(
      'mes',
      tr('Mês', 'Month', 'Mes'),
      tr(
        `Seu mês de ${w.year} foi ${monthName(pm)}, com ${h}.`,
        `Your top month of ${w.year} was ${monthName(pm)}, with ${h}.`,
        `Tu mes de ${w.year} fue ${monthName(pm)}, con ${h}.`,
      ),
    )
  }
  if (w.part) {
    add(
      'horario',
      tr('Horário', 'Time of day', 'Horario'),
      tr(
        `Você é da ${w.part.name.toLowerCase()}: ${pct(w.part.share)} do que ouviu tocou entre ${w.part.from}h e ${w.part.to}h.`,
        `${partTitle(w.part)}: ${pct(w.part.share)} of your listening was between ${enHour(w.part.from)} and ${enHour(w.part.to)}.`,
        `${partTitle(w.part)}: el ${pct(w.part.share)} de lo que escuchaste sonó entre las ${w.part.from} y las ${w.part.to}\u00a0h.`,
      ),
    )
  }
  if (w.streak && w.streak.days > 1) {
    const from = dayMonth(keyToMs(w.streak.from))
    const to = dayMonth(keyToMs(w.streak.to))
    add(
      'sequencia',
      tr('Sequência', 'Streak', 'Racha'),
      tr(
        `Sua maior sequência: ${num(w.streak.days)} dias seguidos, de ${from} a ${to}.`,
        `Your longest streak: ${num(w.streak.days)} days in a row, from ${from} to ${to}.`,
        `Tu mejor racha: ${num(w.streak.days)} días seguidos, del ${from} al ${to}.`,
      ),
    )
  }
  if (w.discovery?.best) {
    add(
      'descoberta',
      tr('Descoberta', 'Discovery', 'Descubrimiento'),
      tr(
        `Sua melhor descoberta: ${w.discovery.best.name}. Foram ${num(w.discovery.count)} artistas novos em ${w.year}.`,
        `Your best discovery: ${w.discovery.best.name}. ${num(w.discovery.count)} new artists in ${w.year}.`,
        `Tu mejor descubrimiento: ${w.discovery.best.name}. ${num(w.discovery.count)} artistas nuevos en ${w.year}.`,
      ),
    )
  }
  if (w.topPodcast) {
    add(
      'podcast',
      'Podcast',
      tr(
        `Seu podcast do ano: ${w.topPodcast.name}, com ${longHours(w.topPodcast.ms)}.`,
        `Your podcast of the year: ${w.topPodcast.name}, with ${longHours(w.topPodcast.ms)}.`,
        `Tu podcast del año: ${w.topPodcast.name}, con ${longHours(w.topPodcast.ms)}.`,
      ),
    )
  }
  add(
    'resumo',
    tr('Resumo', 'Summary', 'Resumen'),
    tr(
      `Resumo de ${w.year}: ${num(minutes(w))} minutos ouvidos, mês favorito ${monthName(pm)}.`,
      `${w.year} summary: ${num(minutes(w))} minutes listened, top month ${monthName(pm)}.`,
      `Resumen de ${w.year}: ${num(minutes(w))} minutos escuchados, mes favorito ${monthName(pm)}.`,
    ),
  )
  return cards
}

/** Data em ms → "2026-09" (no fuso de quem está vendo). */
export const monthKeyOf = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Título de cada Top 5: "Último mês", "Último ano", "Desde sempre". */
export function periodTitle(id: TopPeriod['id']) {
  if (id === 'mes') return tr('Último mês', 'Past month', 'Último mes')
  if (id === 'ano') return tr('Último ano', 'Past year', 'Último año')
  return tr('Desde sempre', 'All time', 'Desde siempre')
}

/** "3 set a 2 out 2026", "out 2025 a out 2026", "desde mar 2017". */
export function periodRange(t: TopPeriod) {
  if (t.id === 'sempre') {
    const since = monthLabel(monthKeyOf(t.from))
    return tr(`desde ${since}`, `since ${since}`, `desde ${since}`)
  }
  if (t.id === 'mes') return tr(`${dayMonth(t.from)} a ${shortDate(t.to)}`, `${dayMonth(t.from)} to ${shortDate(t.to)}`, `del ${dayMonth(t.from)} al ${shortDate(t.to)}`)
  const from = monthLabel(monthKeyOf(t.from))
  const to = monthLabel(monthKeyOf(t.to))
  return tr(`${from} a ${to}`, `${from} to ${to}`, `de ${from} a ${to}`)
}

/** O que o story do Top 5 diz, para leitores de tela. */
export function topAlt(t: TopPeriod) {
  const list = (xs: { name: string }[]) => xs.map((x, i) => `${i + 1}. ${cleanTitle(x.name)}`).join(', ')
  const title = periodTitle(t.id).toLowerCase()
  return tr(
    `Meu Top 5, ${title} (${periodRange(t)}). Artistas: ${list(t.artists)}. Músicas: ${list(t.songs)}.`,
    `My Top 5, ${title} (${periodRange(t)}). Artists: ${list(t.artists)}. Songs: ${list(t.songs)}.`,
    `Mi Top 5, ${title} (${periodRange(t)}). Artistas: ${list(t.artists)}. Canciones: ${list(t.songs)}.`,
  )
}
