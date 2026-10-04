import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { YearTop } from '../data/stats'
import { t } from '../i18n'

/*
 * Escolha do ano como num toca-discos antigo: cada ano é um disco numa caixa embaixo.
 * Ao escolher, o braço sobe, o disco troca e o braço desce de novo.
 */

/** Capas desenhadas, repetindo as cores em ciclo; "Todos os anos" é a caixa preta e dourada. */
const SLEEVES = [
  { p: 'rings', bg: '#1f3557', a: '#e0a82e', c: '#f2e6cf' },
  { p: 'stripes', bg: '#e0a82e', a: '#1b1b1b', c: '#1b1b1b' },
  { p: 'dots', bg: '#b0412e', a: '#d9643f', c: '#f6ead6' },
  { p: 'sun', bg: '#1d6f6b', a: '#25857f', c: '#f4e8d0' },
  { p: 'split', bg: '#efe3c8', a: '#d9622b', c: '#1c1c1c' },
  { p: 'rings', bg: '#161616', a: '#c23b2c', c: '#f0e2c4' },
  { p: 'stripes', bg: '#5f6b2e', a: '#efe3c8', c: '#f3e7cc' },
  { p: 'dots', bg: '#d9788c', a: '#b85a6f', c: '#1a1a1a' },
  { p: 'sun', bg: '#d9622b', a: '#e98245', c: '#fff3e0' },
  { p: 'split', bg: '#2fbf71', a: '#178a4e', c: '#0b0b0b' },
]
const BOX = { p: 'box', bg: '#111111', a: '#111111', c: '#e7c46a' }

interface Props {
  years: YearTop[]
  year: number | null
  onPick: (year: number | null) => void
}

export function TocaDiscos({ years, year, onPick }: Props) {
  const [shown, setShown] = useState(year)
  const shownRef = useRef(year)
  const [settled, setSettled] = useState(year)
  const [out, setOut] = useState(false)
  const [playing, setPlaying] = useState(true)
  const crate = useRef<HTMLDivElement>(null)

  const indexOf = (y: number | null) => Math.max(0, years.findIndex((s) => s.year === y))
  const look = (i: number) => (years[i].year === null ? BOX : SLEEVES[i % SLEEVES.length])
  const vars = (i: number) => {
    const s = look(i)
    return { '--bg': s.bg, '--a': s.a, '--ink-c': s.c } as CSSProperties
  }
  const first = years[0]?.year
  const last = years[years.length - 2]?.year
  const range = first && last && first !== last ? `${first}–${last}` : String(first ?? '')

  // Troca de disco: o braço sobe, o disco sai, entra o novo e o braço desce.
  // `settled` é o ano em que o braço já desceu; enquanto for outro, o braço fica levantado.
  useEffect(() => {
    const commit = () => {
      shownRef.current = year
      setShown(year)
    }
    const steps: [number, () => void][] =
      year === shownRef.current
        ? [
            [
              0,
              () => {
                setOut(false)
                setSettled(year)
              },
            ],
          ]
        : matchMedia('(prefers-reduced-motion: reduce)').matches
          ? [
              [
                0,
                () => {
                  commit()
                  setSettled(year)
                },
              ],
            ]
          : [
              [350, () => setOut(true)],
              [700, commit],
              [760, () => setOut(false)],
              [
                1150,
                () => {
                  setSettled(year)
                  setPlaying(true)
                },
              ],
            ]
    const timers = steps.map(([ms, fn]) => setTimeout(fn, ms))
    return () => timers.forEach(clearTimeout)
  }, [year])

  // Mantém o disco escolhido à vista na caixa, sem rolar a página.
  useEffect(() => {
    const box = crate.current
    const btn = box?.children[Math.max(0, years.findIndex((s) => s.year === year))] as HTMLElement | undefined
    if (!box || !btn) return
    box.scrollTo({ left: btn.offsetLeft + btn.offsetWidth / 2 - box.clientWidth / 2, behavior: 'smooth' })
  }, [year, years])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = Math.max(0, Math.min(years.length - 1, indexOf(year) + (e.key === 'ArrowRight' ? 1 : -1)))
    onPick(years[i].year)
    ;(crate.current?.children[i] as HTMLElement | undefined)?.focus()
  }

  const on = playing && year === settled
  const si = indexOf(shown)
  const disc = years[si]

  return (
    <>
      <div className="td-deck">
        <div className="td-platter">
          <div className={`td-disc ${on ? 'td-turning' : ''} ${out ? 'td-out' : ''}`} style={vars(si)} aria-hidden>
            <span className="td-spin">
              <span className="td-lbl">
                <b>{disc?.year ?? t('Todos', 'All', 'Todos')}</b>
                <i>{disc?.year === null ? range : '33⅓ rpm'}</i>
              </span>
            </span>
            <span className="td-hole" />
            <span className="td-sheen" />
          </div>
        </div>
        <svg className={`td-arm ${on ? 'td-down' : ''}`} viewBox="0 0 500 400" aria-hidden>
          <circle cx="455" cy="300" r="9" fill="#151514" stroke="#3b3b38" strokeWidth="2" />
          <circle cx="430" cy="72" r="26" fill="#1c1c1b" stroke="#4a4a46" strokeWidth="2" />
          <g className="td-swing">
            <rect x="420" y="20" width="20" height="30" rx="4" fill="#9b9890" stroke="#5c5a54" strokeWidth="1.5" />
            <line x1="430" y1="40" x2="430" y2="300" stroke="#c9c6bc" strokeWidth="7" strokeLinecap="round" />
            <line x1="430" y1="40" x2="430" y2="300" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
            <circle cx="430" cy="72" r="11" fill="#c9c6bc" stroke="#5c5a54" strokeWidth="2" />
            <path d="M424 296 L420 336 L440 340 L438 298 Z" fill="#2a2a28" stroke="#c9c6bc" strokeWidth="2" strokeLinejoin="round" />
            <rect x="421" y="324" width="16" height="10" rx="2" fill="#2fbf71" />
          </g>
        </svg>
        <div className={`td-knobs ${on ? 'td-lit' : ''}`}>
          <span className="td-led" aria-hidden />
          <button
            type="button"
            className="td-knob"
            aria-pressed={playing}
            onClick={() => setPlaying(!playing)}
            title={playing ? t('Parar o disco', 'Stop the record', 'Parar el disco') : t('Girar o disco', 'Spin the record', 'Girar el disco')}
          >
            {playing ? t('PARAR', 'STOP', 'PARAR') : t('TOCAR', 'PLAY', 'GIRAR')}
          </button>
        </div>
      </div>

      <div className="td-crate" ref={crate} role="group" aria-label={t('Escolher o ano', 'Pick a year', 'Elegir el año')} onKeyDown={onKeyDown}>
        {years.map((s, i) => (
          <button key={s.year ?? 'todos'} type="button" aria-pressed={s.year === year} onClick={() => onPick(s.year)}>
            <span className={`td-sleeve td-p-${look(i).p}`} style={vars(i)}>
              <span className="td-who">{s.year === null ? t('Coletânea completa', 'Box set', 'Colección completa') : s.top}</span>
              <span className="td-yr">
                {s.year ?? (
                  <>
                    {t('Todos os anos', 'All years', 'Todos los años')}
                    <br />
                    {range}
                  </>
                )}
              </span>
            </span>
            <span className="td-name">{s.year ?? t('Todos', 'All', 'Todos')}</span>
          </button>
        ))}
      </div>
    </>
  )
}
