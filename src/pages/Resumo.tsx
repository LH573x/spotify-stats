import { useMemo } from 'react'
import type { Dataset } from '../data/types'
import { summarize, yearTops, type Filter, type Ranked } from '../data/stats'
import { CoverWall, Podium, Section, StatStrip, type RankItem } from '../ui/blocks'
import { TocaDiscos } from '../ui/TocaDiscos'
import { artistHref, songHref } from '../ui/links'
import { trackOf } from '../ui/playerStore'
import { artistRef, itemRef } from '../data/refs'
import { Chart, type ChartOption } from '../ui/Chart'
import { chartColors, type ThemeName } from '../ui/theme'
import { cleanTitle, hours, monthLabel, num, pct } from '../ui/format'

interface Props {
  data: Dataset
  filter: Filter
  theme: ThemeName
  onYear: (year: number | null) => void
}

const NOUNS = {
  all: {
    creators: 'Artistas e programas',
    items: 'Músicas e episódios',
    topC: 'Os artistas e podcasts que mais tocaram',
    topI: 'As músicas e episódios que mais tocaram',
  },
  music: { creators: 'Artistas', items: 'Músicas', topC: 'Os artistas que mais tocaram', topI: 'As músicas que mais tocaram' },
  podcast: { creators: 'Programas', items: 'Episódios', topC: 'Os podcasts que mais tocaram', topI: 'Os episódios que mais tocaram' },
}

export function Resumo({ data, filter, theme, onYear }: Props) {
  const s = useMemo(() => summarize(data, filter), [data, filter])
  const discs = useMemo(() => yearTops(data, filter.kind), [data, filter.kind])
  const c = chartColors(theme, 'green')
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

  const deck = <TocaDiscos years={discs} year={filter.year} onPick={onYear} />

  if (s.totalMs === 0) {
    return (
      <main className="page">
        <section className="hero hero-deck">
          {deck}
          <div className="hero-text">
            <p className="empty">Nada por aqui nesse período.</p>
          </div>
        </section>
      </main>
    )
  }

  const totalHours = s.totalMs / 3.6e6
  const daysNonStop = s.totalMs / 8.64e7
  const delta = s.previousYearMs ? (s.totalMs - s.previousYearMs) / s.previousYearMs : null
  const best = s.monthly.reduce((a, b) => (b.hours > a.hours ? b : a), s.monthly[0])
  const creators: RankItem[] = s.topCreators.map((r) => ({
    ...toItem(r),
    href: artistHref(r.id),
    image: artistRef(data, r.id),
    detail: `${num(r.plays)} reproduções · ${pct(r.ms / s.totalMs)} do total`,
  }))
  const items: RankItem[] = s.topItems.map((r) => ({
    ...toItem(r),
    name: cleanTitle(r.name),
    href: songHref(r.id),
    image: itemRef(data, r.id),
    track: trackOf(data, r.id),
  }))

  return (
    <main className="page">
      <section className="hero hero-deck">
        {deck}
        <div className="hero-text">
          <h1>
            Você ouviu <span className="accent">{num(totalHours)} horas</span>
          </h1>
          <p className="sub">
            {num(daysNonStop)} {Math.round(daysNonStop) === 1 ? 'dia' : 'dias'} sem parar
            {delta !== null &&
              ` · ${delta >= 0 ? `${num(delta * 100)}% a mais` : `${num(-delta * 100)}% a menos`} que ${filter.year! - 1}`}
          </p>
        </div>
      </section>

      <StatStrip
        items={[
          { label: 'Reproduções', value: num(s.plays) },
          { label: nouns.creators, value: num(s.creators) },
          { label: nouns.items, value: num(s.items) },
          { label: 'Dias ouvindo', value: num(s.activeDays) },
        ]}
      />

      <Section title={nouns.topC}>
        <Podium items={creators} />
      </Section>

      <Section title={nouns.topI}>
        <CoverWall items={items} />
      </Section>

      <Section title="Quando você mais ouviu">
        <div className="card chart-card">
          <p className="callout">
            <span>Mês recorde</span>
            <strong>{monthLabel(best.month)}</strong>
            <span>{num(best.hours)} horas</span>
          </p>
          <Chart option={monthlyOption} height={260} label={`Horas ouvidas por mês. Recorde em ${monthLabel(best.month)}.`} />
        </div>
      </Section>
    </main>
  )
}

function toItem(r: Ranked): RankItem {
  return {
    key: r.id,
    name: r.name,
    sub: r.sub || undefined,
    value: hours(r.ms),
    title: `${r.name}: ${hours(r.ms)}, ${num(r.plays)} reproduções`,
  }
}
