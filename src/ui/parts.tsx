import type { ReactNode } from 'react'

export function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {hint && <span className="tile-hint">{hint}</span>}
    </div>
  )
}

export interface BarRow {
  key: string | number
  name: string
  sub?: string
  /** Valor já formatado, mostrado à direita. */
  value: string
  /** Comprimento da barra, de 0 a 1. */
  share: number
  title?: string
}

/** Lista com barras horizontais; `numbered` mostra a posição no ranking. */
export function BarList({ title, note, rows, numbered = true }: { title: string; note?: ReactNode; rows: BarRow[]; numbered?: boolean }) {
  return (
    <section className="card">
      <header>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </header>
      <ol className={`rank ${numbered ? '' : 'plain'}`}>
        {rows.map((r, i) => (
          <li key={r.key} title={r.title}>
            {numbered && <span className="rank-n">{i + 1}</span>}
            <div className="rank-body">
              <div className="rank-line">
                <span className="rank-name">{r.name}</span>
                <span className="rank-val">{r.value}</span>
              </div>
              {r.sub && <span className="rank-sub">{r.sub}</span>}
              <div className="rank-bar">
                <span style={{ width: `${Math.max(0, Math.min(1, r.share)) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
