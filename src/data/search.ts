import type { Dataset } from './types'
import type { Timeline } from './timeline'

/** Um resultado da busca: artista (ou podcast) ou música (ou episódio). */
export interface Hit {
  kind: 'artist' | 'song'
  id: number
  name: string
  /** Para músicas, o artista; para episódios, o podcast. */
  by: string
  podcast: boolean
}

interface Entry extends Hit {
  /** Nome normalizado, para saber se a busca é o nome exato ou o começo dele. */
  key: string
  /** Nome e artista normalizados, com espaço na frente: " i wanna be yours arctic monkeys". */
  words: string
  ms: number
}

/** "Ação & Reação!" → "acao reacao": sem acento, sem pontuação, em minúsculas. */
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** Todos os artistas e todas as músicas que você já ouviu, prontos para a busca. */
export function searchIndex(d: Dataset, t: Timeline): Entry[] {
  const podcastCreator = new Set<number>()
  for (const it of d.items) if (it.kind === 'podcast') podcastCreator.add(it.creator)
  const list: Entry[] = []
  for (const r of t.ranking) {
    const key = norm(r.name)
    list.push({ kind: 'artist', id: r.id, name: r.name, by: '', podcast: podcastCreator.has(r.id), key, words: ' ' + key, ms: r.ms })
  }
  for (const r of t.songRanking) {
    const it = d.items[r.id]
    const by = d.creators[it.creator]
    const key = norm(it.name)
    list.push({ kind: 'song', id: r.id, name: it.name, by, podcast: it.kind === 'podcast', key, words: ` ${key} ${norm(by)}`, ms: r.ms })
  }
  return list
}

/**
 * Cada palavra digitada tem que começar uma palavra do nome ou do artista, em qualquer ordem:
 * "wanna yours arctic" acha "I Wanna Be Yours" do Arctic Monkeys. Se nada bate com todas as
 * palavras (um erro de digitação, um "do" no meio), ficam os que batem com mais palavras.
 * O nome exato vem primeiro, depois quem começa com o que foi digitado, depois o mais ouvido.
 */
export function search(index: Entry[], query: string, limit = 8): Hit[] {
  const q = norm(query)
  if (!q) return []
  const parts = q.split(' ')
  let best = 0
  const found: { e: Entry; n: number; rank: number }[] = []
  for (const e of index) {
    let n = 0
    for (const p of parts) if (e.words.includes(' ' + p)) n++
    if (n === 0 || n < best) continue
    best = n
    const rank = e.key === q ? 0 : e.key.startsWith(q) ? 1 : 2
    found.push({ e, n, rank })
  }
  // Com erro de digitação, pelo menos metade das palavras precisa bater.
  if (best * 2 < parts.length) return []
  return found
    .filter((f) => f.n === best)
    .sort((a, b) => a.rank - b.rank || b.e.ms - a.e.ms)
    .slice(0, limit)
    .map(({ e }) => ({ kind: e.kind, id: e.id, name: e.name, by: e.by, podcast: e.podcast }))
}
