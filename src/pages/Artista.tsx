import { useMemo } from 'react'
import type { Dataset } from '../data/types'
import { artistDetail } from '../data/artist'
import { Chart, type ChartOption } from '../ui/Chart'
import { chartColors, type ThemeName } from '../ui/theme'
import { hours, monthLabel, num, shortDate } from '../ui/format'
import { BarList } from '../ui/parts'
import { Section, StatStrip } from '../ui/blocks'
import { SimilarSection } from '../ui/ExploreParts'
import { Art } from '../ui/Thumb'
import { artistRef, itemRef } from '../data/refs'
import { songHref } from '../ui/links'
import { trackOf } from '../ui/playerStore'
import { usePageTint, useTint } from '../ui/tint'
import { t } from '../i18n'

interface Props {
  data: Dataset
  id: number
  theme: ThemeName
}

/** Posição no ranking: "nº 3". */
const rankLabel = (n: number) => t(`nº ${num(n)}`, `#${num(n)}`, `n.º ${num(n)}`)

function back() {
  if (history.length > 1) history.back()
  else location.hash = 'linha'
}

export function Artista({ data, id, theme }: Props) {
  const a = useMemo(() => artistDetail(data, id), [data, id])
  const c = chartColors(theme, 'green')
  usePageTint(useTint(a ? artistRef(data, id) : null, a?.name ?? ''))

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
          {t('Não encontrei esse artista nos seus dados.', "This artist isn't in your data.", 'Este artista no está en tus datos.')}{' '}
          <a href="#linha">{t('Voltar para a linha do tempo', 'Back to Timeline', 'Volver a la línea de tiempo')}</a>
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
        ← {t('Voltar', 'Back', 'Volver')}
      </button>
      <section className="hero artist-hero">
        <Art image={artistRef(data, id)} label={a.name} className="artist-photo" />
        <div>
          <p className="eyebrow">
            {podcast ? 'Podcast' : t('Artista', 'Artist', 'Artista')} · {rankLabel(a.rank)}
          </p>
          <h1 className="artist-name">{a.name}</h1>
          <p className="sub">
            <span className="accent">{hours(a.totalMs)}</span> · {num(a.plays)}{' '}
            {t('reproduções', a.plays === 1 ? 'play' : 'plays', a.plays === 1 ? 'reproducción' : 'reproducciones')} ·{' '}
            {num(a.itemCount)}{' '}
            {podcast
              ? t('episódios', a.itemCount === 1 ? 'episode' : 'episodes', a.itemCount === 1 ? 'episodio' : 'episodios')
              : a.itemCount === 1
                ? t('música', 'song', 'canción')
                : t('músicas', 'songs', 'canciones')}
          </p>
        </div>
      </section>

      <StatStrip
        items={[
          ...(a.first ? [{ label: t('Primeira vez', 'First play', 'Primera vez'), value: shortDate(a.first.t), hint: a.first.item }] : []),
          ...(a.last ? [{ label: t('Última vez', 'Last play', 'Última vez'), value: shortDate(a.last.t), hint: a.last.item }] : []),
          { label: t('Ano favorito', 'Top year', 'Año favorito'), value: String(bestYear.year), hint: hours(bestYear.ms) },
          { label: t('Mês recorde', 'Peak month', 'Mes récord'), value: monthLabel(peak.month), hint: hours(peak.hours * 3.6e6) },
        ]}
      />

      <Section title={t(`Sua história com ${a.name}`, `Your story with ${a.name}`, `Tu historia con ${a.name}`)}>
        <div className="card">
          <Chart
            option={option}
            height={240}
            label={t(`Horas por mês ouvindo ${a.name}`, `Hours a month listening to ${a.name}`, `Horas al mes escuchando a ${a.name}`)}
          />
          <div className="year-chips" aria-label={t('Posição em cada ano', 'Rank each year', 'Posición cada año')}>
            {a.yearly.map((y) => (
              <span key={y.year} className={y === bestYear ? 'on' : ''}>
                <strong>{y.year}</strong> {rankLabel(y.rank)} · {hours(y.ms)}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title={
          podcast
            ? t('Episódios mais ouvidos', 'Top episodes', 'Episodios más escuchados')
            : t('Músicas mais ouvidas', 'Top songs', 'Canciones más escuchadas')
        }
      >
        <BarList
          rows={a.topItems.map((it) => ({
            key: it.id,
            name: it.name,
            image: podcast ? undefined : itemRef(data, it.id),
            href: songHref(it.id),
            track: trackOf(data, it.id),
            value: hours(it.ms),
            share: it.ms / maxItem,
            title: `${it.name}: ${hours(it.ms)}, ${num(it.plays)} ${t('reproduções', it.plays === 1 ? 'play' : 'plays', it.plays === 1 ? 'reproducción' : 'reproducciones')}`,
          }))}
        />
      </Section>

      {!podcast && <SimilarSection data={data} name={a.name} />}
    </main>
  )
}
