import { useMemo } from 'react'
import type { Dataset } from '../data/types'
import { summarize, type Filter, type Ranked } from '../data/stats'
import { BarList, Tile } from '../ui/parts'
import { artistHref } from '../ui/links'
import { artistRef, itemRef } from '../data/refs'
import { Chart, type ChartOption } from '../ui/Chart'
import { CHART_COLORS, type ThemeName } from '../ui/theme'
import { date, hours, monthLabel, num } from '../ui/format'

interface Props {
  data: Dataset
  filter: Filter
  theme: ThemeName
}

const NOUNS = {
  all: { creators: 'Artistas e programas', items: 'Músicas e episódios', topC: 'Top artistas e podcasts', topI: 'Top músicas e episódios' },
  music: { creators: 'Artistas', items: 'Músicas', topC: 'Top artistas', topI: 'Top músicas' },
  podcast: { creators: 'Programas', items: 'Episódios', topC: 'Top podcasts', topI: 'Top episódios' },
}

export function Resumo({ data, filter, theme }: Props) {
  const s = useMemo(() => summarize(data, filter), [data, filter])
  const c = CHART_COLORS[theme]
  const nouns = NOUNS[filter.kind]

  const monthlyOption = useMemo<ChartOption>(() => {
    const single = filter.year !== null
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: single ? 'shadow' : 'line', lineStyle: { color: c.muted } },
        backgroundColor: c.surface,
        borderColor: c.axis,
        textStyle: { color: c.ink },
        formatter: (p: { name: string; value: number }[]) =>
          `${monthLabel(p[0].name)}<br/><b>${num(p[0].value)} h</b>`,
      },
      xAxis: {
        type: 'category',
        data: s.monthly.map((m) => m.month),
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false },
        axisLabel: {
          color: c.muted,
          hideOverlap: true,
          interval: single ? 0 : (_: number, v: string) => v.endsWith('-01'),
          formatter: (v: string) => (single ? monthLabel(v, false) : v.slice(0, 4)),
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: c.grid } },
        axisLabel: { color: c.muted, formatter: (v: number) => `${v} h` },
      },
      series: [
        single
          ? {
              type: 'bar',
              data: s.monthly.map((m) => Math.round(m.hours * 10) / 10),
              itemStyle: { color: c.accent, borderRadius: [4, 4, 0, 0] },
              barMaxWidth: 36,
            }
          : {
              type: 'line',
              data: s.monthly.map((m) => Math.round(m.hours * 10) / 10),
              showSymbol: false,
              smooth: 0.2,
              lineStyle: { color: c.accent, width: 2 },
              itemStyle: { color: c.accent },
              areaStyle: { color: c.accent, opacity: 0.15 },
            },
      ],
    }
  }, [s, c, filter.year])

  if (s.totalMs === 0) {
    return <p className="empty">Nada por aqui nesse período.</p>
  }

  const totalHours = s.totalMs / 3.6e6
  const daysNonStop = s.totalMs / 8.64e7
  const delta = s.previousYearMs ? (s.totalMs - s.previousYearMs) / s.previousYearMs : null
  const best = s.monthly.reduce((a, b) => (b.hours > a.hours ? b : a), s.monthly[0])

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">
          {filter.year ? `Em ${filter.year}` : 'Desde o começo'} · {s.first !== null && date(s.first)} a{' '}
          {s.last !== null && date(s.last)}
        </p>
        <h1>
          Você ouviu <span className="accent">{num(totalHours)} horas</span>
        </h1>
        <p className="sub">
          Isso é {num(daysNonStop)} {Math.round(daysNonStop) === 1 ? 'dia' : 'dias'} sem parar.
          {delta !== null && (
            <>
              {' '}
              {delta >= 0 ? `${num(delta * 100)}% a mais` : `${num(-delta * 100)}% a menos`} que em {filter.year! - 1}.
            </>
          )}
        </p>
      </section>

      <section className="tiles">
        <Tile label="Reproduções" value={num(s.plays)} hint="com 30 s ou mais" />
        <Tile label={nouns.creators} value={num(s.creators)} />
        <Tile label={nouns.items} value={num(s.items)} />
        <Tile label="Dias ouvindo" value={num(s.activeDays)} />
      </section>

      <section className="card">
        <header>
          <h2>Horas por mês</h2>
          <p>
            Seu mês recorde foi <strong>{monthLabel(best.month)}</strong>, com {num(best.hours)} h.
          </p>
        </header>
        <Chart option={monthlyOption} height={260} label={`Horas ouvidas por mês. Recorde em ${monthLabel(best.month)}.`} />
      </section>

      <div className="two">
        <BarList
          title={nouns.topC}
          rows={toBars(s.topCreators).map((r) => ({ ...r, href: artistHref(r.key), image: artistRef(data, r.key) }))}
        />
        <BarList title={nouns.topI} rows={toBars(s.topItems).map((r) => ({ ...r, image: itemRef(data, r.key) }))} />
      </div>
    </main>
  )
}

function toBars(rows: Ranked[]) {
  const max = rows[0]?.ms ?? 1
  return rows.map((r) => ({
    key: r.id,
    name: r.name,
    sub: r.sub,
    value: hours(r.ms),
    share: r.ms / max,
    title: `${r.name}: ${hours(r.ms)}, ${num(r.plays)} reproduções`,
  }))
}
