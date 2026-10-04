import { createContext, useContext, type ReactNode } from 'react'
import type { TopPeriod, WrappedYear } from '../data/wrapped'
import { useImagesData, type ImageRef } from '../data/images'
import { CARD_FONT, DISPLAY_FONT, fitText } from './svgText'
import { LyraShape } from './LyraMark'
import { capitalize, minutes, monthKeyOf, peakMonth, PERIOD_TITLES, periodRange, type CardInfo } from './wrappedDeck'
import { cleanTitle, dayMonth, hue, keyToMs, longHours, monthLabel, monthName, num, pct, weekdayName } from './format'

/*
 * Cada cartão é um SVG de 1080×1920 (formato de story). O mesmo SVG aparece na tela
 * e vira PNG na hora de baixar, então tudo aqui usa atributos, não classes do CSS
 * (as classes só animam a prévia na tela).
 */
const W = 1080
const H = 1920
const M = 88
const CW = W - 2 * M
/** O Instagram cobre o topo com a barra de perfil: o conteúdo começa abaixo disso. */
const TOP = 230

interface Palette {
  bg: string
  ink: string
  ink2: string
  muted: string
  /** Títulos pequenos e números em destaque. */
  accent: string
  soft: string
  /** Formas de enfeite e rótulo do disco. */
  pop: string
}

const PAL = {
  pink: { bg: '#ff4f9a', ink: '#1a0710', ink2: '#45112c', muted: '#7c1f4f', accent: '#ffffff', soft: 'rgba(26,7,16,0.16)', pop: '#fff1a8' },
  night: { bg: '#141216', ink: '#ffffff', ink2: '#d6cfd8', muted: '#958c99', accent: '#ff5fa2', soft: 'rgba(255,255,255,0.13)', pop: '#c6f432' },
  violet: { bg: '#3a1c8c', ink: '#ffffff', ink2: '#ddd3ff', muted: '#ab9be8', accent: '#c6f432', soft: 'rgba(255,255,255,0.16)', pop: '#ff5fa2' },
  lime: { bg: '#c6f432', ink: '#121a04', ink2: '#2e3d0c', muted: '#566c18', accent: '#3a1c8c', soft: 'rgba(18,26,4,0.15)', pop: '#ff4f9a' },
  orange: { bg: '#f25a1c', ink: '#1c0a02', ink2: '#47190a', muted: '#7e3313', accent: '#ffffff', soft: 'rgba(28,10,2,0.17)', pop: '#fff1a8' },
  cream: { bg: '#f5eddf', ink: '#1a1714', ink2: '#4a433b', muted: '#8a8073', accent: '#e0306c', soft: 'rgba(26,23,20,0.12)', pop: '#3a1c8c' },
} satisfies Record<string, Palette>

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
  /** Fonte estreita dos títulos, em maiúsculas. */
  display?: boolean
  /** A mesma fonte estreita, sem passar para maiúsculas (nomes em listas). */
  condensed?: boolean
  /** Sem espaço extra para acentos (linhas de lista, que já têm folga em cima). */
  tight?: boolean
}

/** Maiúsculas com acento em cima (Á, Ê…) precisam de espaço acima da linha. */
const HIGH_ACCENT = /[ÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÄËÏÖÜÑÅ]/

const familyOf = (o: { display?: boolean; condensed?: boolean }) => (o.display || o.condensed ? DISPLAY_FONT : CARD_FONT)
const caseOf = (t: string, o: { display?: boolean }) => (o.display ? t.toLocaleUpperCase('pt-BR') : t)

/** Texto que encolhe e quebra linha para caber; `top` é o topo da primeira linha. */
function textBlock(t: string, top: number, o: TextOpts) {
  const display = !!o.display
  const family = familyOf(o)
  const text = caseOf(t, o)
  const weight = o.weight ?? (display ? 800 : o.condensed ? 700 : 400)
  const width = o.width ?? CW
  const x = o.x ?? M
  const { size, lines } = fitText(text, width, { max: o.size, min: o.min ?? o.size, weight, maxLines: o.lines ?? 1, family })
  const step = size * (o.lh ?? (display ? 0.92 : 1.16))
  const extra = display && !o.tight && HIGH_ACCENT.test(lines[0] ?? '') ? size * 0.17 : 0
  const el = (
    <text
      x={x}
      y={top + extra + size * (display ? 0.76 : 0.8)}
      fontSize={size}
      fontWeight={weight}
      fill={o.fill}
      fontFamily={family === DISPLAY_FONT ? DISPLAY_FONT : undefined}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i ? step : 0}>
          {l}
        </tspan>
      ))}
    </text>
  )
  return { el, height: extra + size * (display ? 0.8 : 1) + (lines.length - 1) * step }
}

/** Um tamanho só para uma lista de nomes (o do nome mais comprido), para as linhas ficarem iguais. */
function commonSize(texts: string[], width: number, o: { size: number; min: number; weight: number; display?: boolean; condensed?: boolean }) {
  const family = familyOf(o)
  return Math.min(o.size, ...texts.map((t) => fitText(caseOf(t, o), width, { max: o.size, min: o.min, weight: o.weight, maxLines: 1, family }).size))
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

/** Id da sombra do cartão atual (cada cartão tem a sua, já que vários SVGs dividem a página). */
const ShadowId = createContext('')

function Frame({
  uid,
  p,
  label,
  right,
  deco,
  brand = true,
  children,
}: {
  /** Prefixo único dos ids deste cartão na página. */
  uid: string
  p: Palette
  label: string
  /** Texto do canto de baixo à direita (ano ou período). */
  right?: string
  deco?: ReactNode
  brand?: boolean
  children: ReactNode
}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} fontFamily={CARD_FONT}>
      <defs>
        <filter id={`${uid}-sh`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#000" floodOpacity="0.32" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={p.bg} />
      <ShadowId.Provider value={`${uid}-sh`}>
        {deco}
        {children}
      </ShadowId.Provider>
      {brand && (
        <g>
          {/* A constelação ocupa x 10,2–22,9 e y 2,1–28,8 na caixa de 32: o pé fica na linha do texto. */}
          <g transform={`translate(${M - 10.2 * 2.4} ${H - 104 - 28.8 * 2.4}) scale(2.4)`}>
            <LyraShape color={p.ink} />
          </g>
          <text x={M + 52} y={H - 104} fontSize={48} fontWeight={800} fill={p.ink} fontFamily={DISPLAY_FONT}>
            LYRA
          </text>
        </g>
      )}
      {right && (
        <text x={W - M} y={H - 104} fontSize={48} fontWeight={700} fill={p.muted} textAnchor="end" fontFamily={DISPLAY_FONT}>
          {right.toLocaleUpperCase('pt-BR')}
        </text>
      )}
    </svg>
  )
}

const initial = (s: string) => s.trim().charAt(0).toLocaleUpperCase('pt-BR')

/**
 * Foto (círculo) ou capa (quadrado) recortada; sem imagem, a inicial num fundo colorido.
 * `id` precisa ser único na página.
 */
function Pic({
  id,
  href,
  name,
  x,
  y,
  size,
  round,
  ring,
  ringWidth = 8,
  shadow,
}: {
  id: string
  href: string | null
  name: string
  x: number
  y: number
  size: number
  round: boolean
  ring?: string
  ringWidth?: number
  shadow?: boolean
}) {
  const r = round ? size / 2 : size * 0.05
  const sh = useContext(ShadowId)
  return (
    <g filter={shadow ? `url(#${sh})` : undefined}>
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={size} height={size} rx={r} />
        </clipPath>
      </defs>
      {href ? (
        // Fotos de artista costumam ter o rosto no alto; capas são quadradas.
        <image
          href={href}
          x={x}
          y={y}
          width={size}
          height={size}
          preserveAspectRatio={round ? 'xMidYMin slice' : 'xMidYMid slice'}
          clipPath={`url(#${id})`}
        />
      ) : (
        <g clipPath={`url(#${id})`}>
          <rect x={x} y={y} width={size} height={size} fill={`hsl(${hue(name)} 45% 36%)`} />
          <text
            x={x + size / 2}
            y={y + size * 0.69}
            fontSize={size * 0.52}
            fontWeight={800}
            fill="rgba(255,255,255,0.9)"
            textAnchor="middle"
            fontFamily={DISPLAY_FONT}
          >
            {initial(name)}
          </text>
        </g>
      )}
      {ring && <rect x={x} y={y} width={size} height={size} rx={r} fill="none" stroke={ring} strokeWidth={ringWidth} />}
    </g>
  )
}

/** Um disco de vinil: sulcos, brilho, rótulo colorido e o furo no meio. */
function Disc({
  cx,
  cy,
  r,
  label,
  hole,
  spin,
  children,
}: {
  cx: number
  cy: number
  r: number
  label: string
  /** Cor do furo do meio (sem ela, o rótulo fica inteiro, para caber uma letra). */
  hole?: string
  spin?: boolean
  children?: ReactNode
}) {
  const grooves: ReactNode[] = []
  for (let k = 0.4; k < 0.97; k += 0.04) grooves.push(<circle key={k} cx={cx} cy={cy} r={r * k} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2} />)
  const wedge = (a1: number, a2: number) => {
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)]
    const p2 = [cx + r * Math.cos(a2), cy + r * Math.sin(a2)]
    return `M${cx},${cy} L${p1[0]},${p1[1]} A${r},${r} 0 0 1 ${p2[0]},${p2[1]} Z`
  }
  const sh = useContext(ShadowId)
  return (
    <g filter={`url(#${sh})`}>
      <circle cx={cx} cy={cy} r={r} fill="#111013" />
      <g className={spin ? 'wspin' : undefined}>
        {grooves}
        <path d={wedge(-1.15, -0.55)} fill="#ffffff" opacity={0.06} />
        <path d={wedge(2, 2.6)} fill="#ffffff" opacity={0.06} />
        <circle cx={cx} cy={cy} r={r * 0.34} fill={label} />
        {children}
      </g>
      {hole && <circle cx={cx} cy={cy} r={Math.max(6, r * 0.028)} fill={hole} />}
    </g>
  )
}

/** Selo de estrela, para o nº 1. */
function Burst({ cx, cy, r, fill, ink, text }: { cx: number; cy: number; r: number; fill: string; ink: string; text: string }) {
  const n = 14
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.84 : r
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return (
    <g>
      <polygon points={pts.join(' ')} fill={fill} />
      <text x={cx} y={cy + r * 0.27} fontSize={r * 0.78} fontWeight={800} fill={ink} textAnchor="middle" fontFamily={DISPLAY_FONT}>
        {text}
      </text>
    </g>
  )
}

/** Foto ocupando o topo do cartão de ponta a ponta, sumindo no fundo. */
function HeroPhoto({ uid, href, height, p, top = 'xMidYMin' }: { uid: string; href: string; height: number; p: Palette; top?: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.2" stopColor={p.bg} stopOpacity="0" />
          <stop offset="0.55" stopColor={p.bg} stopOpacity="0" />
          <stop offset="1" stopColor={p.bg} stopOpacity="1" />
        </linearGradient>
      </defs>
      <image href={href} x={0} y={0} width={W} height={height} preserveAspectRatio={`${top} slice`} />
      <rect x={0} y={0} width={W} height={height + 1} fill={`url(#${uid}-fade)`} />
    </g>
  )
}

const Divider = ({ p, y }: { p: Palette; y: number }) => <rect x={M} y={y} width={CW} height={4} rx={2} fill={p.soft} />

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
  const bw = slot * 0.7
  return (
    <g>
      {values.map((v, i) => {
        const h = Math.max(8, (v / max) * maxH)
        return (
          <rect
            key={i}
            className="wbar"
            style={{ animationDelay: `${200 + i * 25}ms` }}
            x={M + i * slot + (slot - bw) / 2}
            y={base - h}
            width={bw}
            height={h}
            rx={Math.min(12, bw / 2.5)}
            fill={on(i) ? onColor : p.soft}
          />
        )
      })}
      {labels.map((l) => (
        <text key={l.i} x={M + l.i * slot + slot / 2} y={base + 66} fontSize={44} fontWeight={700} fill={p.muted} textAnchor="middle" fontFamily={DISPLAY_FONT}>
          {l.text}
        </text>
      ))}
      {valueLabel && (
        <text
          x={M + valueLabel.i * slot + slot / 2}
          y={base - (values[valueLabel.i] / max) * maxH - 26}
          fontSize={60}
          fontWeight={800}
          fill={onColor}
          textAnchor="middle"
          fontFamily={DISPLAY_FONT}
        >
          {valueLabel.text}
        </text>
      )}
    </g>
  )
}

/* ---------- Cartões do ano ---------- */

interface CardProps {
  w: WrappedYear
  label: string
}

function Capa({ w, label }: CardProps) {
  const p = PAL.pink
  const endsEarly = new Date(w.to).getMonth() < 11
  const s = makeStack(TOP + 20)
    .text('Lyra', { size: 68, display: true, fill: p.accent })
    .gap(36)
    .text(String(w.year), { size: 430, min: 260, display: true, fill: p.ink, lh: 0.85 })
    .gap(56)
    .text(endsEarly ? 'Seu ano até aqui' : 'Seu ano em música', { size: 130, min: 84, display: true, fill: p.ink, lines: 2, width: 600 })
  if (w.partial) s.gap(30).text(`De ${dayMonth(w.from)} a ${dayMonth(w.to)}`, { size: 46, weight: 600, fill: p.ink2, width: 600 })
  const r = 430
  const cy = Math.min(1400, Math.max(1360, s.y + 60 + r))
  const deco = (
    <g className="wa" style={{ animationDelay: '300ms' }}>
      <circle cx={W - 40} cy={TOP + 40} r={150} fill={p.pop} opacity={0.9} />
      <Disc cx={900} cy={cy} r={r} label={p.pop} hole={p.bg} spin>
        <text x={900} y={cy - 46} fontSize={36} fontWeight={700} fill={p.muted} textAnchor="middle" fontFamily={DISPLAY_FONT}>
          LADO A
        </text>
        <text x={900} y={cy + 76} fontSize={92} fontWeight={800} fill={p.ink} textAnchor="middle" fontFamily={DISPLAY_FONT}>
          {w.year}
        </text>
      </Disc>
    </g>
  )
  return (
    <Frame uid="capa" p={p} label={label} brand={false}>
      {deco}
      {s.els}
    </Frame>
  )
}

function Minutos({ w, label }: CardProps) {
  const p = PAL.night
  const days = Math.round(w.totalMs / 86.4e6)
  const s = makeStack(TOP + 190)
    .text(`Em ${w.year}, você ouviu`, { size: 72, display: true, fill: p.accent, lines: 2 })
    .gap(30)
    .text(num(minutes(w)), { size: 340, min: 170, display: true, fill: p.ink, lh: 0.85 })
    .gap(18)
    .text('minutos', { size: 170, display: true, fill: p.pop })
    .gap(80)
    .text(days >= 1 ? `São ${longHours(w.totalMs)}, ou ${num(days)} ${days === 1 ? 'dia' : 'dias'} sem parar.` : `São ${longHours(w.totalMs)}.`, {
      size: 52,
      fill: p.ink2,
      lines: 3,
    })
  if (w.previousYearMs && !w.partial) {
    const r = w.totalMs / w.previousYearMs - 1
    const cmp =
      Math.abs(r) < 0.03 ? `Quase o mesmo que em ${w.year - 1}.` : `${pct(Math.abs(r))} a ${r > 0 ? 'mais' : 'menos'} que em ${w.year - 1}.`
    s.gap(34).text(cmp, { size: 52, weight: 700, fill: p.accent, lines: 2 })
  }
  if (w.podcastMs >= 60_000) s.gap(34).text(`Contando ${longHours(w.podcastMs)} de podcasts.`, { size: 46, fill: p.muted, lines: 2 })
  const rings = [170, 290, 410, 530, 650]
  const deco = (
    <g>
      {rings.map((r, i) => (
        <circle key={r} cx={W - 30} cy={TOP - 40} r={r} fill="none" stroke={i % 2 ? p.accent : p.pop} strokeWidth={10} opacity={0.5 - i * 0.08} />
      ))}
    </g>
  )
  return (
    <Frame uid="minutos" p={p} label={label} right={String(w.year)} deco={deco}>
      {s.els}
    </Frame>
  )
}

/** Cartão de destaque com foto de ponta a ponta (artista, descoberta, podcast). */
function Spotlight({
  p,
  label,
  year,
  uid,
  photo,
  name,
  square,
  kicker,
  children,
}: {
  p: Palette
  label: string
  year: number
  uid: string
  photo: string | null
  name: string
  /** Capa quadrada (podcast): centraliza em vez de puxar para o alto. */
  square?: boolean
  kicker: string
  children: (s: ReturnType<typeof makeStack>) => void
}) {
  const heroH = 1060
  // Nome grande, mas sem empurrar o fim do cartão para cima da marca: encolhe até caber.
  const build = (nameMax: number) => {
    const st = makeStack(photo ? 830 : 860)
      .text(kicker, { size: 64, display: true, fill: p.accent })
      .gap(22)
      .text(name, { size: nameMax, min: Math.min(96, nameMax), display: true, fill: p.ink, lines: 2 })
      .gap(40)
    children(st)
    return st
  }
  let s = build(200)
  for (const max of [160, 130, 110]) {
    if (s.y <= 1712) break
    s = build(max)
  }
  const deco = photo ? (
    <HeroPhoto uid={uid} href={photo} height={heroH} p={p} top={square ? 'xMidYMid' : 'xMidYMin'} />
  ) : (
    <g className="wa">
      <circle cx={W - 80} cy={TOP + 10} r={170} fill={p.pop} />
      <Disc cx={W / 2} cy={520} r={300} label={p.pop} spin>
        <text x={W / 2} y={520 + 52} fontSize={145} fontWeight={800} fill={p.bg} textAnchor="middle" fontFamily={DISPLAY_FONT}>
          {initial(name)}
        </text>
      </Disc>
    </g>
  )
  return (
    <Frame uid={uid} p={p} label={label} right={String(year)}>
      {deco}
      {s.els}
    </Frame>
  )
}

function Artista({ w, label }: CardProps) {
  const p = PAL.violet
  const a = w.topArtist!
  const [photo, cover] = useImagesData([a.image, a.topItem?.image], true)
  return (
    <Spotlight p={p} label={label} year={w.year} uid="artista" photo={photo} name={a.name} kicker="Seu artista do ano">
      {(s) => {
        s.text(`${capitalize(longHours(a.ms))} e ${num(a.plays)} reproduções`, { size: 52, weight: 700, fill: p.ink, lines: 2 })
        // No primeiro ano do export, "desde quando" é só o começo dos dados.
        if (a.since !== null && !w.firstYear) {
          const sinceYear = new Date(a.since).getFullYear()
          s.gap(14).text(sinceYear < w.year ? `Você ouve desde ${sinceYear}.` : `Você conheceu em ${dayMonth(a.since)}.`, {
            size: 46,
            fill: p.ink2,
            lines: 2,
          })
        }
        if (a.topItem) {
          const size = 170
          s.at(Math.max(s.y + 56, 1500))
          const top = s.y
          const tx = M + size + 36
          const width = W - M - tx
          s.draw(0, (y) => <Pic id="artista-capa" href={cover} name={a.topItem!.name} x={M} y={y} size={size} round={false} shadow />)
          s.text('A preferida', { size: 46, display: true, fill: p.accent, x: tx, width })
            .gap(14)
            .text(cleanTitle(a.topItem.name), { size: 70, min: 46, display: true, fill: p.ink, x: tx, width })
            .gap(12)
            .text(`tocou ${num(a.topItem.plays)} ${a.topItem.plays === 1 ? 'vez' : 'vezes'}`, { size: 42, fill: p.ink2, x: tx, width })
          s.at(Math.max(s.y, top + size))
        }
      }}
    </Spotlight>
  )
}

/** Linhas do 2º ao 5º: número, imagem, nome e uma linha de detalhe. */
function Rows({
  rows,
  top,
  p,
  uid,
  round,
  step = 150,
}: {
  rows: { name: string; sub: string; image: string | null }[]
  top: number
  p: Palette
  uid: string
  round: boolean
  step?: number
}) {
  const pic = 116
  const x = M + 96 + pic + 34
  const width = W - M - x
  const size = commonSize(
    rows.map((r) => r.name),
    width,
    { size: 66, min: 50, weight: 800, display: true },
  )
  return (
    <>
      {rows.map((r, i) => {
        const y = top + i * step
        const name = textBlock(r.name, y + 14, { size, display: true, tight: true, fill: p.ink, x, width })
        const sub = textBlock(r.sub, y + 12 + name.height + 16, { size: 40, fill: p.muted, x, width })
        return (
          <g key={i} className="wa" style={{ animationDelay: `${300 + i * 100}ms` }}>
            <text x={M} y={y + 92} fontSize={104} fontWeight={800} fill={p.accent} fontFamily={DISPLAY_FONT}>
              {i + 2}
            </text>
            <Pic id={`${uid}-${i}`} href={r.image} name={r.name} x={M + 96} y={y} size={pic} round={round} />
            {name.el}
            {sub.el}
          </g>
        )
      })}
    </>
  )
}

/** O nº 1 em destaque: imagem grande à esquerda e o texto centralizado na altura dela. */
function Lead({
  top,
  size,
  textX,
  children,
  art,
}: {
  top: number
  size: number
  textX: number
  art: ReactNode
  children: (s: ReturnType<typeof makeStack>, x: number, width: number) => void
}) {
  const s = makeStack(0)
  children(s, textX, W - M - textX)
  return (
    <g>
      <g className="wa" style={{ animationDelay: '200ms' }}>
        {art}
      </g>
      <g transform={`translate(0 ${top + Math.max(0, (size - s.y) / 2)})`}>{s.els}</g>
    </g>
  )
}

function TopArtistas({ w, label }: CardProps) {
  const p = PAL.cream
  // Só a imagem grande vem em alta resolução; as miniaturas usam a de sempre.
  const [big] = useImagesData(w.images.artists.slice(0, 1), true)
  const images = useImagesData(w.images.artists)
  const [lead, ...rest] = w.topArtists
  const s = makeStack(TOP)
    .text(`Top ${w.topArtists.length} de ${w.year}`, { size: 60, display: true, fill: p.accent })
    .gap(16)
    .text('Seus artistas', { size: 180, min: 110, display: true, fill: p.ink })
  const top = s.y + 70
  const size = 420
  return (
    <Frame uid="top-artistas" p={p} label={label} right={String(w.year)}>
      {s.els}
      <Lead
        top={top}
        size={size}
        textX={M + size + 48}
        art={
          <>
            <Pic id="top-artistas-lead" href={big ?? images[0]} name={lead.name} x={M} y={top} size={size} round shadow />
            <Burst cx={M + 46} cy={top + 46} r={70} fill={p.accent} ink="#ffffff" text="1" />
          </>
        }
      >
        {(t, x, width) =>
          t
            .text(lead.name, { size: 110, min: 60, display: true, fill: p.ink, lines: 3, x, width })
            .gap(20)
            .text(capitalize(longHours(lead.ms)), { size: 48, weight: 700, fill: p.ink2, x, width })
            .gap(8)
            .text(`${num(lead.plays)} reproduções`, { size: 42, fill: p.muted, x, width })
        }
      </Lead>
      <Rows
        rows={rest.map((a, i) => ({ name: a.name, sub: longHours(a.ms), image: images[i + 1] }))}
        top={top + size + 80}
        p={p}
        uid="top-artistas"
        round
        step={165}
      />
    </Frame>
  )
}

function TopMusicas({ w, label }: CardProps) {
  const p = PAL.orange
  const [big] = useImagesData(w.images.songs.slice(0, 1), true)
  const images = useImagesData(w.images.songs)
  const [lead, ...rest] = w.topSongs
  const s = makeStack(TOP)
    .text(`Top ${w.topSongs.length} de ${w.year}`, { size: 60, display: true, fill: p.accent })
    .gap(16)
    .text('Suas músicas', { size: 180, min: 110, display: true, fill: p.ink })
  const top = s.y + 70
  const size = 380
  const r = 172
  return (
    <Frame uid="top-musicas" p={p} label={label} right={String(w.year)}>
      {s.els}
      <Lead
        top={top}
        size={size}
        textX={M + size + 170}
        art={
          <>
            <Disc cx={M + size - r + 150} cy={top + size / 2} r={r} label={p.pop} hole={p.bg} spin />
            <g transform={`rotate(-4 ${M + size / 2} ${top + size / 2})`}>
              <Pic id="top-musicas-lead" href={big ?? images[0]} name={lead.name} x={M} y={top} size={size} round={false} shadow />
            </g>
          </>
        }
      >
        {(t, x, width) =>
          t
            .text('nº 1', { size: 50, display: true, fill: p.accent, x, width })
            .gap(12)
            .text(cleanTitle(lead.name), { size: 96, min: 54, display: true, fill: p.ink, lines: 3, x, width })
            .gap(18)
            .text(lead.sub, { size: 44, weight: 700, fill: p.ink2, lines: 2, x, width })
            .gap(8)
            .text(`${num(lead.plays)} ${lead.plays === 1 ? 'vez' : 'vezes'}`, { size: 40, fill: p.muted, x, width })
        }
      </Lead>
      <Rows
        rows={rest.map((t, i) => ({ name: cleanTitle(t.name), sub: `${t.sub} · ${num(t.plays)} ${t.plays === 1 ? 'vez' : 'vezes'}`, image: images[i + 1] }))}
        top={top + size + 80}
        p={p}
        uid="top-musicas"
        round={false}
        step={165}
      />
    </Frame>
  )
}

const INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function Mes({ w, label }: CardProps) {
  const p = PAL.lime
  const m = peakMonth(w)
  const ms = w.months[m] * 3.6e6
  const days = new Date(w.year, m + 1, 0).getDate()
  const s = makeStack(TOP + 60)
    .text(`Seu mês de ${w.year}`, { size: 68, display: true, fill: p.accent })
    .gap(24)
    .text(monthName(m), { size: 250, min: 140, display: true, fill: p.ink })
    .gap(48)
    .text(`${capitalize(longHours(ms))} no mês, ou ${longHours(ms / days)} por dia.`, { size: 52, fill: p.ink2, lines: 3 })
  return (
    <Frame uid="mes" p={p} label={label} right={String(w.year)} deco={<circle cx={W - 30} cy={TOP + 60} r={190} fill={p.pop} />}>
      {s.els}
      <Bars
        values={w.months}
        base={1600}
        maxH={Math.min(640, 1600 - s.y - 170)}
        on={(i) => i === m}
        labels={INITIALS.map((text, i) => ({ i, text }))}
        p={p}
        onColor={p.accent}
        valueLabel={{ i: m, text: `${num(w.months[m])} h` }}
      />
    </Frame>
  )
}

/** As 24 horas em volta de um relógio, com as horas da sua parte do dia acesas. */
function Clock({ hours, from, to, cx, cy, R, p }: { hours: number[]; from: number; to: number; cx: number; cy: number; R: number; p: Palette }) {
  const max = Math.max(...hours, 1e-9)
  const inner = R * 0.42
  const span = R - inner - 70
  return (
    <g>
      {hours.map((v, h) => {
        const a = (h / 24) * Math.PI * 2 - Math.PI / 2
        const len = Math.max(10, (v / max) * span)
        const on = h >= from && h < to
        return (
          <line
            key={h}
            className="wa"
            style={{ animationDelay: `${200 + h * 20}ms` }}
            x1={cx + inner * Math.cos(a)}
            y1={cy + inner * Math.sin(a)}
            x2={cx + (inner + len) * Math.cos(a)}
            y2={cy + (inner + len) * Math.sin(a)}
            stroke={on ? p.pop : p.soft}
            strokeWidth={R * 0.075}
            strokeLinecap="round"
          />
        )
      })}
      {[0, 6, 12, 18].map((h) => {
        const a = (h / 24) * Math.PI * 2 - Math.PI / 2
        return (
          <text
            key={h}
            x={cx + (R - 26) * Math.cos(a)}
            y={cy + (R - 26) * Math.sin(a) + 16}
            fontSize={44}
            fontWeight={700}
            fill={p.muted}
            textAnchor="middle"
            fontFamily={DISPLAY_FONT}
          >
            {h}H
          </text>
        )
      })}
      <circle cx={cx} cy={cy} r={inner - 24} fill={p.accent} />
    </g>
  )
}

function Horario({ w, label }: CardProps) {
  const p = PAL.night
  const part = w.part!
  const s = makeStack(TOP + 20)
    .text('Seu horário', { size: 64, display: true, fill: p.accent })
    .gap(20)
    .text(`Você é da ${part.name.toLowerCase()}`, { size: 170, min: 100, display: true, fill: p.ink, lines: 2 })
    .gap(40)
    .text(`${pct(part.share)} do que você ouviu tocou entre ${part.from}h e ${part.to}h.`, { size: 50, fill: p.ink2, lines: 2 })
  if (w.peak) s.gap(16).text(`Horário nobre: ${weekdayName(w.peak.weekday)} às ${w.peak.hour}h.`, { size: 46, weight: 700, fill: p.pop, lines: 2 })
  const room = 1730 - (s.y + 50)
  const R = Math.min(400, room / 2)
  const cy = s.y + 50 + R
  return (
    <Frame uid="horario" p={p} label={label} right={String(w.year)}>
      {s.els}
      <Clock hours={w.hours} from={part.from} to={part.to} cx={W / 2} cy={cy} R={R} p={p} />
      {w.peak && (
        <text x={W / 2} y={cy + R * 0.12} fontSize={R * 0.34} fontWeight={800} fill={p.bg} textAnchor="middle" fontFamily={DISPLAY_FONT}>
          {w.peak.hour}H
        </text>
      )}
    </Frame>
  )
}

function Sequencia({ w, label }: CardProps) {
  const p = PAL.pink
  const st = w.streak!
  const s = makeStack(TOP + 40)
    .text('Sua maior sequência', { size: 68, display: true, fill: p.accent })
    .gap(26)
    .text(num(st.days), { size: 400, min: 220, display: true, fill: p.ink, lh: 0.85 })
    .gap(20)
    .text('dias seguidos', { size: 150, min: 100, display: true, fill: p.ink })
    .gap(50)
    .text(`De ${dayMonth(keyToMs(st.from))} a ${dayMonth(keyToMs(st.to))}, ouvindo algo todo dia.`, { size: 52, fill: p.ink2, lines: 3 })
  // Uma bolinha por dia da sequência (o que não couber vira "+N" na última).
  const cols = 15
  const cell = CW / cols
  const dotsTop = s.y + 60
  const rowsFit = Math.max(0, Math.floor(((w.bestDay ? 1290 : 1700) - dotsTop) / cell))
  const shown = Math.min(st.days, rowsFit * cols)
  const more = st.days - shown
  const dots = Array.from({ length: shown }, (_, i) => {
    const x = M + ((i % cols) + 0.5) * cell
    const y = dotsTop + (Math.floor(i / cols) + 0.5) * cell
    const last = more > 0 && i === shown - 1
    return (
      <g key={i} className="wa" style={{ animationDelay: `${300 + i * 12}ms` }}>
        <circle cx={x} cy={y} r={cell * 0.36} fill={last ? p.accent : p.ink} />
        {last && (
          <text x={x} y={y + cell * 0.13} fontSize={cell * 0.36} fontWeight={800} fill={p.ink} textAnchor="middle" fontFamily={DISPLAY_FONT}>
            +{num(more + 1)}
          </text>
        )}
      </g>
    )
  })
  if (w.bestDay) {
    s.at(Math.max(s.y + 90, 1330))
      .draw(70, (y) => <Divider p={p} y={y} />)
      .text('Dia recorde', { size: 52, display: true, fill: p.accent })
      .gap(18)
      .text(`${dayMonth(keyToMs(w.bestDay.day))}: ${longHours(w.bestDay.ms)}`, { size: 96, min: 60, display: true, fill: p.ink })
      .gap(26)
      .text(`Você ouviu algo em ${num(w.activeDays)} dias de ${w.year}.`, { size: 46, fill: p.ink2, lines: 2 })
  }
  const deco = (
    <g>
      <circle cx={W + 60} cy={720} r={360} fill={p.pop} opacity={0.85} />
      <circle cx={W + 60} cy={720} r={250} fill="none" stroke={p.ink} strokeWidth={6} opacity={0.15} />
    </g>
  )
  return (
    <Frame uid="sequencia" p={p} label={label} right={String(w.year)} deco={deco}>
      {s.els}
      {dots}
    </Frame>
  )
}

function Descoberta({ w, label }: CardProps) {
  const p = PAL.violet
  const d = w.discovery!
  const b = d.best!
  const [photo] = useImagesData([w.images.discovery], true)
  return (
    <Spotlight p={p} label={label} year={w.year} uid="descoberta" photo={photo} name={b.name} kicker="Sua melhor descoberta">
      {(s) => {
        s.text(`Primeira vez em ${dayMonth(b.first)}. Desde então, foram ${longHours(b.ms)}.`, { size: 50, fill: p.ink2, lines: 3 })
        s.at(Math.max(s.y + 70, 1470))
          .draw(60, (y) => <Divider p={p} y={y} />)
          .text(`${num(d.count)} ${d.count === 1 ? 'artista novo' : 'artistas novos'} em ${w.year}`, {
            size: 96,
            min: 56,
            display: true,
            fill: p.accent,
            lines: 2,
          })
      }}
    </Spotlight>
  )
}

function Podcast({ w, label }: CardProps) {
  const p = PAL.cream
  const pc = w.topPodcast!
  const [photo] = useImagesData([pc.image], true)
  return (
    <Spotlight p={p} label={label} year={w.year} uid="podcast" photo={photo} name={pc.name} square kicker="Seu podcast do ano">
      {(s) => {
        s.text(`${capitalize(longHours(pc.ms))} e ${num(pc.itemCount)} ${pc.itemCount === 1 ? 'episódio' : 'episódios'}`, {
          size: 52,
          weight: 700,
          fill: p.ink,
          lines: 2,
        })
        if (pc.topItem) {
          s.at(Math.max(s.y + 70, 1450))
            .draw(60, (y) => <Divider p={p} y={y} />)
            .text('O episódio mais ouvido', { size: 50, display: true, fill: p.accent })
            .gap(16)
            .text(pc.topItem.name, { size: 56, min: 40, weight: 700, fill: p.ink, lines: 2 })
        }
      }}
    </Spotlight>
  )
}

/** Duas colunas numeradas (artistas e músicas), com miniaturas. */
function TwoLists({
  top,
  p,
  uid,
  left,
  right,
  rowH = 104,
}: {
  top: number
  p: Palette
  uid: string
  left: { title: string; round: boolean; rows: { name: string; sub?: string; image: string | null }[] }
  right: { title: string; round: boolean; rows: { name: string; sub?: string; image: string | null }[] }
  rowH?: number
}) {
  const gap = 44
  const colW = (CW - gap) / 2
  const pic = 78
  const tx = 52 + pic + 20
  const width = colW - tx
  const col = (x: number, c: typeof left, side: string) => {
    const size = commonSize(
      c.rows.map((r) => r.name),
      width,
      { size: 50, min: 40, weight: 700, condensed: true },
    )
    return (
    <g>
      {textBlock(c.title, top, { size: 50, display: true, tight: true, fill: p.muted, x, width: colW }).el}
      {c.rows.map((r, i) => {
        const y = top + 76 + i * rowH
        return (
          <g key={i}>
            <text x={x} y={y + 58} fontSize={60} fontWeight={800} fill={p.accent} fontFamily={DISPLAY_FONT}>
              {i + 1}
            </text>
            <Pic id={`${uid}-${side}-${i}`} href={r.image} name={r.name} x={x + 52} y={y} size={pic} round={c.round} />
            {textBlock(r.name, y + (r.sub ? 0 : 16), { size, condensed: true, fill: p.ink, x: x + tx, width }).el}
            {r.sub && textBlock(r.sub, y + 50, { size: 31, fill: p.muted, x: x + tx, width }).el}
          </g>
        )
      })}
    </g>
    )
  }
  return (
    <g className="wa" style={{ animationDelay: '300ms' }}>
      {col(M, left, 'a')}
      {col(M + colW + gap, right, 'b')}
    </g>
  )
}

function Resumo({ w, label }: CardProps) {
  const p = PAL.night
  const m = peakMonth(w)
  const [big] = useImagesData(w.images.artists.slice(0, 1), true)
  const artists = useImagesData(w.images.artists)
  const songs = useImagesData(w.images.songs)
  const lead = w.topArtists[0]
  const size = 440
  const tx = M + size + 44
  const head = makeStack(TOP + 20)
    .text('Lyra', { size: 60, display: true, fill: p.accent, x: tx, width: W - M - tx })
    .gap(20)
    .text(String(w.year), { size: 250, min: 150, display: true, fill: p.ink, x: tx, width: W - M - tx, lh: 0.85 })
  if (lead) head.gap(30).text(`Artista do ano: ${lead.name}`, { size: 40, weight: 700, fill: p.ink2, x: tx, width: W - M - tx, lines: 3 })
  const listTop = TOP + 20 + size + 80
  const stats: [string, string][] = [['Minutos ouvidos', num(minutes(w))]]
  if (w.months[m] > 0) stats.push(['Mês favorito', monthName(m)])
  if (w.part) stats.push(['Você é da', w.part.name])
  if (w.streak && w.streak.days > 1) stats.push(['Maior sequência', `${num(w.streak.days)} dias`])
  const statsTop = listTop + 76 + 5 * 104 + 60
  const colW = (CW - 44) / 2
  return (
    <Frame uid="resumo" p={p} label={label} right={String(w.year)}>
      {lead && (
        <g className="wa">
          <g transform={`rotate(-3 ${M + size / 2} ${TOP + 20 + size / 2})`}>
            <Pic id="resumo-foto" href={big ?? artists[0]} name={lead.name} x={M} y={TOP + 20} size={size} round={false} ring={p.ink} ringWidth={14} shadow />
          </g>
        </g>
      )}
      {head.els}
      <TwoLists
        top={listTop}
        p={p}
        uid="resumo"
        left={{ title: 'Artistas', round: true, rows: w.topArtists.map((a, i) => ({ name: a.name, image: artists[i] })) }}
        right={{ title: 'Músicas', round: false, rows: w.topSongs.map((t, i) => ({ name: cleanTitle(t.name), sub: t.sub, image: songs[i] })) }}
      />
      <g className="wa" style={{ animationDelay: '450ms' }}>
        <Divider p={p} y={statsTop - 36} />
        {stats.map(([k, v], i) => {
          const x = M + (i % 2) * (colW + 44)
          const y = statsTop + Math.floor(i / 2) * 170
          return (
            <g key={k}>
              {textBlock(k, y, { size: 40, display: true, weight: 700, fill: p.muted, x, width: colW }).el}
              {textBlock(v, y + 50, { size: 90, min: 54, display: true, fill: i === 0 ? p.pop : p.ink, x, width: colW }).el}
            </g>
          )
        })}
      </g>
    </Frame>
  )
}

const CARDS: Record<CardInfo['id'], (props: CardProps) => ReactNode> = {
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

/* ---------- Top 5 do mês, do ano e de sempre ---------- */

const PERIOD_PAL: Record<TopPeriod['id'], Palette> = { mes: PAL.pink, ano: PAL.orange, sempre: PAL.violet }

export function TopCard({ t, label }: { t: TopPeriod; label: string }) {
  const p = PERIOD_PAL[t.id]
  const title = PERIOD_TITLES[t.id]
  const [bigArtist, bigSong] = useImagesData([t.images.artists[0], t.images.songs[0]], true)
  const artists = useImagesData(t.images.artists)
  const songs = useImagesData(t.images.songs)
  const s = makeStack(TOP)
    .text('Meu Top 5', { size: 64, display: true, fill: p.accent })
    .gap(18)
    .text(title, { size: 220, min: 130, display: true, fill: p.ink })
    .gap(30)
    .text(`${capitalize(periodRange(t))} · ${longHours(t.totalMs)} de música`, { size: 44, min: 32, weight: 600, fill: p.ink2 })

  // Capa da música nº 1 com o disco saindo, e a foto do artista nº 1 por cima, no canto.
  const top = s.y + 60
  const cover = 400
  // O conjunto (foto, capa e disco) vai de cx - 130 a cx + 550: centralizado no cartão.
  const cx = W / 2 - 210
  const r = 186
  const song = t.songs[0]
  const artist = t.artists[0]
  const photo = 270
  const listTop = top + cover + 110
  const years = `${new Date(t.from).getFullYear()}–${new Date(t.to).getFullYear()}`
  return (
    <Frame uid={`top-${t.id}`} p={p} label={label} right={t.id === 'mes' ? monthLabel(monthKeyOf(t.to)) : years}>
      {s.els}
      <g className="wa" style={{ animationDelay: '250ms' }}>
        {song && (
          <>
            <Disc cx={cx + cover - r + 150} cy={top + cover / 2} r={r} label={p.pop} hole={p.bg} spin />
            <g transform={`rotate(-4 ${cx + cover / 2} ${top + cover / 2})`}>
              <Pic id={`top-${t.id}-song`} href={bigSong ?? songs[0]} name={song.name} x={cx} y={top} size={cover} round={false} shadow />
            </g>
          </>
        )}
        {artist && (
          <Pic id={`top-${t.id}-artist`} href={bigArtist ?? artists[0]} name={artist.name} x={cx - 130} y={top + cover - photo + 70} size={photo} round ring={p.bg} ringWidth={14} shadow />
        )}
        <Burst cx={cx + cover - 10} cy={top + 76} r={80} fill={p.pop} ink={p.ink} text="Nº1" />
      </g>
      <TwoLists
        top={listTop}
        p={p}
        uid={`top-${t.id}`}
        left={{ title: 'Artistas', round: true, rows: t.artists.map((a, i) => ({ name: a.name, sub: longHours(a.ms), image: artists[i] })) }}
        right={{ title: 'Músicas', round: false, rows: t.songs.map((x, i) => ({ name: cleanTitle(x.name), sub: x.sub, image: songs[i] })) }}
      />
    </Frame>
  )
}

/* ---------- Seu dia, nos outros anos ---------- */

export interface DayRow {
  year: number
  song: string
  songImage: ImageRef | null
  artist: string
  artistImage: ImageRef | null
  /** Foto redonda para artista; imagem quadrada para podcast. */
  round: boolean
}

/** "Meu 4 de outubro": a música e o artista que mais tocaram nesta data, um ano por linha. */
export function DayCard({ date, rows, heads, label }: { date: string; rows: DayRow[]; heads: [string, string]; label: string }) {
  const p = PAL.violet
  const songs = useImagesData(rows.map((r) => r.songImage))
  const artists = useImagesData(rows.map((r) => r.artistImage))
  // Com muitos anos, a data fica numa linha só para sobrar espaço para a lista.
  const few = rows.length <= 5
  const s = makeStack(TOP)
    .text('Meu', { size: 64, display: true, fill: p.accent })
    .gap(18)
    .text(date, few ? { size: 220, min: 130, display: true, fill: p.ink, lines: 2 } : { size: 180, min: 100, display: true, fill: p.ink })
  // A lista (títulos das colunas + linhas) fica entre a data e a marca LYRA do rodapé;
  // com poucos anos, o conjunto fica centralizado nesse espaço.
  const from = s.y + 80
  const space = H - 210 - from
  const rowH = Math.min(170, Math.floor((space - 84) / Math.max(1, rows.length)))
  const head = from + Math.max(0, (space - 84 - rowH * rows.length) / 2)
  const top = head + 84
  const pic = Math.round(rowH * 0.64)
  const yearW = 150
  const gap = 36
  // Nomes de música costumam ser mais compridos que os de artista: a coluna deles é mais larga.
  const songW = Math.round((CW - yearW - gap) * 0.52)
  const artistW = CW - yearW - gap - songW
  const tx = pic + 22
  // Um tamanho só para as duas colunas, para as linhas ficarem iguais.
  const opts = { size: Math.min(50, Math.round(rowH * 0.38)), min: 30, weight: 700, condensed: true }
  const nameSize = Math.min(commonSize(rows.map((r) => r.song), songW - tx, opts), commonSize(rows.map((r) => r.artist), artistW - tx, opts))
  const yearSize = Math.min(72, Math.round(rowH * 0.52))
  const x1 = M + yearW
  const x2 = x1 + songW + gap
  const last = rows[rows.length - 1]
  const range = rows.length > 1 ? `${last.year}–${rows[0].year}` : String(rows[0]?.year ?? '')
  return (
    <Frame uid="dia" p={p} label={label} right={range}>
      {s.els}
      <g className="wa" style={{ animationDelay: '250ms' }}>
        {textBlock(heads[0], head, { size: 46, display: true, tight: true, fill: p.muted, x: x1, width: songW }).el}
        {textBlock(heads[1], head, { size: 46, display: true, tight: true, fill: p.muted, x: x2, width: artistW }).el}
      </g>
      {rows.map((r, i) => {
        const y = top + i * rowH
        return (
          <g key={r.year} className="wa" style={{ animationDelay: `${300 + i * 70}ms` }}>
            <text x={M} y={y + pic / 2 + yearSize * 0.36} fontSize={yearSize} fontWeight={800} fill={p.accent} fontFamily={DISPLAY_FONT}>
              {r.year}
            </text>
            <Pic id={`dia-s-${i}`} href={songs[i]} name={r.song} x={x1} y={y} size={pic} round={false} />
            {textBlock(r.song, y + (pic - nameSize) / 2, { size: nameSize, condensed: true, fill: p.ink, x: x1 + tx, width: songW - tx }).el}
            <Pic id={`dia-a-${i}`} href={artists[i]} name={r.artist} x={x2} y={y} size={pic} round={r.round} />
            {textBlock(r.artist, y + (pic - nameSize) / 2, { size: nameSize, condensed: true, fill: p.ink2, x: x2 + tx, width: artistW - tx }).el}
          </g>
        )
      })}
    </Frame>
  )
}
