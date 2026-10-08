import type { Account, Dataset, ListenerTier, SavedTrack } from './types'
import { MIN_PLAY_MS } from './stats'

/** Arquivos do pacote "Dados da conta" que a Lyra usa. O resto (e-mail, endereço, mensagens…) nem é aberto. */
export function isAccountFile(path: string): boolean {
  const base = path.split('/').pop() ?? path
  return /^(Playlist\d+|YourLibrary|Marquee)\.json$/i.test(base)
}

const TIERS: Record<string, ListenerTier> = {
  'super listeners': 'super',
  'moderate listeners': 'moderate',
  'light listeners': 'light',
  'previously active listeners': 'past',
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function saved(name: unknown, artist: unknown, album: unknown, uri: unknown): SavedTrack | null {
  const n = str(name).trim()
  const a = str(artist).trim()
  if (!n || !a) return null
  const u = str(uri)
  return u.startsWith('spotify:track:') ? { name: n, artist: a, album: str(album), uri: u } : { name: n, artist: a, album: str(album) }
}

/** Junta os JSONs do pacote num Account (ou undefined, se nenhum veio). */
export function readAccount(files: { name: string; json: unknown }[]): Account | undefined {
  if (files.length === 0) return undefined
  const account: Account = { playlists: [], liked: [], tiers: {} }
  for (const { name, json } of files) {
    const base = (name.split('/').pop() ?? name).toLowerCase()
    const obj = json as Record<string, unknown>
    if (base.startsWith('playlist')) {
      const list = Array.isArray(obj?.playlists) ? obj.playlists : []
      for (const p of list as Record<string, unknown>[]) {
        const items = Array.isArray(p?.items) ? (p.items as Record<string, unknown>[]) : []
        const tracks = items
          .map((i) => i?.track as Record<string, unknown> | null)
          .map((tr) => tr && saved(tr.trackName, tr.artistName, tr.albumName, tr.trackUri))
          .filter((tr): tr is SavedTrack => !!tr)
        if (tracks.length > 0) account.playlists.push({ name: str(p.name) || '—', tracks })
      }
    } else if (base === 'yourlibrary.json') {
      const list = Array.isArray(obj?.tracks) ? (obj.tracks as Record<string, unknown>[]) : []
      for (const tr of list) {
        const s = tr && saved(tr.track, tr.artist, tr.album, tr.uri)
        if (s) account.liked.push(s)
      }
    } else if (base === 'marquee.json' && Array.isArray(json)) {
      for (const m of json as Record<string, unknown>[]) {
        const tier = TIERS[str(m?.segment).toLowerCase()]
        const artist = str(m?.artistName)
        if (tier && artist) account.tiers[artist] = tier
      }
    }
  }
  return account
}

const YEAR_MS = 365 * 86_400_000
const songKey = (artist: string, name: string) => `${artist.trim().toLowerCase()}|${name.trim().toLowerCase()}`

interface Usage {
  byUri: Map<string, number>
  byName: Map<string, number>
  last: Float64Array
  plays: Uint32Array
  msYear: Float64Array
  /** Fim do histórico; "no último ano" conta a partir daqui. */
  end: number
}

const cache = new WeakMap<Dataset, Usage>()

function usage(d: Dataset): Usage {
  let u = cache.get(d)
  if (u) return u
  const n = d.items.length
  const { start, ms, item } = d.plays
  const end = start.length ? start[start.length - 1] : 0
  u = { byUri: new Map(), byName: new Map(), last: new Float64Array(n).fill(-Infinity), plays: new Uint32Array(n), msYear: new Float64Array(n), end }
  d.items.forEach((it, id) => {
    if (it.kind !== 'music') return
    if (it.uri) u!.byUri.set(it.uri, id)
    u!.byName.set(songKey(d.creators[it.creator], it.name), id)
  })
  for (let i = 0; i < start.length; i++) {
    const it = item[i]
    if (start[i] > u.last[it]) u.last[it] = start[i]
    if (ms[i] >= MIN_PLAY_MS) u.plays[it]++
    if (start[i] > end - YEAR_MS) u.msYear[it] += ms[i]
  }
  cache.set(d, u)
  return u
}

/** A música salva no histórico (ou undefined, se nunca tocou). */
function find(u: Usage, t: SavedTrack): number | undefined {
  const byUri = t.uri ? u.byUri.get(t.uri) : undefined
  return byUri ?? u.byName.get(songKey(t.artist, t.name))
}

export interface PlaylistStat {
  name: string
  songs: number
  /** Músicas da playlist que tocaram no último ano do histórico. */
  recent: number
  /** Tempo ouvindo as músicas dela no último ano (em qualquer lugar, não só na playlist). */
  msYear: number
  /** A música dela que você mais ouviu, para a capa e o play. */
  top: number | null
}

/** Quanto das suas playlists você ainda ouve, da mais ouvida para a menos. */
export function playlistStats(d: Dataset): PlaylistStat[] {
  if (!d.account) return []
  const u = usage(d)
  return d.account.playlists
    .map((p) => {
      const ids = new Set<number | string>()
      let recent = 0
      let msYear = 0
      let top: number | null = null
      for (const tr of p.tracks) {
        const id = find(u, tr)
        const key = id ?? songKey(tr.artist, tr.name)
        if (ids.has(key)) continue
        ids.add(key)
        if (id === undefined) continue
        if (u.msYear[id] > 0) recent++
        msYear += u.msYear[id]
        if (top === null || u.plays[id] > u.plays[top]) top = id
      }
      return { name: p.name, songs: ids.size, recent, msYear, top }
    })
    .sort((a, b) => b.msYear - a.msYear || b.songs - a.songs)
}

export interface LikedForgotten {
  /** Curtidas que você ouviu muito e não toca há mais de um ano. */
  abandoned: { id: number; plays: number; last: number }[]
  /** Curtidas que nunca aparecem no histórico. */
  never: SavedTrack[]
  neverCount: number
  liked: number
}

/** Curtidas esquecidas: as que você largou e as que nunca tocou. */
export function likedForgotten(d: Dataset, n = 8): LikedForgotten | null {
  if (!d.account || d.account.liked.length === 0) return null
  const u = usage(d)
  const seen = new Set<string | number>()
  const abandoned: LikedForgotten['abandoned'] = []
  const never: SavedTrack[] = []
  for (const tr of d.account.liked) {
    const id = find(u, tr)
    const key = id ?? songKey(tr.artist, tr.name)
    if (seen.has(key)) continue
    seen.add(key)
    if (id === undefined || u.plays[id] === 0) never.push(tr)
    else if (u.last[id] < u.end - YEAR_MS) abandoned.push({ id, plays: u.plays[id], last: u.last[id] })
  }
  abandoned.sort((a, b) => b.plays - a.plays)
  return { abandoned: abandoned.slice(0, n), never: never.slice(0, n / 2), neverCount: never.length, liked: seen.size }
}
