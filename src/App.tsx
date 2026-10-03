import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from './data/types'
import { loadFiles } from './data/load'
import { clearSaved, loadSaved, save } from './data/store'
import { hasPodcasts, years, type Filter, type KindFilter } from './data/stats'
import { Upload } from './pages/Upload'
import { Resumo } from './pages/Resumo'
import { Curiosidades } from './pages/Curiosidades'
import { LinhaDoTempo } from './pages/LinhaDoTempo'
import { Artista } from './pages/Artista'
import { Musica } from './pages/Musica'
import { PlayerDock } from './ui/player'
import { Wrapped } from './pages/Wrapped'
import { useTheme, type Tone } from './ui/theme'

/** As abas, cada uma com a sua cor. */
const PAGES = [
  { id: 'resumo', label: 'Resumo', tone: 'green' },
  { id: 'curiosidades', label: 'Curiosidades', tone: 'coral' },
  { id: 'linha', label: 'Linha do tempo', tone: 'amber' },
  { id: 'wrapped', label: 'Wrapped', tone: 'pink' },
] as const satisfies readonly { id: string; label: string; tone: Tone }[]

type PageId = (typeof PAGES)[number]['id']
type Route = { page: PageId } | { page: 'artista'; artist: number } | { page: 'musica'; item: number }

/** Endereços antigos que mudaram de nome. */
const RENAMED: Record<string, PageId> = { habitos: 'curiosidades' }

/** A página atual vem do endereço (#curiosidades, #artista-12), para o botão voltar e links funcionarem. */
function readRoute(): Route {
  const h = location.hash.slice(1)
  const m = /^artista-(\d+)$/.exec(h)
  if (m) return { page: 'artista', artist: Number(m[1]) }
  const s = /^musica-(\d+)$/.exec(h)
  if (s) return { page: 'musica', item: Number(s[1]) }
  const p = PAGES.find((x) => x.id === (RENAMED[h] ?? h))
  return { page: p ? p.id : 'resumo' }
}

function useRoute(): [Route, (p: PageId) => void] {
  const [route, setRoute] = useState<Route>(readRoute)
  useEffect(() => {
    const on = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (p: PageId) => {
    location.hash = p === 'resumo' ? '' : p
    setRoute({ page: p })
    window.scrollTo({ top: 0 })
  }
  return [route, go]
}

const KINDS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'music', label: 'Música' },
  { id: 'podcast', label: 'Podcasts' },
]

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [route, go] = useRoute()
  const page = route.page
  const tone: Tone = PAGES.find((p) => p.id === page)?.tone ?? 'green'
  useEffect(() => {
    document.documentElement.dataset.tone = tone
  }, [tone])
  const [data, setData] = useState<Dataset | null>(null)
  const [booting, setBooting] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>({ year: null, kind: 'all' })

  useEffect(() => {
    loadSaved().then((saved) => {
      setData(saved.dataset)
      if (saved.outdated) setNotice('O site ganhou páginas novas. Solte seu arquivo de novo para atualizar os dados.')
      setBooting(false)
    })
  }, [])

  const yearList = useMemo(() => (data ? years(data) : []), [data])
  const podcasts = useMemo(() => (data ? hasPodcasts(data) : false), [data])
  const lastYear = yearList[yearList.length - 1]
  // O Wrapped é sempre de um ano só: sem ano escolhido, mostra o mais recente.
  const wrappedYear = filter.year ?? lastYear

  const onFiles = async (files: File[]) => {
    setError(null)
    setBusy('Preparando…')
    try {
      const d = await loadFiles(files, setBusy)
      await save(d)
      setFilter({ year: null, kind: 'all' })
      setData(d)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const reset = async () => {
    await clearSaved()
    setData(null)
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          Meu Spotify
        </div>
        {data && (
          <nav className="nav" aria-label="Páginas">
            {PAGES.map((p) => (
              <button
                key={p.id}
                className={`tab-${p.tone} ${p.id === page ? 'active' : ''}`}
                aria-current={p.id === page ? 'page' : undefined}
                onClick={() => go(p.id)}
              >
                {p.label}
              </button>
            ))}
          </nav>
        )}
        <div className="actions">
          {data && (
            <button className="ghost" onClick={reset}>
              Trocar dados
            </button>
          )}
          <button className="ghost icon" onClick={toggleTheme} aria-label="Alternar tema claro/escuro">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {data && page !== 'artista' && page !== 'musica' && (
        <div className="filters">
          {page === 'linha' ? (
            <p className="filters-note">Todos os anos, do começo até hoje.</p>
          ) : (
            <div className="chips" role="group" aria-label="Período">
              {page !== 'wrapped' && (
                <button className={filter.year === null ? 'on' : ''} onClick={() => setFilter({ ...filter, year: null })}>
                  Todos os anos
                </button>
              )}
              {yearList.map((y) => {
                const on = page === 'wrapped' ? wrappedYear === y : filter.year === y
                return (
                  <button key={y} className={on ? 'on' : ''} onClick={() => setFilter({ ...filter, year: y })}>
                    {y}
                  </button>
                )
              })}
            </div>
          )}
          {podcasts && page !== 'wrapped' && (
            <div className="segmented" role="group" aria-label="O que contar">
              {KINDS.map((k) => (
                <button key={k.id} className={filter.kind === k.id ? 'on' : ''} onClick={() => setFilter({ ...filter, kind: k.id })}>
                  {k.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {booting ? null : data ? (
        route.page === 'artista' ? (
          <Artista data={data} id={route.artist} theme={theme} />
        ) : route.page === 'musica' ? (
          <Musica data={data} id={route.item} theme={theme} />
        ) : page === 'wrapped' ? (
          <Wrapped key={wrappedYear} data={data} year={wrappedYear} />
        ) : page === 'linha' ? (
          <LinhaDoTempo data={data} kind={filter.kind} theme={theme} />
        ) : page === 'curiosidades' ? (
          <Curiosidades data={data} filter={filter} theme={theme} lastYear={lastYear} />
        ) : (
          <Resumo data={data} filter={filter} theme={theme} />
        )
      ) : (
        <Upload busy={busy} error={error} notice={notice} onFiles={onFiles} />
      )}

      <footer className="foot">
        Seu histórico fica só neste navegador. Fotos do <a href="https://www.wikidata.org/">Wikidata</a> e capas do{' '}
        <a href="https://musicbrainz.org/">MusicBrainz</a>, buscadas pelo nome. O botão de tocar abre o player do próprio Spotify.
      </footer>
      {data && <PlayerDock />}
    </div>
  )
}
