export type Kind = 'music' | 'podcast'

/** Uma música ou um episódio de podcast. */
export interface Item {
  name: string
  /** Índice em Dataset.creators (artista ou programa de podcast). */
  creator: number
  album: string
  kind: Kind
  /** Endereço no Spotify ("spotify:track:…" ou "spotify:episode:…"), quando o export traz. */
  uri?: string
}

/** Sobe quando o jeito de ler o export muda; dados salvos de versões antigas são lidos de novo. */
export const DATASET_VERSION = 4

export const FLAG_SKIPPED = 1
export const FLAG_SHUFFLE = 2
export const FLAG_PODCAST = 4

/**
 * Histórico compacto: cada reprodução é uma posição nos arrays de `plays`,
 * ordenadas por horário de início.
 */
export interface Dataset {
  version: number
  format: 'extended' | 'basic'
  items: Item[]
  creators: string[]
  platforms: string[]
  plays: {
    /** Início da reprodução, em ms desde 1970 (UTC). */
    start: Float64Array
    ms: Uint32Array
    item: Int32Array
    flags: Uint8Array
    platform: Uint8Array
  }
  importedAt: number
  /** Playlists, curtidas e selos de ouvinte, quando veio o pacote "Dados da conta". */
  account?: Account
}

/** Uma música salva numa playlist ou nas curtidas (pode nunca ter tocado no histórico). */
export interface SavedTrack {
  name: string
  artist: string
  album: string
  uri?: string
  /** Dia em que entrou na playlist ("2026-08-16"); as curtidas não trazem. */
  added?: string
}

export interface Playlist {
  name: string
  /** Última vez que a playlist mudou ("2026-08-16"). */
  modified?: string
  tracks: SavedTrack[]
}

/** Como o Spotify classifica você como ouvinte de um artista (Marquee.json). */
export type ListenerTier = 'super' | 'moderate' | 'light' | 'past'

/** O que vem do pacote "Dados da conta". Dados pessoais (e-mail, endereço, mensagens) nunca entram aqui. */
export interface Account {
  playlists: Playlist[]
  liked: SavedTrack[]
  /** Nome do artista → selo. */
  tiers: Record<string, ListenerTier>
}
