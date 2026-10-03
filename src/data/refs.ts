import type { Dataset } from './types'
import type { ImageRef } from './images'

/** Para cada artista, o álbum da música que você mais ouviu dele (capa reserva quando não há foto). */
const topAlbum = new WeakMap<Dataset, Map<number, number>>()

function bestItems(d: Dataset): Map<number, number> {
  let m = topAlbum.get(d)
  if (m) return m
  const msByItem = new Float64Array(d.items.length)
  const { ms, item } = d.plays
  for (let i = 0; i < item.length; i++) msByItem[item[i]] += ms[i]
  m = new Map()
  for (let it = 0; it < d.items.length; it++) {
    const c = d.items[it].creator
    const cur = m.get(c)
    if (cur === undefined || msByItem[it] > msByItem[cur]) m.set(c, it)
  }
  topAlbum.set(d, m)
  return m
}

/** Imagem de um artista ou podcast (pelo índice do criador). */
export function artistRef(d: Dataset, creator: number): ImageRef {
  const it = bestItems(d).get(creator)
  const item = it === undefined ? undefined : d.items[it]
  const name = d.creators[creator]
  if (item?.kind === 'podcast') return { kind: 'podcast', name }
  return {
    kind: 'artist',
    name,
    fallback: item?.album ? { kind: 'album', artist: name, album: item.album } : undefined,
  }
}

/** Imagem de uma música (capa do álbum) ou episódio (imagem do podcast). */
export function itemRef(d: Dataset, id: number): ImageRef | undefined {
  const it = d.items[id]
  const artist = d.creators[it.creator]
  if (it.kind === 'podcast') return { kind: 'podcast', name: artist }
  return it.album ? { kind: 'album', artist, album: it.album } : undefined
}
