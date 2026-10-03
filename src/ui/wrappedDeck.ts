import type { WrappedYear } from '../data/wrapped'
import { cleanTitle, dayMonth, keyToMs, longHours, monthName, num, pct } from './format'

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

/** Os cartões do ano, na ordem; os que não têm dados ficam de fora. */
export function deck(w: WrappedYear): CardInfo[] {
  const cards: CardInfo[] = []
  const add = (id: CardId, title: string, alt: string) => cards.push({ id, title, alt })
  const pm = peakMonth(w)

  add('capa', 'Capa', `Meu Spotify, ${w.year}.`)
  add('minutos', 'Minutos', `Em ${w.year}, você ouviu ${num(minutes(w))} minutos, ou ${longHours(w.totalMs)}.`)
  if (w.topArtist) {
    add('artista', 'Artista do ano', `Seu artista do ano: ${w.topArtist.name}, com ${longHours(w.topArtist.ms)}.`)
  }
  if (w.topArtists.length > 1) {
    add('top-artistas', 'Top artistas', `Seus artistas de ${w.year}: ${w.topArtists.map((a, i) => `${i + 1}. ${a.name}`).join(', ')}.`)
  }
  if (w.topSongs.length > 1) {
    add('top-musicas', 'Top músicas', `Suas músicas de ${w.year}: ${w.topSongs.map((s, i) => `${i + 1}. ${cleanTitle(s.name)}, de ${s.sub}`).join('; ')}.`)
  }
  if (w.months[pm] > 0) {
    add('mes', 'Mês', `Seu mês de ${w.year} foi ${monthName(pm)}, com ${longHours(w.months[pm] * 3.6e6)}.`)
  }
  if (w.part) {
    add('horario', 'Horário', `Você é da ${w.part.name.toLowerCase()}: ${pct(w.part.share)} do que ouviu tocou entre ${w.part.from}h e ${w.part.to}h.`)
  }
  if (w.streak && w.streak.days > 1) {
    add(
      'sequencia',
      'Sequência',
      `Sua maior sequência: ${num(w.streak.days)} dias seguidos, de ${dayMonth(keyToMs(w.streak.from))} a ${dayMonth(keyToMs(w.streak.to))}.`,
    )
  }
  if (w.discovery?.best) {
    add('descoberta', 'Descoberta', `Sua melhor descoberta: ${w.discovery.best.name}. Foram ${num(w.discovery.count)} artistas novos em ${w.year}.`)
  }
  if (w.topPodcast) {
    add('podcast', 'Podcast', `Seu podcast do ano: ${w.topPodcast.name}, com ${longHours(w.topPodcast.ms)}.`)
  }
  add('resumo', 'Resumo', `Resumo de ${w.year}: ${num(minutes(w))} minutos ouvidos, mês favorito ${monthName(pm)}.`)
  return cards
}
