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
import { usePageTint, useTint } from '../ui/tint'
import { t as tr } from '../i18n'

interface Props {
  data: Dataset
  id: number
  theme: ThemeName
}

/** Posição no ranking: "nº 3". */
const rankLabel = (n: number) => tr(`nº ${num(n)}`, `#${num(n)}`, `n.º ${num(n)}`)

/** "vez" ou "vezes", conforme a quantidade. */
const times = (n: number) => (n === 1 ? tr('vez', 'play', 'vez') : tr('vezes', 'plays', 'veces'))

function back() {
  if (history.length > 1) history.back()
  else location.hash = 'linha'
}

export function Musica({ data, id, theme }: Props) {
  const t = useMemo(() => trackDetail(data, id), [data, id])
  const c = chartColors(theme, 'green')
  usePageTint(useTint(t ? itemRef(data, id) : null, t?.name ?? ''))

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
          `${monthLabel(p[0].name)}<br/><b>${num(p[0].value)} ${times(p[0].value)}</b>`,
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
          {tr('Não encontrei essa música nos seus dados.', "This song isn't in your data.", 'Esta canción no está en tus datos.')}{' '}
          <a href="#">{tr('Voltar para o Resumo', 'Back to Overview', 'Volver al Resumen')}</a>
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
        ← {tr('Voltar', 'Back', 'Volver')}
      </button>
      <section className="hero song-hero">
        <div className="song-cover">
          <span className="song-disc" aria-hidden />
          <Art image={image} label={t.name} round={false} />
        </div>
        <div className="song-text">
          <p className="eyebrow">
            {podcast ? tr('Episódio', 'Episode', 'Episodio') : tr('Música', 'Song', 'Canción')} · {rankLabel(t.rank)}
          </p>
          <h1 className="song-name" title={t.name}>
            {cleanTitle(t.name)}
          </h1>
          <p className="sub">
            {tr('de', 'by', 'de')} <a href={artistHref(t.creator)}>{artist}</a>
            {!podcast && t.album && <> · {t.album}</>}
          </p>
          {track && (
            <div className="song-actions">
              <PlayButton track={track} className="play-big" />
              <a className="ghost" href={spotifyUrl(track.uri)} target="_blank" rel="noreferrer">
                {tr('Abrir no Spotify', 'Open in Spotify', 'Abrir en Spotify')}
              </a>
            </div>
          )}
        </div>
      </section>

      <StatStrip
        items={[
          { label: tr('Reproduções', 'Plays', 'Reproducciones'), count: t.plays, hint: hours(t.totalMs) },
          ...(t.first ? [{ label: tr('Primeira vez', 'First play', 'Primera vez'), value: shortDate(t.first) }] : []),
          ...(t.last ? [{ label: tr('Última vez', 'Last play', 'Última vez'), value: shortDate(t.last) }] : []),
          {
            label: tr('Dias diferentes', 'Days played', 'Días distintos'),
            count: t.days,
            hint: t.bestDay
              ? tr(
                  `recorde: ${num(t.bestDay.plays)} ${times(t.bestDay.plays)} em ${shortDate(keyToMs(t.bestDay.day))}`,
                  `record: ${num(t.bestDay.plays)} ${times(t.bestDay.plays)} on ${shortDate(keyToMs(t.bestDay.day))}`,
                  `récord: ${num(t.bestDay.plays)} ${times(t.bestDay.plays)} el ${shortDate(keyToMs(t.bestDay.day))}`,
                )
              : undefined,
          },
        ]}
      />

      <Section
        title={tr('Quantas vezes por mês', 'Plays per month', 'Veces al mes')}
        note={tr(
          `${pct(t.artistShare)} do seu tempo com ${artist}`,
          `${pct(t.artistShare)} of your time with ${artist}`,
          `${pct(t.artistShare)} de tu tiempo con ${artist}`,
        )}
      >
        <div className="card">
          <Chart
            option={option}
            height={220}
            label={tr(`Vezes por mês que ${t.name} tocou`, `Plays per month of ${t.name}`, `Veces al mes que sonó ${t.name}`)}
          />
          <div className="year-chips" aria-label={tr('Posição em cada ano', 'Rank each year', 'Posición cada año')}>
            {t.yearly.map((y) => (
              <span key={y.year} className={y === bestYear ? 'on' : ''}>
                <strong>{y.year}</strong> {rankLabel(y.rank)} · {num(y.plays)} {times(y.plays)}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title={tr('Em que hora do dia você ouve', 'What time you listen', 'A qué hora escuchas')}>
        <div
          className="card hours24"
          role="img"
          aria-label={tr(
            `Reproduções por hora do dia. Mais às ${topHour}h.`,
            `Plays by hour of day. Most at ${topHour}h.`,
            `Reproducciones por hora del día. Más ${topHour === 1 ? 'a la' : 'a las'} ${topHour}h.`,
          )}
        >
          {t.byHour.map((v, h) => (
            <div key={h} className={h === topHour ? 'on' : ''} title={`${h}h: ${num(v)} ${times(v)}`}>
              <i style={{ '--v': v / maxHour, '--i': h / 3 } as CSSProperties} />
              <span>{h % 3 === 0 ? `${h}h` : ''}</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}
