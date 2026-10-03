import { DATASET_VERSION, type Dataset, type Item } from './types'

/**
 * O Spotify às vezes troca o código de uma música (relançamento, coletânea, mudança de catálogo),
 * e o export traz a mesma faixa com dois ou três códigos diferentes. Aqui elas viram uma só:
 * mesmo artista e mesmo nome (sem diferenciar maiúsculas). Fica o código e o álbum da versão
 * tocada por último, que é o que ainda funciona no player.
 */
export function mergeSameSongs(d: Dataset): Dataset {
  const { item, start } = d.plays
  // Última reprodução de cada item, para escolher a versão que fica.
  const lastPlay = new Float64Array(d.items.length).fill(-Infinity)
  for (let i = 0; i < item.length; i++) if (start[i] > lastPlay[item[i]]) lastPlay[item[i]] = start[i]

  const items: Item[] = []
  const keep = new Map<string, number>()
  const latest: number[] = []
  const remap = new Int32Array(d.items.length)
  d.items.forEach((it, old) => {
    const key = it.kind === 'music' ? `${it.creator}|${it.name.trim().toLowerCase()}` : null
    const id = key === null ? undefined : keep.get(key)
    if (id === undefined) {
      remap[old] = items.length
      if (key !== null) keep.set(key, items.length)
      items.push({ ...it })
      latest.push(lastPlay[old])
      return
    }
    remap[old] = id
    if (lastPlay[old] > latest[id]) {
      latest[id] = lastPlay[old]
      const { uri, album } = it
      items[id] = uri ? { ...items[id], album, uri } : { ...items[id], album }
    }
  })

  const merged = Int32Array.from(item, (it) => remap[it])
  return { ...d, version: DATASET_VERSION, items, plays: { ...d.plays, item: merged } }
}
