import { useMemo, type CSSProperties } from 'react'
import type { Dataset } from '../data/types'
import { trackDetail } from '../data/track'
import { itemRef } from '../data/refs'
import { Chart, type ChartOption } from '../ui/Chart'
import { chartColors, type ThemeName } from '../ui/theme'
import { cleanTitle, hours, keyToMs, monthLabel, num, pct, shortDate } from '../ui/format'
import { Section, StatStrip } from '../ui/blocks'
import { Art } from '../ui/Thumb'
import { artistHref } from '../ui/links'
import { PlayButton } from '../ui/player'
import { spotifyUrl, trackOf } from '../ui/playerStore'

interface Props {
  data: Dataset
  id: number
  theme: ThemeName
}

function back() {
  if (history.length > 1) history.back()
  else location.hash = 'linha'
}

export function Musica({ data, id, theme }: Props) {
  const t = useMemo(() => trackDetail(data, id), [data, id])
  const c = chartColors(theme, 'green')

  const option = useMemo<ChartOption | null>(() => {
    if (!t) return null
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: c.surface,
        borderColor: c.axis,
        textStyle: { color: c.ink },
        formatter: (p: { name: string; value: number }[]) =>
          `${monthLabel(p[0].name)}<br/><b>${num(p[0].value)} ${p[0].value === 1 ? 'vez' : 'vezes'}</b>`,
      },
      xAxis: {
        type: 'category',
        data: t.monthly.map((m) => m.month),
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false },
        axisLabel: {
          color: c.muted,
          hideOverlap: true,
          interval: t.monthly.length <= 18 ? 'auto' : (_: number, v: string) => v.endsWith('-01'),
          formatter: (v: string) => (t.monthly.length <= 18 ? monthLabel(v) : v.slice(0, 4)),
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: c.grid } },
        axisLabel: { color: c.muted },
      },
      series: [
        {
          type: 'bar',
          data: t.monthly.map((m) => m.plays),
          itemStyle: { color: c.accent, borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 28,
        },
      ],
    }
  }, [t, c])

  if (!t || !option) {
    return (
      <main className="page">
        <p className="empty">
          Não encontrei essa música nos seus dados. <a href="#">Voltar para o Resumo</a>
        </p>
      </main>
    )
  }

  const podcast = t.kind === 'podcast'
  const artist = data.creators[t.creator]
  const track = trackOf(data, id)
  const image = itemRef(data, id)
  const bestYear = t.yearly.reduce((a, b) => (b.ms > a.ms ? b : a), t.yearly[0])
  const maxHour = Math.max(1, ...t.byHour)
  const topHour = t.byHour.indexOf(maxHour)

  return (
    <main className="page">
      <button className="ghost back" onClick={back}>
        ← Voltar
      </button>
      <section className="hero song-hero">
        <div className="song-cover">
          <span className="song-disc" aria-hidden />
          <Art image={image} label={t.name} round={false} />
        </div>
        <div className="song-text">
          <p className="eyebrow">
            {podcast ? 'Episódio' : 'Música'} · nº {num(t.rank)}
          </p>
          <h1 className="song-name" title={t.name}>
            {cleanTitle(t.name)}
          </h1>
          <p className="sub">
            de <a href={artistHref(t.creator)}>{artist}</a>
            {!podcast && t.album && <> · {t.album}</>}
          </p>
          {track && (
            <div className="song-actions">
              <PlayButton track={track} className="play-big" />
              <a className="ghost" href={spotifyUrl(track.uri)} target="_blank" rel="noreferrer">
                Abrir no Spotify
              </a>
            </div>
          )}
        </div>
      </section>

      <StatStrip
        items={[
          { label: 'Reproduções', value: num(t.plays), hint: hours(t.totalMs) },
          ...(t.first ? [{ label: 'Primeira vez', value: shortDate(t.first) }] : []),
          ...(t.last ? [{ label: 'Última vez', value: shortDate(t.last) }] : []),
          { label: 'Dias diferentes', value: num(t.days), hint: t.bestDay ? `recorde: ${num(t.bestDay.plays)} ${t.bestDay.plays === 1 ? 'vez' : 'vezes'} em ${shortDate(keyToMs(t.bestDay.day))}` : undefined },
        ]}
      />

      <Section title="Quantas vezes por mês" note={`${pct(t.artistShare)} do seu tempo com ${artist}`}>
        <div className="card">
          <Chart option={option} height={220} label={`Vezes por mês que ${t.name} tocou`} />
          <div className="year-chips" aria-label="Posição em cada ano">
            {t.yearly.map((y) => (
              <span key={y.year} className={y === bestYear ? 'on' : ''}>
                <strong>{y.year}</strong> nº {num(y.rank)} · {num(y.plays)} {y.plays === 1 ? 'vez' : 'vezes'}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Em que hora do dia você ouve">
        <div className="card hours24" role="img" aria-label={`Reproduções por hora do dia. Mais às ${topHour}h.`}>
          {t.byHour.map((v, h) => (
            <div key={h} className={h === topHour ? 'on' : ''} title={`${h}h: ${num(v)} ${v === 1 ? 'vez' : 'vezes'}`}>
              <i style={{ '--v': v / maxHour } as CSSProperties} />
              <span>{h % 3 === 0 ? `${h}h` : ''}</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}
