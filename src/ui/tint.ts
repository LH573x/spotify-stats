import { useEffect, useState, type CSSProperties } from 'react'
import { useImage, type ImageRef } from '../data/images'
import { hue } from './format'

/*
 * A cor de destaque de uma foto ou capa, como o fundo do player do Spotify.
 * A imagem é reduzida a 24 × 24 e o tom que mais aparece (pesado pela saturação) vence.
 * O CSS decide a claridade conforme o tema (--tint-l), então aqui só saem tom e saturação.
 */

interface Tone {
  h: number
  s: number
}

const tones = new Map<string, Promise<Tone | null>>()
const SIZE = 24
const BINS = 24

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function toneOf(px: Uint8ClampedArray): Tone {
  const weight = new Float64Array(BINS)
  const sumS = new Float64Array(BINS)
  const sumX = new Float64Array(BINS)
  const sumY = new Float64Array(BINS)
  let grey = 0
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue
    const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2])
    // Quase preto, quase branco ou sem cor: não decide o tom.
    if (l < 0.12 || l > 0.92 || s < 0.15) {
      grey++
      continue
    }
    const w = s * (1 - Math.abs(l - 0.5))
    const bin = Math.floor(h / (360 / BINS)) % BINS
    weight[bin] += w
    sumS[bin] += s * w
    sumX[bin] += Math.cos((h * Math.PI) / 180) * w
    sumY[bin] += Math.sin((h * Math.PI) / 180) * w
  }
  let best = 0
  for (let b = 1; b < BINS; b++) if (weight[b] > weight[best]) best = b
  const colored = weight.reduce((a, w) => a + w, 0)
  // Foto em preto e branco: fica um cinza levemente azulado.
  if (colored === 0 || grey > (px.length / 4) * 0.85) return { h: 220, s: 0.08 }
  const h = ((Math.atan2(sumY[best], sumX[best]) * 180) / Math.PI + 360) % 360
  return { h: Math.round(h), s: Math.min(0.55, Math.max(0.25, sumS[best] / weight[best])) }
}

function loadTone(url: string): Promise<Tone | null> {
  let p = tones.get(url)
  if (p) return p
  p = new Promise<Tone | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = SIZE
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        resolve(toneOf(ctx.getImageData(0, 0, SIZE, SIZE).data))
      } catch {
        // O site da imagem não deixou ler os pixels.
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
  tones.set(url, p)
  return p
}

/**
 * Variáveis CSS com a cor da imagem (--tint-h, --tint-s). Enquanto a imagem não chega,
 * ou se não houver imagem, usa o mesmo tom da inicial que aparece no lugar dela.
 */
export function useTint(image: ImageRef | null | undefined, label: string): CSSProperties {
  const url = useImage(image)
  const [found, setFound] = useState<{ url: string; tone: Tone | null } | null>(null)
  useEffect(() => {
    if (!url) return
    let alive = true
    loadTone(url).then((tone) => alive && setFound({ url, tone }))
    return () => {
      alive = false
    }
  }, [url])
  const tone = (found?.url === url && found.tone) || { h: hue(label), s: 0.4 }
  return { '--tint-h': tone.h, '--tint-s': `${Math.round(tone.s * 100)}%` } as CSSProperties
}

/** Pinta o topo da página com a cor (na página de um artista ou de uma música). */
export function usePageTint(vars: CSSProperties) {
  const h = (vars as Record<string, string | number>)['--tint-h']
  const s = (vars as Record<string, string | number>)['--tint-s']
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--tint-h', String(h))
    root.style.setProperty('--tint-s', String(s))
    root.classList.add('tinted')
    return () => root.classList.remove('tinted')
  }, [h, s])
}
