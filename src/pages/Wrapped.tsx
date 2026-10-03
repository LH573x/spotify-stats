import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from '../data/types'
import { topPeriods, wrapped } from '../data/wrapped'
import { deck, PERIOD_TITLES, topAlt } from '../ui/wrappedDeck'
import { TopCard, WrappedCard } from '../ui/WrappedCard'
import { StoryViewer, type Story } from '../ui/StoryViewer'
import { Section } from '../ui/blocks'
import { displayFontLoaded, loadDisplayFont } from '../ui/svgText'

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
  // Os textos dos cartões são medidos na fonte dos títulos: espera ela carregar.
  const [fontReady, setFontReady] = useState(displayFontLoaded)
  useEffect(() => {
    if (!fontReady) loadDisplayFont().then(() => setFontReady(true))
  }, [fontReady])

  const w = useMemo(() => wrapped(data, year), [data, year])
  const periods = useMemo(() => topPeriods(data), [data])

  const tops = useMemo<Story[]>(
    () => periods.map((t) => ({ id: `top-${t.id}`, title: PERIOD_TITLES[t.id], card: <TopCard t={t} label={topAlt(t)} /> })),
    [periods],
  )
  const cards = useMemo<Story[]>(() => (w ? deck(w).map((c) => ({ id: c.id, title: c.title, card: <WrappedCard card={c} w={w} /> })) : []), [w])

  if (!fontReady) return <p className="empty">Preparando os stories…</p>

  return (
    <main className="page wrapped">
      <section className="hero">
        <p className="eyebrow">Para postar</p>
        <h1>Seus stories</h1>
        <p className="sub">
          Cada cartão sai no tamanho do story do Instagram (1080 × 1920). Toque nos lados do cartão para passar e baixe um ou todos.
        </p>
      </section>

      <div className="wgrid">
        <Section kicker="Top 5" title="Seus Top 5" note="O último mês, o último ano e desde sempre, até o fim do seu histórico.">
          {tops.length > 0 ? (
            <StoryViewer
              stories={tops}
              label="Top 5"
              fileName={(i) => `meu-top-5-${slug(tops[i].title)}`}
              zipName="meu-top-5.zip"
              shareTitle="Meu Top 5"
            />
          ) : (
            <p className="empty">Não há músicas no seu histórico para montar o Top 5.</p>
          )}
        </Section>

        <Section kicker="Retrospectiva" title={`Seu ${year}`} note="Para ver outro ano, escolha o ano lá em cima.">
          {cards.length > 0 ? (
            <StoryViewer
              key={year}
              stories={cards}
              label={`Retrospectiva de ${year}`}
              fileName={(i) => `meu-spotify-${year}-${String(i + 1).padStart(2, '0')}-${slug(cards[i].title)}`}
              zipName={`meu-spotify-${year}.zip`}
              shareTitle={`Meu Spotify ${year}`}
            />
          ) : (
            <p className="empty">Nada por aqui nesse ano.</p>
          )}
        </Section>
      </div>
    </main>
  )
}
