/** Medição de texto para os cartões em SVG, que não quebram linha sozinhos. */
export const CARD_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

let ctx: CanvasRenderingContext2D | null = null

export function measure(text: string, size: number, weight: number): number {
  ctx ??= document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * size * 0.55
  ctx.font = `${weight} ${size}px ${CARD_FONT}`
  return ctx.measureText(text).width
}

/** Corta o fim com reticências até caber na largura. */
export function ellipsize(text: string, width: number, size: number, weight: number): string {
  if (measure(text, size, weight) <= width) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (measure(text.slice(0, mid).trimEnd() + '…', size, weight) <= width) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo).trimEnd() + '…'
}

/** Quebra em linhas por palavra; `fits` diz se coube sem cortar nada. */
function wrap(text: string, width: number, size: number, weight: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (!cur || measure(next, size, weight) <= width) cur = next
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  const fits = lines.length <= maxLines && lines.every((l) => measure(l, size, weight) <= width)
  if (fits) return { lines, fits }
  const kept = lines.slice(0, maxLines)
  kept[kept.length - 1] = ellipsize(lines.slice(maxLines - 1).join(' '), width, size, weight)
  return { lines: kept.map((l) => ellipsize(l, width, size, weight)), fits }
}

/**
 * Escolhe o maior tamanho (entre `max` e `min`) em que o texto cabe em até `maxLines` linhas.
 * Se nem no mínimo couber, corta com reticências.
 */
export function fitText(text: string, width: number, opts: { max: number; min: number; weight: number; maxLines: number }) {
  for (let size = opts.max; size > opts.min; size = Math.floor(size * 0.92)) {
    const r = wrap(text, width, size, opts.weight, opts.maxLines)
    if (r.fits) return { size, lines: r.lines }
  }
  return { size: opts.min, lines: wrap(text, width, opts.min, opts.weight, opts.maxLines).lines }
}
