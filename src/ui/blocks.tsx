import type { ReactNode } from 'react'
import type { ImageRef } from '../data/images'
import { Art, Thumb } from './Thumb'

/** Um trecho da página, com título grande e uma linha dizendo o que é. */
export function Section({
  kicker,
  title,
  note,
  children,
  className = '',
}: {
  kicker: string
  title: ReactNode
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`sec ${className}`}>
      <header className="sec-head">
        <p className="kicker">{kicker}</p>
        <h2>{title}</h2>
        {note && <p className="sec-note">{note}</p>}
      </header>
      {children}
    </section>
  )
}

/** Números grandes lado a lado, separados por linhas. */
export function StatStrip({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <dl className="stats">
      {items.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
          {s.hint && <small>{s.hint}</small>}
        </div>
      ))}
    </dl>
  )
}

export interface RankItem {
  key: number | string
  name: string
  sub?: string
  /** Valor curto, ex.: "120 h". */
  value: string
  /** Frase do nº 1, ex.: "1.234 reproduções · 18% do seu tempo". */
  detail?: string
  image?: ImageRef
  href?: string
  title?: string
}

function Name({ item, className }: { item: RankItem; className: string }) {
  return item.href ? (
    <a className={className} href={item.href}>
      {item.name}
    </a>
  ) : (
    <span className={className}>{item.name}</span>
  )
}

/** Ranking em três alturas: o nº 1 em destaque, do 2º ao 5º em cartões, o resto em lista. */
export function Podium({ items }: { items: RankItem[] }) {
  const [lead, ...others] = items
  if (!lead) return null
  const runners = others.slice(0, 4)
  const rest = others.slice(4)
  return (
    <div className="podium">
      <article className="podium-lead" title={lead.title}>
        <Art image={lead.image} label={lead.name} className="podium-lead-art" />
        <div className="podium-lead-text">
          <p className="kicker">nº 1</p>
          <Name item={lead} className="podium-lead-name" />
          {lead.sub && <p className="podium-sub">{lead.sub}</p>}
          <p className="podium-value">{lead.value}</p>
          {lead.detail && <p className="podium-detail">{lead.detail}</p>}
        </div>
      </article>
      {runners.length > 0 && (
        <ol className="podium-runners" start={2}>
          {runners.map((r, i) => (
            <li key={r.key} title={r.title}>
              <div className="podium-runner-art">
                <Art image={r.image} label={r.name} />
                <span className="badge">{i + 2}</span>
              </div>
              <Name item={r} className="podium-runner-name" />
              {r.sub && <span className="podium-runner-sub">{r.sub}</span>}
              <span className="podium-runner-value">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
      {rest.length > 0 && (
        <ol className="podium-rest" start={6}>
          {rest.map((r, i) => (
            <li key={r.key} title={r.title}>
              <span className="rank-n">{i + 6}</span>
              {r.image && <Thumb image={r.image} label={r.name} size={36} />}
              <span className="podium-rest-body">
                <Name item={r} className="rank-name" />
                {r.sub && <span className="rank-sub">{r.sub}</span>}
              </span>
              <span className="rank-val">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Grade de capas, como uma parede de discos. */
export function CoverWall({ items }: { items: RankItem[] }) {
  return (
    <ol className="wall">
      {items.map((r, i) => (
        <li key={r.key} title={r.title}>
          <div className="wall-art">
            <Art image={r.image} label={r.name} round={false} />
            <span className="badge">{i + 1}</span>
          </div>
          <Name item={r} className="wall-name" />
          {r.sub && <span className="wall-sub">{r.sub}</span>}
          <span className="wall-value">{r.value}</span>
        </li>
      ))}
    </ol>
  )
}

/** As fotos dos mais ouvidos, sobrepostas, ao lado do número grande. */
const SPOTS = [
  { left: 26, top: 14, size: 52 },
  { left: 0, top: 50, size: 34 },
  { left: 70, top: 0, size: 30 },
  { left: 72, top: 50, size: 26 },
  { left: 6, top: 6, size: 20 },
]

export function PhotoStack({ items }: { items: { key: number | string; name: string; image?: ImageRef }[] }) {
  if (items.length === 0) return null
  return (
    <div className="stack" aria-hidden>
      {items.slice(0, SPOTS.length).map((it, i) => (
        <Art
          key={it.key}
          image={it.image}
          label={it.name}
          round
          className="stack-art"
          style={{ left: `${SPOTS[i].left}%`, top: `${SPOTS[i].top}%`, width: `${SPOTS[i].size}%`, zIndex: 10 - i, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}
