import type { ReactNode } from 'react'
import type { WrappedYear } from '../data/wrapped'
import { useImagesData } from '../data/images'
import { CARD_FONT, ellipsize, fitText } from './svgText'
import { capitalize, cleanTitle, minutes, peakMonth, type CardInfo } from './wrappedDeck'
import { dayMonth, keyToMs, longHours, monthName, num, pct, weekdayName } from './format'

/*
 * Cada cartão é um SVG de 1080×1920 (formato de story). O mesmo SVG aparece na tela
 * e vira PNG na hora de baixar, então tudo aqui usa atributos, não classes do CSS.
 */
const W = 1080
const H = 1920
const M = 96
const CW = W - 2 * M

interface Palette {
  bg: string
  ink: string
  ink2: string
  muted: string
  accent: string
  soft: string
}

const PAL: Record<'black' | 'forest' | 'green', Palette> = {
  black: { bg: '#121212', ink: '#ffffff', ink2: '#c3c2b7', muted: '#898781', accent: '#2fbf71', soft: 'rgba(255,255,255,0.14)' },
  forest: { bg: '#0f3b26', ink: '#ffffff', ink2: '#cfe9da', muted: '#8fc2a5', accent: '#6ee7a0', soft: 'rgba(255,255,255,0.16)' },
  green: { bg: '#2fbf71', ink: '#0b0b0b', ink2: '#0b2a19', muted: '#0e4a2b', accent: '#0b0b0b', soft: 'rgba(11,11,11,0.2)' },
}

interface TextOpts {
  size: number
  /** Menor tamanho aceito antes de cortar com reticências. */
  min?: number
  weight?: number
  fill: string
  lines?: number
  width?: number
  x?: number
  /** Altura da linha, em múltiplos do tamanho. */
  lh?: number
}

/** Texto que encolhe e quebra linha para caber; `top` é o topo da primeira linha. */
function textBlock(t: string, top: number, o: TextOpts) {
  const weight = o.weight ?? 400
  const width = o.width ?? CW
  const x = o.x ?? M
  const { size, lines } = fitText(t, width, { max: o.size, min: o.min ?? o.size, weight, maxLines: o.lines ?? 1 })
  const step = size * (o.lh ?? 1.12)
  const el = (
    <text x={x} y={top + size * 0.8} fontSize={size} fontWeight={weight} fill={o.fill}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i ? step : 0}>
          {l}
        </tspan>
      ))}
    </text>
  )
  return { el, height: size + (lines.length - 1) * step }
}

/** Empilha blocos de cima para baixo; cada bloco entra com um pequeno atraso na animação. */
function makeStack(top: number) {
  let y = top
  const els: ReactNode[] = []
  const push = (node: ReactNode) =>
    els.push(
      <g key={els.length} className="wa" style={{ animationDelay: `${80 + els.length * 90}ms` }}>
        {node}
      </g>,
    )
  const api = {
    get y() {
      return y
    },
    els,
    gap(n: number) {
      y += n
      return api
    },
    at(n: number) {
      y = n
      return api
    },
    text(t: string, o: TextOpts) {
      const b = textBlock(t, y, o)
      push(b.el)
      y += b.height
      return api
    },
    /** Desenho livre a partir do y atual, ocupando `height`. */
    draw(height: number, fn: (y: number) => ReactNode) {
      push(fn(y))
      y += height
      return api
    },
  }
  return api
}

function Frame({ p, year, label, deco, children }: { p: Palette; year: number; label: string; deco?: ReactNode; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={label}
      fontFamily={CARD_FONT}
    >
      <rect width={W} height={H} fill={p.bg} />
      {deco}
      {children}
      <g fill={p.accent}>
        <rect x={M} y={H - 96 - 28} width={14} height={28} rx={5} />
        <rect x={M + 22} y={H - 96 - 56} width={14} height={56} rx={5} />
        <rect x={M + 44} y={H - 96 - 40} width={14} height={40} rx={5} />
      </g>
      <text x={M + 80} y={H - 100} fontSize={38} fontWeight={700} fill={p.ink}>
        Meu Spotify
      </text>
      <text x={W - M} y={H - 100} fontSize={38} fontWeight={700} fill={p.muted} textAnchor="end">
        {year}
      </text>
    </svg>
  )
}

const Circle = ({ p, cx, cy, r }: { p: Palette; cx: number; cy: number; r: number }) => (
  <circle cx={cx} cy={cy} r={r} fill={p.accent} opacity={0.12} />
)

const Divider = ({ p, y }: { p: Palette; y: number }) => <rect x={M} y={y} width={CW} height={3} fill={p.soft} />

/** Foto (círculo) ou capa (quadrado arredondado) recortada; `id` precisa ser único na página. */
function Pic({ id, href, x, y, size, round, ring }: { id: string; href: string; x: number; y: number; size: number; round: boolean; ring?: string }) {
  const r = round ? size / 2 : size * 0.08
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={size} height={size} rx={r} />
        </clipPath>
      </defs>
      <image href={href} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
      {ring && <rect x={x} y={y} width={size} height={size} rx={r} fill="none" stroke={ring} strokeWidth={8} />}
    </g>
  )
}

/** Cartões de destaque (artista, descoberta, podcast): com foto, ela entra no topo e o texto desce. */
const PHOTO = { top: 250, size: 380 }

/** Barras verticais simples, com a(s) barra(s) em destaque e rótulos embaixo. */
function Bars({
  values,
  base,
  maxH,
  on,
  labels,
  p,
  onColor,
  valueLabel,
}: {
  values: number[]
  base: number
  maxH: number
  on: (i: number) => boolean
  labels: { i: number; text: string }[]
  p: Palette
  onColor: string
  valueLabel?: { i: number; text: string }
}) {
  const max = Math.max(...values, 1e-9)
  const slot = CW / values.length
  const bw = slot * 0.66
  return (
    <g>
      {values.map((v, i) => {
        const h = Math.max(6, (v / max) * maxH)
        return (
          <rect
            key={i}
            className="wbar"
            style={{ animationDelay: `${200 + i * 25}ms` }}
            x={M + i * slot + (slot - bw) / 2}
            y={base - h}
            width={bw}
            height={h}
            rx={Math.min(8, bw / 3)}
            fill={on(i) ? onColor : p.soft}
          />
        )
      })}
      {labels.map((l) => (
        <text key={l.i} x={M + l.i * slot + slot / 2} y={base + 62} fontSize={36} fontWeight={600} fill={p.muted} textAnchor="middle">
          {l.text}
        </text>
      ))}
      {valueLabel && (
        <text
          x={M + valueLabel.i * slot + slot / 2}
          y={base - (values[valueLabel.i] / max) * maxH - 24}
          fontSize={40}
          fontWeight={800}
          fill={onColor}
          textAnchor="middle"
        >
          {valueLabel.text}
        </text>
      )}
    </g>
  )
}

/** Lista numerada de 5 com barra proporcional às horas; com imagens, cada linha ganha foto ou capa. */
function TopRows({
  rows,
  top,
  p,
  images,
  round,
  uid,
}: {
  rows: { name: string; sub: string; share: number }[]
  top: number
  p: Palette
  images: (string | null)[]
  round: boolean
  uid: string
}) {
  const withPics = images.some(Boolean)
  const pic = 124
  const x = withPics ? M + 100 + pic + 32 : M + 150
  const width = W - M - x
  return (
    <>
      {rows.map((r, i) => {
        const y = top + i * 210
        const name = textBlock(r.name, y + 4, { size: 64, min: 52, weight: 800, fill: p.ink, x, width })
        const img = images[i]
        return (
          <g key={i} className="wa" style={{ animationDelay: `${250 + i * 110}ms` }}>
            <text x={M} y={y + 104} fontSize={120} fontWeight={800} fill={p.accent}>
              {i + 1}
            </text>
            {withPics &&
              (img ? (
                <Pic id={`${uid}-${i}`} href={img} x={M + 100} y={y + 16} size={pic} round={round} />
              ) : (
                <rect x={M + 100} y={y + 16} width={pic} height={pic} rx={round ? pic / 2 : pic * 0.08} fill={p.soft} />
              ))}
            {name.el}
            <text x={x} y={y + 4 + name.height + 52} fontSize={40} fill={p.ink2}>
              {ellipsize(r.sub, width, 40, 400)}
            </text>
            <rect x={x} y={y + 156} width={width} height={12} rx={6} fill={p.soft} />
            <rect x={x} y={y + 156} width={Math.max(12, width * r.share)} height={12} rx={6} fill={p.accent} />
          </g>
        )
      })}
    </>
  )
}

function Capa({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.green
  const endsEarly = new Date(w.to).getMonth() < 11
  const s = makeStack(300)
    .text('Meu Spotify', { size: 54, weight: 700, fill: p.ink })
    .gap(30)
    .text(String(w.year), { size: 300, min: 180, weight: 800, fill: p.ink, lh: 1 })
    .gap(30)
    .text(endsEarly ? 'Seu ano até aqui' : 'Seu ano em música', { size: 76, min: 56, weight: 800, fill: p.ink, lines: 2 })
  if (w.partial) s.gap(24).text(`De ${dayMonth(w.from)} a ${dayMonth(w.to)}`, { size: 48, fill: p.ink2 })
  const bw = 150
  const gap = 40
  const x0 = W - M - 3 * bw - 2 * gap
  const bottom = H - 280
  const deco = (
    <g fill={p.ink}>
      {[300, 600, 420].map((h, i) => (
        <rect key={i} className="wbar" style={{ animationDelay: `${300 + i * 120}ms` }} x={x0 + i * (bw + gap)} y={bottom - h} width={bw} height={h} rx={44} />
      ))}
    </g>
  )
  return (
    <Frame p={p} year={w.year} label={label} deco={deco}>
      {s.els}
    </Frame>
  )
}

function Minutos({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.black
  const days = Math.round(w.totalMs / 86.4e6)
  const s = makeStack(440)
    .text(`Em ${w.year}, você ouviu`, { size: 58, weight: 600, fill: p.ink2, lines: 2 })
    .gap(36)
    .text(num(minutes(w)), { size: 250, min: 140, weight: 800, fill: p.accent, lh: 1 })
    .gap(14)
    .text('minutos', { size: 100, weight: 800, fill: p.ink })
    .gap(80)
    .text(days >= 1 ? `São ${longHours(w.totalMs)}, ou ${num(days)} ${days === 1 ? 'dia' : 'dias'} sem parar.` : `São ${longHours(w.totalMs)}.`, {
      size: 54,
      fill: p.ink2,
      lines: 3,
    })
  if (w.previousYearMs && !w.partial) {
    const r = w.totalMs / w.previousYearMs - 1
    const cmp =
      Math.abs(r) < 0.03 ? `Quase o mesmo que em ${w.year - 1}.` : `${pct(Math.abs(r))} a ${r > 0 ? 'mais' : 'menos'} que em ${w.year - 1}.`
    s.gap(36).text(cmp, { size: 54, weight: 700, fill: p.accent, lines: 2 })
  }
  if (w.podcastMs >= 60_000) s.gap(36).text(`Contando ${longHours(w.podcastMs)} de podcasts.`, { size: 46, fill: p.muted, lines: 2 })
  return (
    <Frame p={p} year={w.year} label={label} deco={<Circle p={p} cx={W + 40} cy={140} r={380} />}>
      {s.els}
    </Frame>
  )
}

function Artista({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.forest
  const a = w.topArtist!
  const [photo, cover] = useImagesData([a.image, a.topItem?.image])
  const s = makeStack(photo ? PHOTO.top + PHOTO.size + 60 : 380)
    .text('Seu artista do ano', { size: 56, weight: 700, fill: p.accent })
    .gap(photo ? 28 : 40)
    .text(a.name, { size: photo ? 140 : 170, min: 84, weight: 800, fill: p.ink, lines: photo ? 2 : 3, lh: 1.02 })
    .gap(photo ? 40 : 56)
    .text(`${capitalize(longHours(a.ms))} e ${num(a.plays)} reproduções`, { size: 52, weight: 700, fill: p.ink, lines: 2 })
  // No primeiro ano do export, "desde quando" é só o começo dos dados.
  if (a.since !== null && !w.firstYear) {
    const sinceYear = new Date(a.since).getFullYear()
    s.gap(20).text(sinceYear < w.year ? `Você ouve desde ${sinceYear}.` : `Você conheceu em ${dayMonth(a.since)}.`, {
      size: 48,
      fill: p.ink2,
      lines: 2,
    })
  }
  if (a.topItem) {
    s.at(Math.max(s.y + (photo ? 70 : 110), photo ? 1300 : 1200)).draw(64, (y) => <Divider p={p} y={y} />)
    const top = s.y
    const size = 176
    const tx = cover ? M + size + 36 : M
    const width = W - M - tx
    if (cover) s.draw(0, (y) => <Pic id="artista-capa" href={cover} x={M} y={y} size={size} round={false} />)
    s.text('A preferida', { size: 44, weight: 700, fill: p.muted, x: tx, width })
      .gap(14)
      .text(cleanTitle(a.topItem.name), { size: 72, min: 46, weight: 800, fill: p.ink, lines: 2, x: tx, width })
      .gap(14)
      .text(`tocou ${num(a.topItem.plays)} ${a.topItem.plays === 1 ? 'vez' : 'vezes'}`, { size: 44, fill: p.ink2, x: tx, width })
    if (cover) s.at(Math.max(s.y, top + size))
  }
  return (
    <Frame p={p} year={w.year} label={label} deco={<Circle p={p} cx={W - 60} cy={H - 360} r={300} />}>
      {photo && <Pic id="artista-foto" href={photo} x={M} y={PHOTO.top} size={PHOTO.size} round ring={p.accent} />}
      {s.els}
    </Frame>
  )
}

function TopArtistas({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.black
  const max = w.topArtists[0].ms
  const s = makeStack(300)
    .text(`Top ${w.topArtists.length} de ${w.year}`, { size: 54, weight: 700, fill: p.accent })
    .gap(24)
    .text('Seus artistas', { size: 120, min: 80, weight: 800, fill: p.ink })
  const rows = w.topArtists.map((a) => ({ name: a.name, sub: longHours(a.ms), share: a.ms / max }))
  const images = useImagesData(w.images.artists)
  return (
    <Frame p={p} year={w.year} label={label}>
      {s.els}
      <TopRows rows={rows} top={s.y + 110} p={p} images={images} round uid="top-artistas" />
    </Frame>
  )
}

function TopMusicas({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.forest
  const max = w.topSongs[0].ms
  const s = makeStack(300)
    .text(`Top ${w.topSongs.length} de ${w.year}`, { size: 54, weight: 700, fill: p.accent })
    .gap(24)
    .text('Suas músicas', { size: 120, min: 80, weight: 800, fill: p.ink })
  const rows = w.topSongs.map((t) => ({
    name: cleanTitle(t.name),
    sub: `${t.sub} · ${num(t.plays)} ${t.plays === 1 ? 'vez' : 'vezes'}`,
    share: t.ms / max,
  }))
  const images = useImagesData(w.images.songs)
  return (
    <Frame p={p} year={w.year} label={label}>
      {s.els}
      <TopRows rows={rows} top={s.y + 110} p={p} images={images} round={false} uid="top-musicas" />
    </Frame>
  )
}

const INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function Mes({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.black
  const m = peakMonth(w)
  const ms = w.months[m] * 3.6e6
  const days = new Date(w.year, m + 1, 0).getDate()
  const s = makeStack(360)
    .text(`Seu mês de ${w.year}`, { size: 54, weight: 700, fill: p.accent })
    .gap(28)
    .text(capitalize(monthName(m)), { size: 170, min: 110, weight: 800, fill: p.ink })
    .gap(44)
    .text(`${capitalize(longHours(ms))} no mês, ou ${longHours(ms / days)} por dia.`, { size: 52, fill: p.ink2, lines: 3 })
  return (
    <Frame p={p} year={w.year} label={label}>
      {s.els}
      <Bars
        values={w.months}
        base={1580}
        maxH={Math.min(620, 1580 - s.y - 160)}
        on={(i) => i === m}
        labels={INITIALS.map((text, i) => ({ i, text }))}
        p={p}
        onColor={p.accent}
        valueLabel={{ i: m, text: `${num(w.months[m])} h` }}
      />
    </Frame>
  )
}

function Horario({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.green
  const part = w.part!
  const s = makeStack(360)
    .text('Seu horário', { size: 54, weight: 700, fill: p.muted })
    .gap(28)
    .text(`Você é da ${part.name.toLowerCase()}`, { size: 140, min: 90, weight: 800, fill: p.ink, lines: 2, lh: 1.02 })
    .gap(44)
    .text(`${pct(part.share)} do que você ouviu tocou entre ${part.from}h e ${part.to}h.`, { size: 52, fill: p.ink2, lines: 3 })
  if (w.peak) {
    s.gap(24).text(`Horário nobre: ${weekdayName(w.peak.weekday)} às ${w.peak.hour}h.`, { size: 48, weight: 700, fill: p.ink, lines: 2 })
  }
  return (
    <Frame p={p} year={w.year} label={label}>
      {s.els}
      <Bars
        values={w.hours}
        base={1580}
        maxH={Math.min(400, 1580 - s.y - 120)}
        on={(i) => i >= part.from && i < part.to}
        labels={[0, 6, 12, 18].map((i) => ({ i, text: `${i}h` }))}
        p={p}
        onColor={p.ink}
      />
    </Frame>
  )
}

function Sequencia({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.forest
  const st = w.streak!
  const s = makeStack(340)
    .text('Sua maior sequência', { size: 54, weight: 700, fill: p.accent })
    .gap(20)
    .text(num(st.days), { size: 320, min: 200, weight: 800, fill: p.ink, lh: 1 })
    .gap(10)
    .text('dias seguidos', { size: 100, weight: 800, fill: p.ink })
    .gap(44)
    .text(`De ${dayMonth(keyToMs(st.from))} a ${dayMonth(keyToMs(st.to))}, ouvindo algo todo dia.`, { size: 52, fill: p.ink2, lines: 3 })
  if (w.bestDay) {
    s.at(Math.max(s.y + 110, 1220))
      .draw(64, (y) => <Divider p={p} y={y} />)
      .text('Dia recorde', { size: 44, weight: 700, fill: p.muted })
      .gap(18)
      .text(`${dayMonth(keyToMs(w.bestDay.day))}: ${longHours(w.bestDay.ms)}`, { size: 72, min: 48, weight: 800, fill: p.ink })
      .gap(28)
      .text(`Você ouviu algo em ${num(w.activeDays)} dias de ${w.year}.`, { size: 46, fill: p.ink2, lines: 2 })
  }
  return (
    <Frame p={p} year={w.year} label={label} deco={<Circle p={p} cx={W + 80} cy={560} r={420} />}>
      {s.els}
    </Frame>
  )
}

function Descoberta({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.black
  const d = w.discovery!
  const b = d.best!
  const [photo] = useImagesData([w.images.discovery])
  const s = makeStack(photo ? PHOTO.top + PHOTO.size + 60 : 380)
    .text('Sua melhor descoberta', { size: 56, weight: 700, fill: p.accent })
    .gap(photo ? 28 : 40)
    .text(b.name, { size: photo ? 140 : 170, min: 84, weight: 800, fill: p.ink, lines: photo ? 2 : 3, lh: 1.02 })
    .gap(photo ? 40 : 56)
    .text(`Primeira vez em ${dayMonth(b.first)}. Desde então, foram ${longHours(b.ms)}.`, { size: 52, fill: p.ink2, lines: 3 })
  s.at(Math.max(s.y + (photo ? 70 : 110), photo ? 1300 : 1180))
    .draw(64, (y) => <Divider p={p} y={y} />)
    .text(num(d.count), { size: photo ? 170 : 200, min: 120, weight: 800, fill: p.accent, lh: 1 })
    .gap(10)
    .text(`${d.count === 1 ? 'artista novo' : 'artistas novos'} em ${w.year}`, { size: 56, weight: 700, fill: p.ink, lines: 2 })
  return (
    <Frame p={p} year={w.year} label={label} deco={<Circle p={p} cx={-40} cy={H - 420} r={340} />}>
      {photo && <Pic id="descoberta-foto" href={photo} x={M} y={PHOTO.top} size={PHOTO.size} round ring={p.accent} />}
      {s.els}
    </Frame>
  )
}

function Podcast({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.forest
  const pc = w.topPodcast!
  const [photo] = useImagesData([pc.image])
  const s = makeStack(photo ? PHOTO.top + PHOTO.size + 60 : 380)
    .text('Seu podcast do ano', { size: 56, weight: 700, fill: p.accent })
    .gap(photo ? 28 : 40)
    .text(pc.name, { size: photo ? 140 : 170, min: 84, weight: 800, fill: p.ink, lines: photo ? 2 : 3, lh: 1.02 })
    .gap(photo ? 40 : 56)
    .text(`${capitalize(longHours(pc.ms))} e ${num(pc.itemCount)} ${pc.itemCount === 1 ? 'episódio' : 'episódios'}`, {
      size: 52,
      weight: 700,
      fill: p.ink,
      lines: 2,
    })
  if (pc.topItem) {
    s.at(Math.max(s.y + (photo ? 70 : 110), photo ? 1300 : 1160))
      .draw(64, (y) => <Divider p={p} y={y} />)
      .text('O episódio mais ouvido', { size: 44, weight: 700, fill: p.muted })
      .gap(18)
      .text(pc.topItem.name, { size: 64, min: 44, weight: 800, fill: p.ink, lines: 3 })
  }
  return (
    <Frame p={p} year={w.year} label={label} deco={<Circle p={p} cx={W - 40} cy={240} r={300} />}>
      {photo && <Pic id="podcast-foto" href={photo} x={M} y={PHOTO.top} size={PHOTO.size} round={false} ring={p.accent} />}
      {s.els}
    </Frame>
  )
}

function Resumo({ w, label }: { w: WrappedYear; label: string }) {
  const p = PAL.black
  const m = peakMonth(w)
  const s = makeStack(170)
    .text('Meu Spotify', { size: 50, weight: 700, fill: p.accent })
    .gap(12)
    .text(String(w.year), { size: 200, weight: 800, fill: p.ink, lh: 1 })
  const colW = (CW - 48) / 2
  const listTop = s.y + 80
  // Nomes longos quebram em até 2 linhas; a coluna mais alta define onde começam os números.
  const column = (x: number, names: string[]) => {
    let y = listTop + 76
    const rows = names.map((n, i) => {
      const t = textBlock(n, y, { size: 44, weight: 700, fill: p.ink, x: x + 50, width: colW - 56, lines: 2, lh: 1.1 })
      const row = (
        <g key={i}>
          <text x={x} y={y + 44 * 0.8} fontSize={44} fontWeight={800} fill={p.accent}>
            {i + 1}
          </text>
          {t.el}
        </g>
      )
      y += t.height + 26
      return row
    })
    return { rows, bottom: y }
  }
  const artists = column(
    M,
    w.topArtists.map((a) => a.name),
  )
  const songs = column(
    M + colW + 48,
    w.topSongs.map((t) => cleanTitle(t.name)),
  )
  const stats: [string, string][] = [['Minutos ouvidos', num(minutes(w))]]
  if (w.months[m] > 0) stats.push(['Mês favorito', capitalize(monthName(m))])
  if (w.part) stats.push(['Você é da', w.part.name])
  if (w.streak && w.streak.days > 1) stats.push(['Maior sequência', `${num(w.streak.days)} dias`])
  const statsTop = Math.max(artists.bottom, songs.bottom) + 110
  return (
    <Frame p={p} year={w.year} label={label}>
      {s.els}
      <g className="wa" style={{ animationDelay: '250ms' }}>
        {artists.rows.length > 0 && (
          <text x={M} y={listTop + 34} fontSize={40} fontWeight={700} fill={p.muted}>
            Artistas
          </text>
        )}
        {songs.rows.length > 0 && (
          <text x={M + colW + 48} y={listTop + 34} fontSize={40} fontWeight={700} fill={p.muted}>
            Músicas
          </text>
        )}
        {artists.rows}
        {songs.rows}
      </g>
      <g className="wa" style={{ animationDelay: '400ms' }}>
        <Divider p={p} y={statsTop - 70} />
        {stats.map(([k, v], i) => {
          const x = M + (i % 2) * (colW + 48)
          const y = statsTop + Math.floor(i / 2) * 230
          const value = textBlock(v, y + 64, { size: 84, min: 48, weight: 800, fill: i === 0 ? p.accent : p.ink, x, width: colW })
          return (
            <g key={k}>
              <text x={x} y={y + 34} fontSize={40} fontWeight={600} fill={p.muted}>
                {k}
              </text>
              {value.el}
            </g>
          )
        })}
      </g>
    </Frame>
  )
}

const CARDS: Record<CardInfo['id'], (props: { w: WrappedYear; label: string }) => ReactNode> = {
  capa: Capa,
  minutos: Minutos,
  artista: Artista,
  'top-artistas': TopArtistas,
  'top-musicas': TopMusicas,
  mes: Mes,
  horario: Horario,
  sequencia: Sequencia,
  descoberta: Descoberta,
  podcast: Podcast,
  resumo: Resumo,
}

export function WrappedCard({ card, w }: { card: CardInfo; w: WrappedYear }) {
  const C = CARDS[card.id]
  return <C w={w} label={card.alt} />
}
