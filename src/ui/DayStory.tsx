import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dataset } from '../data/types'
import type { DayMemory } from '../data/onThisDay'
import { artistRef, itemRef } from '../data/refs'
import { DayCard, type DayRow } from './WrappedCard'
import { StoryViewer } from './StoryViewer'
import { displayFontLoaded, loadDisplayFont } from './svgText'
import { CloseIcon, ShareIcon } from './icons'
import { cleanTitle, slug } from './format'

/** Cabem até 10 anos no story; os mais recentes ficam. */
const MAX_ROWS = 10

function Story({ data, list, date }: { data: Dataset; list: DayMemory[]; date: string }) {
  // Os textos do cartão são medidos na fonte dos títulos: espera ela carregar.
  const [fontReady, setFontReady] = useState(displayFontLoaded)
  useEffect(() => {
    if (!fontReady) loadDisplayFont().then(() => setFontReady(true))
  }, [fontReady])

  const stories = useMemo(() => {
    const rows: DayRow[] = list.slice(0, MAX_ROWS).map((m) => {
      const photo = artistRef(data, m.creator)
      return {
        year: m.year,
        song: cleanTitle(data.items[m.item].name),
        songImage: itemRef(data, m.item) ?? null,
        artist: data.creators[m.creator],
        artistImage: photo,
        round: photo.kind !== 'podcast',
      }
    })
    const podcasts = list.every((m) => data.items[m.item].kind === 'podcast')
    const heads: [string, string] = podcasts ? ['Episódio', 'Podcast'] : ['Música', 'Artista']
    const label = `Meu ${date}. ${rows.map((r) => `${r.year}: ${r.song}; ${r.artist}`).join('. ')}.`
    return [{ id: 'dia', title: `Meu ${date}`, card: <DayCard date={date} rows={rows} heads={heads} label={label} /> }]
  }, [data, list, date])

  if (!fontReady) return <p className="empty">Preparando o story…</p>
  return <StoryViewer stories={stories} label={`Meu ${date}`} fileName={() => `lyra-${slug(date)}`} zipName="" shareTitle={`Meu ${date}`} />
}

/** Botão pequeno que abre o story de "Seu 4 de outubro", pronto para compartilhar. */
export function DayStory({ data, list, date }: { data: Dataset; list: DayMemory[]; date: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  // O cartão só monta com a janela aberta: as imagens dele só carregam se for usar.
  const [open, setOpen] = useState(false)
  const close = () => dialog.current?.close()
  return (
    <>
      <button
        className="ghost share-btn"
        onClick={() => {
          setOpen(true)
          dialog.current?.showModal()
        }}
      >
        <ShareIcon />
        Compartilhar
      </button>
      <dialog
        ref={dialog}
        className="story-sheet"
        aria-label={`Story: seu ${date}`}
        onClose={() => setOpen(false)}
        // Tocar fora da janela fecha, como no celular.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <button className="ghost icon sheet-close" onClick={close} aria-label="Fechar" title="Fechar">
          <CloseIcon />
        </button>
        {open && <Story data={data} list={list} date={date} />}
      </dialog>
    </>
  )
}
