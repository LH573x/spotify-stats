import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from '../data/types'
import type { Filter } from '../data/stats'
import { dayParts, habits } from '../data/habits'
import { Chart, type ChartOption } from '../ui/Chart'
import { chartColors, type ThemeName } from '../ui/theme'
import { hours, num, pct } from '../ui/format'
import { BarList } from '../ui/parts'
import { Section, StatStrip } from '../ui/blocks'
import { itemRef } from '../data/refs'

interface Props {
  data: Dataset
  filter: Filter
  theme: ThemeName
  lastYear: number
}

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const WEEKDAYS_LONG = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2024-03-07" → "qui, 7 de mar. de 2024" (sem fuso: a data já é local). */
function dayLabel(key: string, withWeekday = true): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: withWeekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function useNarrow(px = 720) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < px)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < px)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [px])
  return narrow
}

export function Curiosidades({ data, filter, theme, lastYear }: Props) {
  const h = useMemo(() => habits(data, filter, lastYear), [data, filter, lastYear])
  const c = chartColors(theme, 'coral')
  const narrow = useNarrow()

  const calendarOption = useMemo<ChartOption>(
    () => ({
      tooltip: {
        backgroundColor: c.surface,
        borderColor: c.axis,
        textStyle: { color: c.ink },
        formatter: (p: { value: [string, number] }) => `${dayLabel(p.value[0])}<br/><b>${hours(p.value[1] * 3.6e6)}</b>`,
      },
      visualMap: {
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 14,
        textStyle: { color: c.ink2 },
        pieces: [
          { min: 0, max: 0.5, label: 'até 30 min' },
          { min: 0.5, max: 1, label: '30 min a 1 h' },
          { min: 1, max: 2, label: '1 a 2 h' },
          { min: 2, max: 4, label: '2 a 4 h' },
          { min: 4, label: '4 h ou mais' },
        ],
        inRange: { color: c.ramp.slice(1) },
      },
      calendar: {
        range: String(h.calendarYear),
        top: 28,
        left: 32,
        right: 8,
        bottom: 44,
        cellSize: ['auto', 'auto'],
        splitLine: { show: false },
        itemStyle: { color: c.ramp[0], borderColor: c.surface, borderWidth: 3 },
        yearLabel: { show: false },
        dayLabel: { firstDay: 1, nameMap: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'], color: c.muted, fontSize: 11 },
        monthLabel: { nameMap: MONTHS, color: c.muted, fontSize: 11 },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: h.days }],
    }),
    [h, c],
  )

  const clockMax = Math.max(0.001, ...h.clock.flat())
  const clockOption = useMemo<ChartOption>(
    () => ({
      tooltip: {
        backgroundColor: c.surface,
        borderColor: c.axis,
        textStyle: { color: c.ink },
        formatter: (p: { value: [number, number, number] }) =>
          `${WEEKDAYS_LONG[p.value[1]]}, ${p.value[0]}h<br/><b>${hours(p.value[2] * 3.6e6)}</b> no período`,
      },
      grid: { left: 40, right: 8, top: 8, bottom: 64 },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, i) => `${i}h`),
        axisLine: { show: false },
        axisTick: { show: false },
        splitArea: { show: false },
        axisLabel: { color: c.muted, interval: narrow ? 5 : 2, fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: WEEKDAYS,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: 11 },
      },
      visualMap: {
        min: 0,
        max: clockMax,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 160,
        itemWidth: 10,
        text: ['mais', 'menos'],
        textStyle: { color: c.ink2 },
        calculable: false,
        inRange: { color: c.ramp },
        formatter: () => '',
      },
      series: [
        {
          type: 'heatmap',
          data: h.clock.flatMap((row, w) => row.map((v, hr) => [hr, w, Math.round(v * 10) / 10])),
          itemStyle: { borderColor: c.surface, borderWidth: 2, borderRadius: 3 },
          emphasis: { itemStyle: { borderColor: c.ink, borderWidth: 1 } },
        },
      ],
    }),
    [h, c, narrow, clockMax],
  )

  if (!h.bestDay) return <p className="empty">Nada por aqui nesse período.</p>

  const partHours = dayParts(h.clock)
  const totalHours = partHours.reduce((a, p) => a + p.hours, 0)
  const topPart = partHours.reduce((a, b) => (b.hours > a.hours ? b : a))
  const platformTotal = h.platforms.reduce((a, p) => a + p.ms, 0)
  const maxSkips = h.topSkipped[0]?.skips ?? 1
  const stats = [
    h.streak && {
      label: 'Sequência recorde',
      value: `${num(h.streak.days)} ${h.streak.days === 1 ? 'dia' : 'dias'}`,
      hint: `seguidos, de ${dayLabel(h.streak.from, false)} a ${dayLabel(h.streak.to, false)}`,
    },
    { label: 'Dia recorde', value: hours(h.bestDay.ms), hint: dayLabel(h.bestDay.day) },
    h.shuffleShare !== null && { label: 'No aleatório', value: pct(h.shuffleShare), hint: 'das reproduções' },
    h.skipShare !== null && { label: 'Puladas', value: pct(h.skipShare), hint: 'das faixas, apertando próxima' },
  ].filter((x) => !!x)

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">{filter.year ? `Em ${filter.year}` : 'Desde o começo'}</p>
        <h1>
          Você é da <span className="accent">{topPart.name.toLowerCase()}</span>
        </h1>
        <p className="sub">
          {pct(topPart.hours / totalHours)} do que você ouve toca entre {topPart.from}h e {topPart.to}h.
          {h.peak && (
            <>
              {' '}
              Seu horário nobre é {WEEKDAYS_LONG[h.peak.weekday]} às {h.peak.hour}h.
            </>
          )}
        </p>
        <div className="daybar" role="img" aria-label={partHours.map((p) => `${p.name}: ${pct(p.hours / totalHours)}`).join(', ')}>
          {partHours.map((p) => (
            <div key={p.name} className={p === topPart ? 'on' : ''} style={{ flexGrow: Math.max(p.hours / totalHours, 0.0001) }}>
              <strong>{pct(p.hours / totalHours)}</strong>
              <span>{p.name}</span>
              <small>
                {p.from}h a {p.to}h
              </small>
            </div>
          ))}
        </div>
      </section>

      <StatStrip items={stats} />

      <Section kicker="Relógio" title="A que horas você dá play" note="Cada quadrado é uma hora da semana. Quanto mais forte, mais você ouviu.">
        <div className="card">
          <Chart option={clockOption} height={300} label="Horas ouvidas por dia da semana e hora do dia" />
        </div>
      </Section>

      <Section
        kicker="Calendário"
        title={`Seu ${h.calendarYear}, dia por dia`}
        note={<>Cada quadrado é um dia.{filter.year === null && ' Escolha um ano no topo para ver outro.'}</>}
      >
        <div className="card">
          <div className="scroll-x">
            <div style={{ minWidth: 720 }}>
              <Chart option={calendarOption} height={200} label={`Calendário de escuta de ${h.calendarYear}, horas por dia`} />
            </div>
          </div>
        </div>
      </Section>

      <div className="two">
        {h.platforms.length > 0 && (
          <Section kicker="Aparelhos" title="Onde você ouve">
            <ul className="card shares">
              {h.platforms.map((p) => (
                <li key={p.name} title={`${p.name}: ${hours(p.ms)}`}>
                  <strong>{pct(p.ms / platformTotal)}</strong>
                  <span>{p.name}</span>
                  <i>
                    <b style={{ width: `${(p.ms / platformTotal) * 100}%` }} />
                  </i>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {h.topSkipped.length > 0 && (
          <Section kicker="Botão de pular" title="O que você mais pula" note="Vezes que você apertou próxima, entre as faixas que tocaram 5 vezes ou mais.">
            <BarList
              rows={h.topSkipped.map((s) => ({
                key: s.id,
                name: s.name,
                sub: s.sub,
                image: itemRef(data, s.id),
                value: `${num(s.skips)} de ${num(s.starts)}`,
                share: s.skips / maxSkips,
                title: `${s.name}: pulada ${num(s.skips)} de ${num(s.starts)} vezes (${pct(s.skips / s.starts)})`,
              }))}
            />
          </Section>
        )}
      </div>
    </main>
  )
}
