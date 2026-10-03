import { zipSync } from 'fflate'

/** Desenha um cartão SVG num canvas e devolve o PNG no tamanho original (1080×1920). */
export async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  const width = svg.width.baseVal.value
  const height = svg.height.baseVal.value
  const xml = new XMLSerializer().serializeToString(svg)
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu gerar a imagem.')
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Seu navegador não conseguiu gerar a imagem.'))), 'image/png'),
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
