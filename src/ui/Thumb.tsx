import { useState } from 'react'
import { useImage, type ImageRef } from '../data/images'

/** Foto (redonda, artista) ou capa (quadrada, álbum). Enquanto não carrega, mostra a inicial. */
export function Thumb({ image, label, size = 40 }: { image: ImageRef; label: string; size?: number }) {
  const url = useImage(image)
  const [failed, setFailed] = useState<string | null>(null)
  const round = image.kind !== 'album'
  const show = url && failed !== url
  return (
    <span className={`thumb ${round ? 'round' : ''}`} style={{ width: size, height: size }} aria-hidden>
      {show ? (
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(url)} />
      ) : (
        <span style={{ fontSize: size * 0.42 }}>{label.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}
