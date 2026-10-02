import { useMemo } from 'react'
import type { Dataset } from '../data/types'
import { artistDetail } from '../data/artist'
import { Chart, type ChartOption } from '../ui/Chart'
import { CHART_COLORS, type ThemeName } from '../ui/theme'
import { hours, monthLabel, num, shortDate } from '../ui/format'
import { BarList, Tile } from '../ui/parts'

interface Props {
  data: Dataset
  id: number
  theme: ThemeName
}

function back() {
  if (history.length > 1) history.back()
  else location.hash = 'linha'
}

export function Artista({ data, id, theme }: Props) {
  const a = useMemo(() => artistDetail(data, id), [data, id])
  const c = CHART_COLORS[theme]

  const option = useMemo<ChartOption | null>(() => {
    if (!a) return null
    const bars = a.monthly.length <= 24
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: bars ? 'shadow' : 'line', lineStyle: { color: c.muted } },
        backgroundColor: c.surface,
        borderColor: c.axis,
        textStyle: { color: c.ink },
        formatter: (p: { name: string; value: number }[]) => `${monthLabel(p[0].name)}<br/><b>${hours(p[0].value * 3.6e6)}</b>`,
      },
      xAxis: {
        type: 'category',
        data: a.monthly.map((m) => m.month),
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false },
        axisLabel: {
          color: c.muted,
          hideOverlap: true,
          interval: bars ? 'auto' : (_: number, v: string) => v.endsWith('-01'),
          formatter: (v: string) => (bars ? monthLabel(v) : v.slice(0, 4)),
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: c.grid } },
        axisLabel: { color: c.muted, formatter: (v: number) => `${v} h` },
      },
      series: [
        bars
          ? {
              type: 'bar',
              data: a.monthly.map((m) => Math.round(m.hours * 10) / 10),
              itemStyle: { color: c.accent, borderRadius: [4, 4, 0, 0] },
              barMaxWidth: 28,
            }
          : {
              type: 'line',
              data: a.monthly.map((m) => Math.round(m.hours * 10) / 10),
              showSymbol: false,
              smooth: 0.2,
              lineStyle: { color: c.accent, width: 2 },
              itemStyle: { color: c.accent },
              areaStyle: { color: c.accent, opacity: 0.15 },
            },
      ],
    }
  }, [a, c])

  if (!a || !option) {
    return (
      <main className="page">
        <p className="empty">
          Não encontrei esse artista nos seus dados. <a href="#linha">Voltar para a linha do tempo</a>
        </p>
      </main>
    )
  }

  const podcast = a.kind === 'podcast'
  const bestYear = a.yearly.reduce((x, y) => (y.ms > x.ms ? y : x), a.yearly[0])
  const peak = a.monthly.reduce((x, y) => (y.hours > x.hours ? y : x), a.monthly[0])
  const maxItem = a.topItems[0]?.ms ?? 1

  return (
    <main className="page">
      <button className="ghost back" onClick={back}>
        ← Voltar
      </button>
      <section className="hero">
        <p className="eyebrow">
          {podcast ? 'Podcast' : 'Artista'} · nº {num(a.rank)} de {num(a.rankOf)} {podcast ? 'podcasts' : 'artistas'} que você já
          ouviu
        </p>
        <h1 className="artist-name">{a.name}</h1>
        <p className="sub">
          <span className="accent">{hours(a.totalMs)}</span> ouvindo, {num(a.plays)} reproduções, {num(a.itemCount)}{' '}
          {podcast ? 'episódios' : a.itemCount === 1 ? 'música' : 'músicas'}.
        </p>
      </section>

      <section className="tiles">
        {a.first && <Tile label="Primeira vez" value={shortDate(a.first.t)} hint={a.first.item} />}
        {a.last && <Tile label="Última vez" value={shortDate(a.last.t)} hint={a.last.item} />}
        <Tile label="Ano favorito" value={String(bestYear.year)} hint={`${hours(bestYear.ms)}, nº ${bestYear.rank} do ano`} />
        <Tile label="Mês recorde" value={monthLabel(peak.month)} hint={hours(peak.hours * 3.6e6)} />
      </section>

      <section className="card">
        <header>
          <h2>Horas por mês</h2>
          <p>Toda a sua história com {a.name}.</p>
        </header>
        <Chart option={option} height={240} label={`Horas por mês ouvindo ${a.name}`} />
        <div className="year-chips" aria-label="Posição em cada ano">
          {a.yearly.map((y) => (
            <span key={y.year} className={y === bestYear ? 'on' : ''}>
              <strong>{y.year}</strong> nº {num(y.rank)} · {hours(y.ms)}
            </span>
          ))}
        </div>
      </section>

      <BarList
        title={podcast ? 'Episódios mais ouvidos' : 'Músicas mais ouvidas'}
        rows={a.topItems.map((it) => ({
          key: it.id,
          name: it.name,
          sub: podcast ? undefined : it.album,
          value: hours(it.ms),
          share: it.ms / maxItem,
          title: `${it.name}: ${hours(it.ms)}, ${num(it.plays)} reproduções`,
        }))}
      />
    </main>
  )
}
