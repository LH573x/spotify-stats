import type { ReactNode } from 'react'
import type { ImageRef } from '../data/images'
import { Thumb } from './Thumb'

export interface BarRow {
  key: string | number
  name: string
  sub?: string
  /** Valor já formatado, mostrado à direita. */
  value: string
  /** Comprimento da barra, de 0 a 1. */
  share: number
  title?: string
  /** Link do nome (ex.: página do artista). */
  href?: string
  /** Foto do artista ou capa do álbum, mostrada antes do nome. */
  image?: ImageRef
}

/** Lista com barras horizontais; `numbered` mostra a posição no ranking. Sem título, é só a lista num cartão. */
export function BarList({ title, note, rows, numbered = true }: { title?: string; note?: ReactNode; rows: BarRow[]; numbered?: boolean }) {
  const list = (
    <ol className={`rank ${numbered ? '' : 'plain'}`}>
      {rows.map((r, i) => (
        <li key={r.key} title={r.title}>
          {numbered && <span className="rank-n">{i + 1}</span>}
          {r.image && <Thumb image={r.image} label={r.name} />}
          <div className="rank-body">
            <div className="rank-line">
              {r.href ? (
                <a className="rank-name" href={r.href}>
                  {r.name}
                </a>
              ) : (
                <span className="rank-name">{r.name}</span>
              )}
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
  )
  if (!title) return <div className="card">{list}</div>
  return (
    <section className="card">
      <header className="card-head">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </header>
      {list}
    </section>
  )
}
