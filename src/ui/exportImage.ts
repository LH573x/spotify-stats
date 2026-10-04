import { zipSync } from 'fflate'
import font600 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2?url'
import font700 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2?url'
import font800 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2?url'
import { t } from '../i18n'

const FONTS: [number, string][] = [
  [600, font600],
  [700, font700],
  [800, font800],
]

function toDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(b)
  })
}

let fontCss: Promise<string> | null = null
/** A fonte dos títulos dentro do próprio SVG: uma imagem não enxerga as fontes da página. */
function embeddedFonts(): Promise<string> {
  fontCss ??= Promise.all(
    FONTS.map(async ([weight, url]) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await toDataUrl(await r.blob())
      return `@font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:${weight};src:url(${data}) format('woff2')}`
    }),
  ).then(
    (rules) => rules.join(''),
    () => {
      fontCss = null
      return ''
    },
  )
  return fontCss
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Desenha um cartão SVG num canvas e devolve o PNG no tamanho original (1080×1920). */
export async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  const width = svg.width.baseVal.value
  const height = svg.height.baseVal.value
  const copy = svg.cloneNode(true) as SVGSVGElement
  const css = await embeddedFonts()
  if (css) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = css
    copy.insertBefore(style, copy.firstChild)
  }
  const xml = new XMLSerializer().serializeToString(copy)
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(t('Seu navegador não conseguiu gerar a imagem.', "Your browser couldn't create the image.", 'Tu navegador no ha podido generar la imagen.'))
  ctx.drawImage(img, 0, 0, width, height)
  // O Safari às vezes desenha antes de a fonte embutida ficar pronta; a segunda vez sai certa.
  await wait(150)
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error(t('Seu navegador não conseguiu gerar a imagem.', "Your browser couldn't create the image.", 'Tu navegador no ha podido generar la imagen.'))),
      'image/png',
    ),
  )
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Junta vários PNGs num .zip (sem recomprimir: PNG já é comprimido). */
export async function zipFiles(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {}
  for (const f of files) entries[f.name] = new Uint8Array(await f.blob.arrayBuffer())
  const zipped = zipSync(entries, { level: 0 })
  return new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
}

/** O navegador sabe abrir o menu de compartilhar com imagens (celular, principalmente)? */
export function canShareImages(): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

export async function shareImage(blob: Blob, name: string, title: string) {
  const file = new File([blob], name, { type: 'image/png' })
  try {
    await navigator.share({ files: [file], title })
  } catch (e) {
    // Fechar o menu sem escolher nada não é erro.
    if ((e as Error).name !== 'AbortError') throw e
  }
}
