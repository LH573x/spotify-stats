import type { Playlist } from '../data/types'
import { playlistCovers } from '../data/account'
import { Art } from './Thumb'

/** Capa da playlist em mosaico: 4 capas de álbum, ou uma só quando não há 4 álbuns diferentes. */
export function PlaylistCover({ playlist, className = '' }: { playlist: Playlist; className?: string }) {
  const covers = playlistCovers(playlist)
  if (covers.length < 4)
    return <Art image={covers[0]} label={playlist.name} round={false} className={`pl-cover ${className}`} />
  return (
    <span className={`pl-cover pl-mosaic ${className}`} aria-hidden>
      {covers.map((c) => (
        <Art key={`${c.artist}|${c.album}`} image={c} label={c.album} round={false} />
      ))}
    </span>
  )
}
