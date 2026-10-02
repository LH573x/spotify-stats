import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Dataset } from '../data/types'
import { wrapped } from '../data/wrapped'
import { deck } from '../ui/wrappedDeck'
import { WrappedCard } from '../ui/WrappedCard'
import { canShareImages, download, shareImage, svgToPng, zipFiles } from '../ui/exportImage'

interface Props {
  data: Dataset
  year: number
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')

export function Wrapped({ data, year }: Props) {
  const w = useMemo(() => wrapped(data, year), [data, year])
  const cards = useMemo(() => (w ? deck(w) : []), [w])
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canShare] = useState(canShareImages)
  const stage = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)

  const go = (i: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, i))
    if (next === index) return
    setDir(next > index ? 'next' : 'prev')
    setIndex(next)
  }

  // Setas do teclado passam os cartões.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  if (!w || cards.length === 0) return <p className="empty">Nada por aqui nesse ano.</p>

  const card = cards[index]
  const fileName = (i: number) => `meu-spotify-${year}-${String(i + 1).padStart(2, '0')}-${slug(cards[i].title)}.png`
  const svgAt = (i: number) => stage.current?.querySelectorAll<SVGSVGElement>('.wcard > svg')[i]

  const run = async (label: string, job: () => Promise<void>) => {
    setBusy(label)
    setError(null)
    try {
      await job()
    } catch (e) {
      setError((e as Error).message || 'Não deu para gerar a imagem.')
    } finally {
      setBusy(null)
    }
  }

  const pngAt = async (i: number) => {
    const svg = svgAt(i)
    if (!svg) throw new Error('Não encontrei o cartão.')
    return svgToPng(svg)
  }

  // Toque: terço esquerdo volta, o resto avança. Arrastar para o lado também passa.
  const onPointerDown = (e: PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const start = pointer.current
    pointer.current = null
    if (!start || !stage.current) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? index + 1 : index - 1)
      return
    }
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return
    const r = stage.current.getBoundingClientRect()
    go(e.clientX < r.left + r.width / 3 ? index - 1 : index + 1)
  }

  return (
    <main className="page wrapped">
      <div className="wprogress" role="group" aria-label="Cartões">
        {cards.map((c, i) => (
          <button
            key={c.id}
            className={i < index ? 'done' : i === index ? 'on' : ''}
            aria-label={`${i + 1}. ${c.title}`}
            aria-current={i === index ? 'step' : undefined}
            title={c.title}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div
        className="wstage"
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointer.current = null)}
        aria-live="polite"
      >
        {cards.map((c, i) => (
          <div key={c.id} className={`wcard ${dir}`} hidden={i !== index}>
            <WrappedCard card={c} w={w} />
          </div>
        ))}
      </div>

      <div className="wnav">
        <button className="ghost icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Cartão anterior">
          ←
        </button>
        <span>
          {index + 1} de {cards.length} · {card.title}
        </span>
        <button className="ghost icon" onClick={() => go(index + 1)} disabled={index === cards.length - 1} aria-label="Próximo cartão">
          →
        </button>
      </div>

      <div className="wactions">
        {canShare && (
          <button
            className="primary"
            disabled={busy !== null}
            onClick={() => run('Preparando…', async () => shareImage(await pngAt(index), fileName(index), `Meu Spotify ${year}`))}
          >
            {busy === 'Preparando…' ? busy : 'Compartilhar'}
          </button>
        )}
        <button
          className={canShare ? 'ghost' : 'primary'}
          disabled={busy !== null}
          onClick={() => run('Gerando…', async () => download(await pngAt(index), fileName(index)))}
        >
          {busy === 'Gerando…' ? busy : 'Baixar imagem'}
        </button>
        <button
          className="ghost"
          disabled={busy !== null}
          onClick={() =>
            run('Juntando…', async () => {
              const files = []
              for (let i = 0; i < cards.length; i++) files.push({ name: fileName(i), blob: await pngAt(i) })
              download(await zipFiles(files), `meu-spotify-${year}.zip`)
            })
          }
        >
          {busy === 'Juntando…' ? busy : `Baixar todos (${cards.length})`}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <p className="whint">Toque nos lados do cartão ou use as setas do teclado. As imagens saem no formato de story, 1080 × 1920.</p>
    </main>
  )
}
