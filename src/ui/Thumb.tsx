import { useState, type CSSProperties } from 'react'
import { useImageState, type ImageRef } from '../data/images'
import { hue } from './format'

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

/**
 * Foto ou capa. Enquanto busca ou baixa, um cinza que brilha ("esqueleto");
 * se não existir, a inicial num fundo colorido.
 */
export function Art({ image, label, size, round, className = '', style }: ArtProps) {
  const { url, waiting } = useImageState(image)
  const [failed, setFailed] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const isRound = round ?? (image ? image.kind !== 'album' : false)
  const show = url && failed !== url
  const wait = waiting || (show && loaded !== url)
  const css = { '--h': hue(label), ...(size ? { width: size, height: size } : {}), ...style } as CSSProperties
  return (
    <span className={`art ${size ? '' : 'fill'} ${isRound ? 'round' : ''} ${wait ? 'wait' : ''} ${className}`} style={css} aria-hidden>
      {show ? (
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(url)} onError={() => setFailed(url)} />
      ) : waiting ? null : (
        <span className="art-initial">{label.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}

/** Miniatura de tamanho fixo, para listas. */
export function Thumb({ image, label, size = 40 }: { image: ImageRef; label: string; size?: number }) {
  return <Art image={image} label={label} size={size} />
}
