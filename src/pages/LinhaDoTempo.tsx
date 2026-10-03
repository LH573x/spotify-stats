import { useMemo, useState } from 'react'
import type { Dataset } from '../data/types'
import type { KindFilter } from '../data/stats'
import { timeline } from '../data/timeline'
import { Chart, type ChartOption } from '../ui/Chart'
import { chartColors, type ThemeName } from '../ui/theme'
import { cleanTitle, date, hours, monthLabel, num, pct } from '../ui/format'
import { BarList } from '../ui/parts'
import { Section } from '../ui/blocks'
import { Art } from '../ui/Thumb'
import { artistHref, songHref } from '../ui/links'
import { trackOf } from '../ui/playerStore'
import { artistRef, itemRef } from '../data/refs'

interface Props {
  data: Dataset
  kind: KindFilter
  theme: ThemeName
}

const WHO = {
  all: { one: 'artista ou podcast', many: 'artistas e podcasts' },
  music: { one: 'artista', many: 'artistas' },
  podcast: { one: 'podcast', many: 'podcasts' },
}

export function LinhaDoTempo({ data, kind, theme }: Props) {
  const t = useMemo(() => timeline(data, kind), [data, kind])
  const c = chartColors(theme, 'amber')
  const who = WHO[kind]
  const [hover, setHover] = useState<number | null>(null)
  const [query, setQuery] = useState('')
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
          `${monthLabel(p[0].name)}<br/><b>${num(p[0].value)}</b> ${p[0].value === 1 ? who.one + ' novo' : who.many + ' novos'}`,
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

  // Busca: artistas pelo nome e músicas como "Nome — Artista".
  const options = useMemo(() => {
    const list: { label: string; href: string }[] = []
    for (const r of t.ranking.slice(0, 1500)) list.push({ label: r.name, href: artistHref(r.id) })
    for (const r of t.songRanking.slice(0, 1500)) {
      const it = data.items[r.id]
      list.push({ label: `${it.name} — ${data.creators[it.creator]}`, href: songHref(r.id) })
    }
    return list
  }, [t, data])
  const hrefs = useMemo(() => new Map(options.map((o) => [o.label.toLowerCase(), o.href])), [options])
  if (t.years.length === 0) return <p className="empty">Nada por aqui.</p>

  // Quem foi nº 1 em mais anos.
  const champions = new Map<number, number>()
  for (const y of t.years) if (y.top[0]) champions.set(y.top[0].id, (champions.get(y.top[0].id) ?? 0) + 1)
  const [champId, champYears] = [...champions.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
  const discovered = t.discoveries.reduce((a, d) => a + d.count, 0)
  const rows = Math.max(...t.years.map((y) => y.top.length))
  const maxPeak = t.phases[0]?.peakMs ?? 1
  const maxSongPeak = t.songPhases[0]?.peakPlays ?? 1

  const found = hrefs.get(query.trim().toLowerCase())

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">
          {t.years[0].year} a {t.years[t.years.length - 1].year}
        </p>
        <h1>
          Sua história em <span className="accent">{t.years.length} anos</span>
        </h1>
        <p className="sub">
          Você conheceu {num(discovered)} {who.many}.
          {champId !== null && (
            <>
              {' '}
              <a href={artistHref(champId)}>{data.creators[champId]}</a> foi o nº 1 em {champYears}{' '}
              {champYears === 1 ? 'ano' : 'anos'}.
            </>
          )}
        </p>
      </section>

      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (found !== undefined) location.hash = found
        }}
      >
        <label htmlFor="artist-search">Buscar {who.one} ou {kind === 'podcast' ? 'episódio' : 'música'}</label>
        <div className="search-row">
          <input
            id="artist-search"
            list="artist-names"
            placeholder={kind === 'podcast' ? 'Ex.: Flow Podcast' : 'Ex.: Arctic Monkeys'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              // Escolher uma sugestão já abre a página.
              const href = hrefs.get(e.target.value.trim().toLowerCase())
              const how = (e.nativeEvent as InputEvent).inputType
              if (href !== undefined && (!how || how === 'insertReplacementText')) location.hash = href
            }}
            autoComplete="off"
          />
          <button type="submit" disabled={found === undefined}>
            Abrir
          </button>
        </div>
        <datalist id="artist-names">
          {options.map((o) => (
            <option key={o.href} value={o.label} />
          ))}
        </datalist>
      </form>

      <Section title={`Seu top ${rows} de cada ano`}>
        <div className="segmented view-switch" role="group" aria-label="Mostrar">
          <button
            className={songs ? '' : 'on'}
            aria-pressed={!songs}
            onClick={() => {
              setView('artists')
              setHover(null)
            }}
          >
            {kind === 'podcast' ? 'Podcasts' : 'Artistas'}
          </button>
          <button
            className={songs ? 'on' : ''}
            aria-pressed={songs}
            onClick={() => {
              setView('songs')
              setHover(null)
            }}
          >
            {kind === 'podcast' ? 'Episódios' : 'Músicas'}
          </button>
        </div>
        <div className="card">
          <div className="scroll-x">
            <table className="years-grid" style={{ minWidth: 40 + t.years.length * 100 }} onMouseLeave={() => setHover(null)}>
              <thead>
                <tr>
                  <th scope="col" aria-label="Posição" />
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
                    <th scope="row">{r + 1}º</th>
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
                            title={`${name}${sub ? `, de ${sub}` : ''}: ${hours(a.ms)} em ${y.year}`}
                          >
                            {image ? <Art image={image} label={name} size={r === 0 ? 48 : 30} /> : <Art label={name} size={r === 0 ? 48 : 30} />}
                            <span>{name}</span>
                            <small>{sub ? `${sub} · ${hours(a.ms)}` : hours(a.ms)}</small>
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

      <Section title="Quem chegou para ficar">
        <div className="scroll-x">
          <ol className="finds">
            {t.discoveries.map((d) => (
              <li key={d.year}>
                <span className="find-year">{d.year}</span>
                {d.best ? (
                  <a href={artistHref(d.best.id)} className="find-card">
                    <Art image={artistRef(data, d.best.id)} label={d.best.name} size={88} />
                    <strong>{d.best.name}</strong>
                    <small>desde {date(d.best.first)}</small>
                    <span>{hours(d.best.ms)} até hoje</span>
                  </a>
                ) : (
                  <span className="find-card" />
                )}
                <small className="find-count">
                  {num(d.count)} {d.count === 1 ? who.one + ' novo' : who.many + ' novos'}
                </small>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section title={`${who.many[0].toUpperCase() + who.many.slice(1)} novos a cada mês`}>
        <div className="card">
          <Chart option={newOption} height={240} label={`${who.many} novos por mês`} />
        </div>
      </Section>

      {(t.phases.length > 0 || t.songPhases.length > 0) && (
        <Section title="Fases e obsessões">
          <div className="two">
            {t.phases.length > 0 && (
              <BarList
                title={kind === 'podcast' ? 'Podcasts' : 'Artistas'}
                rows={t.phases.map((p) => ({
                  key: p.id,
                  name: p.name,
                  href: artistHref(p.id),
                  image: artistRef(data, p.id),
                  sub: `${monthLabel(p.month)} · ${pct(p.peakMs / p.totalMs)} do total`,
                  value: hours(p.peakMs),
                  share: p.peakMs / maxPeak,
                  title: `${p.name}: ${hours(p.peakMs)} em ${monthLabel(p.month)}`,
                }))}
              />
            )}
            {t.songPhases.length > 0 && (
              <BarList
                title="Músicas"
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
                    value: `${num(p.peakPlays)} de ${num(p.totalPlays)}`,
                    share: p.peakPlays / maxSongPeak,
                    title: `${name}: ${num(p.peakPlays)} das ${num(p.totalPlays)} vezes foram em ${monthLabel(p.month)}`,
                  }
                })}
              />
            )}
          </div>
        </Section>
      )}
    </main>
  )
}
