import { useState, type CSSProperties } from 'react'
import { useImage, type ImageRef } from '../data/images'

/** Um tom fixo por nome, para a inicial não ficar sempre no mesmo cinza. */
function hue(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

interface ArtProps {
  image?: ImageRef
  label: string
  /** Tamanho fixo em px; sem ele, ocupa a largura do contêiner. */
  size?: number
  /** Redonda (artista) ou quadrada (capa). Por padrão segue o tipo da imagem. */
  round?: boolean
  className?: string
  style?: CSSProperties
}

/** Foto ou capa. Enquanto não carrega (ou se não existir), mostra a inicial num fundo colorido. */
export function Art({ image, label, size, round, className = '', style }: ArtProps) {
  const url = useImage(image)
  const [failed, setFailed] = useState<string | null>(null)
  const isRound = round ?? (image ? image.kind !== 'album' : false)
  const show = url && failed !== url
  const css = { '--h': hue(label), ...(size ? { width: size, height: size } : {}), ...style } as CSSProperties
  return (
    <span className={`art ${size ? '' : 'fill'} ${isRound ? 'round' : ''} ${className}`} style={css} aria-hidden>
      {show ? (
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(url)} />
      ) : (
        <span className="art-initial">{label.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}

/** Miniatura de tamanho fixo, para listas. */
export function Thumb({ image, label, size = 40 }: { image: ImageRef; label: string; size?: number }) {
  return <Art image={image} label={label} size={size} />
}
