import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { canShareImages, download, shareImage, svgToPng, zipFiles } from './exportImage'
import { ShareIcon } from './icons'

export interface Story {
  id: string
  /** Nome curto, para a barra de progresso e o arquivo. */
  title: string
  card: ReactNode
}

interface Props {
  stories: Story[]
  /** Nome do arquivo de cada cartão, sem ".png". */
  fileName: (i: number) => string
  zipName: string
  shareTitle: string
  label: string
}

/** Stories que passam com toque, arrasto ou setas, com botões de baixar e compartilhar. */
export function StoryViewer({ stories, fileName, zipName, shareTitle, label }: Props) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canShare] = useState(canShareImages)
  const stage = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)

  if (stories.length === 0) return null
  const at = Math.min(index, stories.length - 1)
  const story = stories[at]
  // Um cartão só: sem barra de progresso nem setas.
  const single = stories.length === 1

  const go = (i: number) => {
    const next = Math.max(0, Math.min(stories.length - 1, i))
    if (next === at) return
    setDir(next > at ? 'next' : 'prev')
    setIndex(next)
  }

  // Setas do teclado passam os cartões quando o foco está aqui.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key === 'ArrowRight') go(at + 1)
    else if (e.key === 'ArrowLeft') go(at - 1)
    else return
    e.preventDefault()
  }

  const run = async (what: string, job: () => Promise<void>) => {
    setBusy(what)
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
    const svg = stage.current?.querySelectorAll<SVGSVGElement>('.wcard > svg')[i]
    if (!svg) throw new Error('Não encontrei o cartão.')
    return svgToPng(svg)
  }
  const file = (i: number) => `${fileName(i)}.png`

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
      go(dx < 0 ? at + 1 : at - 1)
      return
    }
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return
    const r = stage.current.getBoundingClientRect()
    go(e.clientX < r.left + r.width / 3 ? at - 1 : at + 1)
  }

  return (
    <div className="wviewer" onKeyDown={onKeyDown}>
      {!single && (
        <div className="wprogress" role="group" aria-label={label}>
          {stories.map((s, i) => (
            <button
              key={s.id}
              className={i < at ? 'done' : i === at ? 'on' : ''}
              aria-label={`${i + 1}. ${s.title}`}
              aria-current={i === at ? 'step' : undefined}
              title={s.title}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}

      <div
        className="wstage"
        ref={stage}
        tabIndex={0}
        aria-label={single ? label : `${label}: toque nos lados ou use as setas para passar`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointer.current = null)}
        aria-live="polite"
      >
        {stories.map((s, i) => (
          <div key={s.id} className={`wcard ${dir}`} hidden={i !== at}>
            {s.card}
          </div>
        ))}
      </div>

      {!single && (
        <div className="wnav">
          <button className="ghost icon" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Cartão anterior">
            ←
          </button>
          <span>
            {at + 1} de {stories.length} · {story.title}
          </span>
          <button className="ghost icon" onClick={() => go(at + 1)} disabled={at === stories.length - 1} aria-label="Próximo cartão">
            →
          </button>
        </div>
      )}

      <div className="wactions">
        {canShare && (
          <button
            className="primary"
            disabled={busy !== null}
            onClick={() => run('Preparando…', async () => shareImage(await pngAt(at), file(at), shareTitle))}
          >
            <ShareIcon />
            {busy === 'Preparando…' ? busy : 'Compartilhar'}
          </button>
        )}
        <button
          className={canShare ? 'ghost' : 'primary'}
          disabled={busy !== null}
          onClick={() => run('Gerando…', async () => download(await pngAt(at), file(at)))}
        >
          {busy === 'Gerando…' ? busy : 'Baixar imagem'}
        </button>
        {stories.length > 1 && (
          <button
            className="ghost"
            disabled={busy !== null}
            onClick={() =>
              run('Juntando…', async () => {
                const files = []
                for (let i = 0; i < stories.length; i++) files.push({ name: file(i), blob: await pngAt(i) })
                download(await zipFiles(files), zipName)
              })
            }
          >
            {busy === 'Juntando…' ? busy : `Baixar todos (${stories.length})`}
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
