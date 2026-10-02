import { useMemo, useState } from 'react'
import type { Dataset } from '../data/types'
import type { KindFilter } from '../data/stats'
import { timeline } from '../data/timeline'
import { Chart, type ChartOption } from '../ui/Chart'
import { CHART_COLORS, type ThemeName } from '../ui/theme'
import { date, hours, monthLabel, num, pct } from '../ui/format'
import { BarList } from '../ui/parts'
import { artistHref } from '../ui/links'

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
  const c = CHART_COLORS[theme]
  const who = WHO[kind]
  const [hover, setHover] = useState<number | null>(null)
  const [query, setQuery] = useState('')

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

  if (t.years.length === 0) return <p className="empty">Nada por aqui.</p>

  // Quem foi nº 1 em mais anos.
  const champions = new Map<number, number>()
  for (const y of t.years) if (y.top[0]) champions.set(y.top[0].id, (champions.get(y.top[0].id) ?? 0) + 1)
  const [champId, champYears] = [...champions.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
  const discovered = t.discoveries.reduce((a, d) => a + d.count, 0)
  const rows = Math.max(...t.years.map((y) => y.top.length))
  const maxPeak = t.phases[0]?.peakMs ?? 1

  const ids = new Map(t.ranking.map((r) => [r.name.toLowerCase(), r.id]))
  const found = ids.get(query.trim().toLowerCase())

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
          if (found !== undefined) location.hash = artistHref(found)
        }}
      >
        <label htmlFor="artist-search">Buscar {who.one}</label>
        <div className="search-row">
          <input
            id="artist-search"
            list="artist-names"
            placeholder={kind === 'podcast' ? 'Ex.: Flow Podcast' : 'Ex.: Arctic Monkeys'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              // Escolher uma sugestão já abre a página.
              const id = ids.get(e.target.value.trim().toLowerCase())
              const how = (e.nativeEvent as InputEvent).inputType
              if (id !== undefined && (!how || how === 'insertReplacementText')) location.hash = artistHref(id)
            }}
            autoComplete="off"
          />
          <button type="submit" disabled={found === undefined}>
            Abrir
          </button>
        </div>
        <datalist id="artist-names">
          {t.ranking.slice(0, 1500).map((r) => (
            <option key={r.id} value={r.name} />
          ))}
        </datalist>
      </form>

      <section className="card">
        <header>
          <h2>Seu top {rows} de cada ano</h2>
          <p>Passe o mouse num nome para ver em que outros anos ele aparece. Clique ou toque para abrir a página.</p>
        </header>
        <div className="scroll-x">
          <table className="years-grid" style={{ minWidth: 40 + t.years.length * 96 }} onMouseLeave={() => setHover(null)}>
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
                    const a = y.top[r]
                    if (!a) return <td key={y.year} />
                    return (
                      <td key={y.year} className={hover === a.id ? 'on' : hover !== null ? 'dim' : ''}>
                        <a
                          href={artistHref(a.id)}
                          onMouseEnter={() => setHover(a.id)}
                          onFocus={() => setHover(a.id)}
                          title={`${a.name}: ${hours(a.ms)} em ${y.year}`}
                        >
                          <span>{a.name}</span>
                          <small>{hours(a.ms)}</small>
                        </a>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <header>
          <h2>Descobertas por mês</h2>
          <p>
            Quantos {who.many} você ouviu pela primeira vez em cada mês.
          </p>
        </header>
        <Chart option={newOption} height={240} label={`${who.many} novos por mês`} />
      </section>

      <div className="two">
        <section className="card">
          <header>
            <h2>A melhor descoberta de cada ano</h2>
            <p>Quem você conheceu naquele ano e mais ouviu desde então.</p>
          </header>
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col">{who.one[0].toUpperCase() + who.one.slice(1)}</th>
                  <th scope="col" className="num">
                    Horas
                  </th>
                  <th scope="col" className="num">
                    Novos
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.discoveries.map((d) => (
                  <tr key={d.year}>
                    <td>{d.year}</td>
                    <td>
                      {d.best && (
                        <>
                          <a href={artistHref(d.best.id)}>{d.best.name}</a>
                          <small>desde {date(d.best.first)}</small>
                        </>
                      )}
                    </td>
                    <td className="num">{d.best && hours(d.best.ms)}</td>
                    <td className="num">{num(d.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {t.phases.length > 0 && (
          <BarList
            title="Fases e obsessões"
            note="Quem você ouviu muito num mês só: mais da metade de tudo o que ouviu dele."
            rows={t.phases.map((p) => ({
              key: p.id,
              name: p.name,
              href: artistHref(p.id),
              sub: `${monthLabel(p.month)} · ${pct(p.peakMs / p.totalMs)} do total de ${hours(p.totalMs)}`,
              value: hours(p.peakMs),
              share: p.peakMs / maxPeak,
              title: `${p.name}: ${hours(p.peakMs)} em ${monthLabel(p.month)}`,
            }))}
          />
        )}
      </div>
    </main>
  )
}
