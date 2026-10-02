import { useEffect, useRef } from 'react'
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

/** Gráfico ECharts que se ajusta à largura do contêiner. */
export function Chart({ option, height, label }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!el.current) return
    const c = echarts.init(el.current, undefined, { renderer: 'canvas' })
    chart.current = c
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      c.dispose()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true })
  }, [option])

  return <div ref={el} role="img" aria-label={label} style={{ width: '100%', height }} />
}
