import { useMemo, useState } from 'react'
import type { Dataset } from '../data/types'
import type { Filter, KindFilter } from '../data/stats'
import { forgotten, records, yearProfile, type YearProfile } from '../data/curiosities'
import { artistRef, itemRef } from '../data/refs'
import { Art, Thumb } from '../ui/Thumb'
import { artistHref, songHref } from '../ui/links'
import { PlayButton } from '../ui/player'
import { trackOf } from '../ui/playerStore'
import { cleanTitle, clock, date, duration, hours, keyToMs, monthLabel, num, shortDate } from '../ui/format'

const pad = (n: number) => String(n).padStart(2, '0')
const monthOf = (ms: number) => {
  const d = new Date(ms)
  return monthLabel(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
}

/** Recordes em cartões de tamanhos diferentes. */
export function Recordes({ data, filter }: { data: Dataset; filter: Filter }) {
  const r = useMemo(() => records(data, filter), [data, filter])
  const song = (id: number) => ({ name: cleanTitle(data.items[id].name), artist: data.creators[data.items[id].creator] })
  const link = (id: number) => (
    <a href={songHref(id)}>
      <b>{song(id).name}</b>
    </a>
  )

  return (
    <div className="bento">
      {r.marathon && (
        <article className="rec rec-wide rec-hot">
          <p className="rec-label">Maior maratona</p>
          <p className="rec-big">{duration(r.marathon.end - r.marathon.start)}</p>
          <p className="rec-text">
            {shortDate(r.marathon.start)} · {clock(r.marathon.start)}–{clock(r.marathon.end)} · {num(r.marathon.tracks)} faixas
          </p>
        </article>
      )}
      {r.repeatDay && (
        <article className="rec rec-pic">
          <Thumb image={itemRef(data, r.repeatDay.item) ?? { kind: 'artist', name: song(r.repeatDay.item).artist }} label={song(r.repeatDay.item).name} size={72} />
          <PlayButton track={trackOf(data, r.repeatDay.item)} className="play-corner" />
          <p className="rec-label">Repetiu no mesmo dia</p>
          <p className="rec-big">{num(r.repeatDay.count)} vezes</p>
          <p className="rec-text">
            {link(r.repeatDay.item)} · {song(r.repeatDay.item).artist} · {shortDate(keyToMs(r.repeatDay.day))}
          </p>
        </article>
      )}
      {r.lateNight && (
        <article className="rec rec-night">
          <p className="rec-label">Madrugada mais longa</p>
          <p className="rec-big">{hours(r.lateNight.ms)}</p>
          <p className="rec-text">{shortDate(keyToMs(r.lateNight.day))}</p>
        </article>
      )}
      {r.artistRun && (
        <article className="rec rec-pic">
          <Thumb image={artistRef(data, r.artistRun.creator)} label={data.creators[r.artistRun.creator]} size={72} />
          <p className="rec-label">Sem trocar de artista</p>
          <p className="rec-big">{num(r.artistRun.count)} seguidas</p>
          <p className="rec-text">
            <a href={artistHref(r.artistRun.creator)}>{data.creators[r.artistRun.creator]}</a> · {shortDate(r.artistRun.start)}
          </p>
        </article>
      )}
      {r.loyal && (
        <article className="rec rec-pic">
          <Thumb image={itemRef(data, r.loyal.item) ?? { kind: 'artist', name: song(r.loyal.item).artist }} label={song(r.loyal.item).name} size={72} />
          <PlayButton track={trackOf(data, r.loyal.item)} className="play-corner" />
          <p className="rec-label">A mais fiel</p>
          <p className="rec-big">{num(r.loyal.days)} dias</p>
          <p className="rec-text">
            {link(r.loyal.item)} · {song(r.loyal.item).artist}
          </p>
        </article>
      )}
      {r.first && (
        <article className="rec rec-wide rec-first">
          <PlayButton track={trackOf(data, r.first.item)} className="play-corner" />
          <Art image={itemRef(data, r.first.item) ?? { kind: 'artist', name: song(r.first.item).artist }} label={song(r.first.item).name} size={120} />
          <div>
            <p className="rec-label">{filter.year ? `A primeira de ${filter.year}` : 'Onde tudo começou'}</p>
            <p className="rec-big rec-name">
              <a href={songHref(r.first.item)}>{song(r.first.item).name}</a>
            </p>
            <p className="rec-text">
              {song(r.first.item).artist} · {shortDate(r.first.t)}, {clock(r.first.t)}
            </p>
          </div>
        </article>
      )}
      {r.variety && (
        <article className="rec">
          <p className="rec-label">Dia mais variado</p>
          <p className="rec-big">{num(r.variety.artists)} artistas</p>
          <p className="rec-text">{shortDate(keyToMs(r.variety.day))}</p>
        </article>
      )}
    </div>
  )
}

/** Músicas muito ouvidas que não tocam há mais de um ano, com a capa desbotada. */
export function Esquecidas({ data, filter }: { data: Dataset; filter: Filter }) {
  const list = useMemo(() => forgotten(data, filter, 8), [data, filter])
  if (list.length === 0) return <p className="empty-note">Nenhuma música esquecida nesse período: você continua ouvindo tudo o que mais ouviu.</p>
  return (
    <ol className="wall faded">
      {list.map((f) => {
        const it = data.items[f.id]
        const name = cleanTitle(it.name)
        return (
          <li key={f.id} title={`${name}: ${num(f.plays)} reproduções, a última em ${date(f.last)}`}>
            <div className="wall-art">
              <Art image={itemRef(data, f.id)} label={name} round={false} />
              <PlayButton track={trackOf(data, f.id)} className="play-over" />
            </div>
            <a className="wall-name" href={songHref(f.id)}>
              {name}
            </a>
            <span className="wall-sub">{data.creators[it.creator]}</span>
            <span className="wall-value">
              {num(f.plays)} vezes{filter.year === null && `, mais em ${f.peakYear}`}
            </span>
            <span className="faded-last">última vez em {monthOf(f.last)}</span>
          </li>
        )
      })}
    </ol>
  )
}

const KIND_WORDS: Record<KindFilter, { creators: string; items: string; fresh: string; top: string }> = {
  all: { creators: 'Artistas e podcasts', items: 'Músicas e episódios', fresh: 'Artistas e podcasts novos', top: 'Faixa mais ouvida' },
  music: { creators: 'Artistas', items: 'Músicas', fresh: 'Artistas novos', top: 'Música mais ouvida' },
  podcast: { creators: 'Podcasts', items: 'Episódios', fresh: 'Podcasts novos', top: 'Episódio mais ouvido' },
}

/** Dois anos lado a lado, com barras que crescem a partir do meio. */
export function Comparar({ data, years, filter }: { data: Dataset; years: number[]; filter: Filter }) {
  const initial = () => {
    const b = filter.year ?? years[years.length - 1]
    const i = years.indexOf(b)
    const a = years[i - 1] ?? years[i + 1] ?? b
    return [a, b] as const
  }
  const [[a, b], setPair] = useState(initial)
  const pa = useMemo(() => yearProfile(data, a, filter.kind), [data, a, filter.kind])
  const pb = useMemo(() => yearProfile(data, b, filter.kind), [data, b, filter.kind])
  const words = KIND_WORDS[filter.kind]

  if (years.length < 2) return <p className="empty-note">Seu histórico tem um ano só, então ainda não dá para comparar.</p>

  const rows: { label: string; a: number; b: number; fmt: (v: number) => string; skip?: boolean }[] = [
    { label: 'Horas', a: pa.totalMs, b: pb.totalMs, fmt: hours },
    { label: 'Reproduções', a: pa.plays, b: pb.plays, fmt: num },
    { label: words.creators, a: pa.creators, b: pb.creators, fmt: num },
    { label: words.items, a: pa.items, b: pb.items, fmt: num },
    { label: words.fresh, a: pa.newCreators, b: pb.newCreators, fmt: num, skip: pa.firstYear || pb.firstYear },
  ]
  const shared = new Set(pa.top.map((x) => x.id).filter((id) => pb.top.some((y) => y.id === id)))

  const picker = (value: number, other: number, set: (y: number) => void, label: string, p: YearProfile) => (
    <label className="vs-pick">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => set(Number(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y} disabled={y === other}>
            {y}
          </option>
        ))}
      </select>
      {p.partial && p.last !== null && <small>até {monthOf(p.last)}</small>}
    </label>
  )

  return (
    <div className="versus card">
      <div className="vs-head">
        {picker(a, b, (y) => setPair([y, b]), 'Primeiro ano', pa)}
        <span className="vs-x" aria-hidden>
          vs
        </span>
        {picker(b, a, (y) => setPair([a, y]), 'Segundo ano', pb)}
      </div>

      <div className="vs-rows">
        {rows
          .filter((r) => !r.skip)
          .map((r) => {
            const max = Math.max(r.a, r.b, 1)
            return (
              <div key={r.label} className="vs-row">
                <div className={`vs-side left ${r.a > r.b ? 'win' : ''}`}>
                  <span className="vs-val">{r.fmt(r.a)}</span>
                  <span className="vs-track">
                    <b style={{ width: `${(r.a / max) * 100}%` }} />
                  </span>
                </div>
                <span className="vs-label">{r.label}</span>
                <div className={`vs-side right ${r.b > r.a ? 'win' : ''}`}>
                  <span className="vs-track">
                    <b style={{ width: `${(r.b / max) * 100}%` }} />
                  </span>
                  <span className="vs-val">{r.fmt(r.b)}</span>
                </div>
              </div>
            )
          })}
        {(pa.part || pb.part) && (
          <div className="vs-row">
            <div className="vs-side left">
              <span className="vs-val">{pa.part ?? '—'}</span>
            </div>
            <span className="vs-label">Parte do dia</span>
            <div className="vs-side right">
              <span className="vs-val">{pb.part ?? '—'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="vs-tops">
        {[pa, pb].map((p) => (
          <div key={p.year}>
            <p className="kicker">Top 5 de {p.year}</p>
            <ol>
              {p.top.map((x, i) => (
                <li key={x.id} className={shared.has(x.id) ? 'shared' : ''}>
                  <span className="rank-n">{i + 1}</span>
                  <Thumb image={artistRef(data, x.id)} label={x.name} size={36} />
                  <a href={artistHref(x.id)} className="rank-name">
                    {x.name}
                  </a>
                  <span className="rank-val">{hours(x.ms)}</span>
                </li>
              ))}
            </ol>
            {p.topItem && (
              <p className="vs-song">
                {words.top}:{' '}
                <a href={songHref(p.topItem.id)}>
                  <b>{cleanTitle(p.topItem.name)}</b>
                </a>
                {' · '}
                {p.topItem.sub}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
