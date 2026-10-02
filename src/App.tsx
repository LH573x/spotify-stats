import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from './data/types'
import { loadFiles } from './data/load'
import { clearSaved, loadSaved, save } from './data/store'
import { hasPodcasts, years, type Filter, type KindFilter } from './data/stats'
import { Upload } from './pages/Upload'
import { Resumo } from './pages/Resumo'
import { useTheme } from './ui/theme'

const PAGES = [
  { id: 'resumo', label: 'Resumo', ready: true },
  { id: 'habitos', label: 'Hábitos', ready: false },
  { id: 'linha', label: 'Linha do tempo', ready: false },
  { id: 'wrapped', label: 'Wrapped', ready: false },
] as const

const KINDS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'music', label: 'Música' },
  { id: 'podcast', label: 'Podcasts' },
]

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [data, setData] = useState<Dataset | null>(null)
  const [booting, setBooting] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>({ year: null, kind: 'all' })

  useEffect(() => {
    loadSaved().then((d) => {
      setData(d)
      setBooting(false)
    })
  }, [])

  const yearList = useMemo(() => (data ? years(data) : []), [data])
  const podcasts = useMemo(() => (data ? hasPodcasts(data) : false), [data])

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
                className={p.id === 'resumo' ? 'active' : ''}
                disabled={!p.ready}
                title={p.ready ? undefined : 'Em breve'}
              >
                {p.label}
                {!p.ready && <small>em breve</small>}
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

      {data && (
        <div className="filters">
          <div className="chips" role="group" aria-label="Período">
            <button className={filter.year === null ? 'on' : ''} onClick={() => setFilter({ ...filter, year: null })}>
              Todos os anos
            </button>
            {yearList.map((y) => (
              <button key={y} className={filter.year === y ? 'on' : ''} onClick={() => setFilter({ ...filter, year: y })}>
                {y}
              </button>
            ))}
          </div>
          {podcasts && (
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
        <Resumo data={data} filter={filter} theme={theme} />
      ) : (
        <Upload busy={busy} error={error} onFiles={onFiles} />
      )}

      <footer className="foot">Seus dados ficam só neste navegador.</footer>
    </div>
  )
}
