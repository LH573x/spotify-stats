import { useEffect, useRef } from 'react'
import { reducedMotion, useInView } from './motion'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, CalendarComponent, VisualMapComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  CalendarComponent,
  VisualMapComponent,
  MarkLineComponent,
  CanvasRenderer,
])

export type ChartOption = echarts.EChartsCoreOption

interface Props {
  option: ChartOption
  height: number
  label: string
}

/** Entrada suave: a linha se desenha e as barras sobem. */
const motion = (): ChartOption =>
  reducedMotion() ? { animation: false } : { animationDuration: 1000, animationEasing: 'cubicOut', animationDurationUpdate: 500 }

/**
 * Gráfico ECharts que se ajusta à largura do contêiner. Só é desenhado quando aparece
 * na tela, para a animação de entrada acontecer na frente de quem está olhando.
 */
export function Chart({ option, height, label }: Props) {
  const [el, seen] = useInView<HTMLDivElement>()
  const chart = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!seen || !el.current) return
    const c = echarts.init(el.current, undefined, { renderer: 'canvas' })
    chart.current = c
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      c.dispose()
      chart.current = null
    }
  }, [seen, el])

  useEffect(() => {
    chart.current?.setOption({ ...motion(), ...option }, { notMerge: true })
  }, [option, seen])

  return <div ref={el} role="img" aria-label={label} style={{ width: '100%', height }} />
}
