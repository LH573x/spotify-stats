import { useMemo, useState, type CSSProperties } from 'react'
import type { Dataset } from '../data/types'
import type { KindFilter } from '../data/stats'
import { timeline } from '../data/timeline'
import { Chart, type ChartOption } from '../ui/Chart'
import { chartColors, type ThemeName } from '../ui/theme'
import { cleanTitle, date, hours, monthLabel, num, ordinal } from '../ui/format'
import { BarList } from '../ui/parts'
import { More, Section } from '../ui/blocks'
import { Art } from '../ui/Thumb'
import { artistHref, songHref } from '../ui/links'
import { trackOf } from '../ui/playerStore'
import { artistRef, itemRef } from '../data/refs'
import { Search } from '../ui/Search'
import { t as tr } from '../i18n'

interface Props {
  data: Dataset
  kind: KindFilter
  theme: ThemeName
}

const WHO = {
  all: () => ({
    one: tr('artista ou podcast', 'artist or podcast', 'artista o podcast'),
    many: tr('artistas e podcasts', 'artists and podcasts', 'artistas y podcasts'),
  }),
  music: () => ({ one: tr('artista', 'artist', 'artista'), many: tr('artistas', 'artists', 'artistas') }),
  podcast: () => ({ one: 'podcast', many: 'podcasts' }),
}

/** "artista novo" ou "artistas novos", conforme a quantidade. */
const fresh = (who: { one: string; many: string }, n: number) =>
  n === 1
    ? tr(`${who.one} novo`, `new ${who.one}`, `${who.one} nuevo`)
    : tr(`${who.many} novos`, `new ${who.many}`, `${who.many} nuevos`)

export function LinhaDoTempo({ data, kind, theme }: Props) {
  const t = useMemo(() => timeline(data, kind), [data, kind])
  const c = chartColors(theme, 'amber')
  const who = WHO[kind]()
  const [hover, setHover] = useState<number | null>(null)
  const [view, setView] = useState<'artists' | 'songs'>('artists')
  const songs = view === 'songs'

  const newOption = useMemo<ChartOption>(
    () => ({
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: c.surface,
        borderColor: c.axis,
        textStyle: { color: c.ink },
        formatter: (p: { name: string; value: number }[]) =>
          `${monthLabel(p[0].name)}<br/><b>${num(p[0].value)}</b> ${fresh(who, p[0].value)}`,
      },
      xAxis: {
        type: 'category',
        data: t.newPerMonth.map((m) => m.month),
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false },
        axisLabel: {
          color: c.muted,
          hideOverlap: true,
          interval: (_: number, v: string) => v.endsWith('-01'),
          formatter: (v: string) => v.slice(0, 4),
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: c.grid } },
        axisLabel: { color: c.muted },
      },
      series: [
        {
          type: 'bar',
          data: t.newPerMonth.map((m) => m.count),
          itemStyle: { color: c.accent, borderRadius: [2, 2, 0, 0] },
          barCategoryGap: '20%',
        },
      ],
    }),
    [t, c, who],
  )

  if (t.years.length === 0) return <p className="empty">{tr('Nada por aqui.', 'Nothing here.', 'Nada por aquí.')}</p>

  // Quem foi nº 1 em mais anos.
  const champions = new Map<number, number>()
  for (const y of t.years) if (y.top[0]) champions.set(y.top[0].id, (champions.get(y.top[0].id) ?? 0) + 1)
  const [champId, champYears] = [...champions.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
  const discovered = t.discoveries.reduce((a, d) => a + d.count, 0)
  const rows = Math.max(...t.years.map((y) => y.top.length))
  const maxPeak = t.phases[0]?.peakMs ?? 1
  const maxSongPeak = t.songPhases[0]?.peakPlays ?? 1

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">
          {tr(
            `${t.years[0].year} a ${t.years[t.years.length - 1].year}`,
            `${t.years[0].year} to ${t.years[t.years.length - 1].year}`,
            `${t.years[0].year} a ${t.years[t.years.length - 1].year}`,
          )}
        </p>
        <h1>
          {tr('Sua história em', 'Your story in', 'Tu historia en')}{' '}
          <span className="accent">
            {t.years.length}{' '}
            {tr('anos', t.years.length === 1 ? 'year' : 'years', t.years.length === 1 ? 'año' : 'años')}
          </span>
        </h1>
        <p className="sub">
          {tr('Você conheceu', 'You discovered', 'Descubriste')} {num(discovered)} {who.many}.
          {champId !== null && (
            <>
              {' '}
              <a href={artistHref(champId)}>{data.creators[champId]}</a>{' '}
              {tr('foi o nº 1 em', 'was #1 for', 'fue el n.º 1 en')} {champYears}{' '}
              {champYears === 1 ? tr('ano', 'year', 'año') : tr('anos', 'years', 'años')}.
            </>
          )}
        </p>
      </section>

      <Search
        data={data}
        timeline={t}
        label={
          kind === 'podcast'
            ? tr(`Buscar ${who.one} ou episódio`, `Search ${who.one} or episode`, `Buscar ${who.one} o episodio`)
            : tr(`Buscar ${who.one} ou música`, `Search ${who.one} or song`, `Buscar ${who.one} o canción`)
        }
        placeholder={
          kind === 'podcast'
            ? tr('Ex.: Flow Podcast', 'e.g. Flow Podcast', 'Ej.: Flow Podcast')
            : tr('Ex.: Arctic Monkeys', 'e.g. Arctic Monkeys', 'Ej.: Arctic Monkeys')
        }
      />

      <Section title={tr(`Seu top ${rows} de cada ano`, `Your top ${rows} each year`, `Tu top ${rows} de cada año`)}>
        <div className="segmented view-switch" role="group" aria-label={tr('Mostrar', 'Show', 'Mostrar')}>
          <button
            className={songs ? '' : 'on'}
            aria-pressed={!songs}
            onClick={() => {
              setView('artists')
              setHover(null)
            }}
          >
            {kind === 'podcast' ? 'Podcasts' : tr('Artistas', 'Artists', 'Artistas')}
          </button>
          <button
            className={songs ? 'on' : ''}
            aria-pressed={songs}
            onClick={() => {
              setView('songs')
              setHover(null)
            }}
          >
            {kind === 'podcast' ? tr('Episódios', 'Episodes', 'Episodios') : tr('Músicas', 'Songs', 'Canciones')}
          </button>
        </div>
        <div className="card">
          <div className="scroll-x">
            <table
              className={songs ? 'years-grid with-sub' : 'years-grid'}
              style={{ '--years': t.years.length } as CSSProperties}
              onMouseLeave={() => setHover(null)}
            >
              <thead>
                <tr>
                  <th scope="col" aria-label={tr('Posição', 'Rank', 'Posición')} />
                  {t.years.map((y) => (
                    <th key={y.year} scope="col">
                      {y.year}
                      <small>{hours(y.totalMs)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, r) => (
                  <tr key={r}>
                    <th scope="row">{ordinal(r + 1)}</th>
                    {t.years.map((y) => {
                      const a = songs ? y.topItems[r] : y.top[r]
                      if (!a) return <td key={y.year} />
                      const name = songs ? cleanTitle(a.name) : a.name
                      const sub = songs ? data.creators[data.items[a.id].creator] : null
                      const image = songs ? itemRef(data, a.id) : artistRef(data, a.id)
                      return (
                        <td key={y.year} className={hover === a.id ? 'on' : hover !== null ? 'dim' : ''}>
                          <a
                            href={songs ? songHref(a.id) : artistHref(a.id)}
                            onMouseEnter={() => setHover(a.id)}
                            onFocus={() => setHover(a.id)}
                            title={tr(
                              `${name}${sub ? `, de ${sub}` : ''}: ${hours(a.ms)} em ${y.year}`,
                              `${name}${sub ? `, by ${sub}` : ''}: ${hours(a.ms)} in ${y.year}`,
                              `${name}${sub ? `, de ${sub}` : ''}: ${hours(a.ms)} en ${y.year}`,
                            )}
                          >
                            <Art image={image} label={name} round={false} />
                            <span className="yg-text">
                              <span className="yg-name">{name}</span>
                              {sub && <small>{sub}</small>}
                              <small>{hours(a.ms)}</small>
                            </span>
                          </a>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title={tr('Quem chegou para ficar', 'Here to stay', 'Llegaron para quedarse')}>
        <div className="scroll-x">
          <ol className="finds">
            {t.discoveries.map((d) => (
              <li key={d.year}>
                <span className="find-year">{d.year}</span>
                {d.best ? (
                  <a href={artistHref(d.best.id)} className="find-card">
                    <Art image={artistRef(data, d.best.id)} label={d.best.name} size={88} />
                    <strong>{d.best.name}</strong>
                    <small>
                      {tr('desde', 'since', 'desde')} {date(d.best.first)}
                    </small>
                    <span>
                      {hours(d.best.ms)} {tr('até hoje', 'so far', 'hasta hoy')}
                    </span>
                  </a>
                ) : (
                  <span className="find-card" />
                )}
                <small className="find-count">
                  {num(d.count)} {fresh(who, d.count)}
                </small>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <More>
        <Section
          title={tr(
            `${who.many[0].toUpperCase() + who.many.slice(1)} novos a cada mês`,
            `New ${who.many} each month`,
            `${who.many[0].toUpperCase() + who.many.slice(1)} nuevos cada mes`,
          )}
        >
          <div className="card">
            <Chart
              option={newOption}
              height={240}
              label={tr(`${who.many} novos por mês`, `New ${who.many} per month`, `${who.many} nuevos por mes`)}
            />
          </div>
        </Section>

        {(t.phases.length > 0 || t.songPhases.length > 0) && (
          <Section title={tr('Fases e obsessões', 'Phases and obsessions', 'Fases y obsesiones')}>
            <div className="two">
              {t.phases.length > 0 && (
                <BarList
                  title={kind === 'podcast' ? 'Podcasts' : tr('Artistas', 'Artists', 'Artistas')}
                  rows={t.phases.map((p) => ({
                    key: p.id,
                    name: p.name,
                    href: artistHref(p.id),
                    image: artistRef(data, p.id),
                    sub: monthLabel(p.month),
                    value: hours(p.peakMs),
                    share: p.peakMs / maxPeak,
                    title: `${p.name}: ${hours(p.peakMs)} ${tr('em', 'in', 'en')} ${monthLabel(p.month)}`,
                  }))}
                />
              )}
              {t.songPhases.length > 0 && (
                <BarList
                  title={tr('Músicas', 'Songs', 'Canciones')}
                  rows={t.songPhases.map((p) => {
                    const it = data.items[p.id]
                    const name = cleanTitle(it.name)
                    return {
                      key: p.id,
                      name,
                      href: songHref(p.id),
                      image: itemRef(data, p.id),
                      track: trackOf(data, p.id),
                      sub: `${data.creators[it.creator]} · ${monthLabel(p.month)}`,
                      value: `${num(p.peakPlays)} ${tr('de', 'of', 'de')} ${num(p.totalPlays)}`,
                      share: p.peakPlays / maxSongPeak,
                      title: tr(
                        `${name}: ${num(p.peakPlays)} das ${num(p.totalPlays)} vezes foram em ${monthLabel(p.month)}`,
                        `${name}: ${num(p.peakPlays)} of ${num(p.totalPlays)} plays were in ${monthLabel(p.month)}`,
                        `${name}: ${num(p.peakPlays)} de las ${num(p.totalPlays)} veces fueron en ${monthLabel(p.month)}`,
                      ),
                    }
                  })}
                />
              )}
            </div>
          </Section>
        )}
      </More>
    </main>
  )
}
