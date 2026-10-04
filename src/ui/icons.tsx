import { useId } from 'react'

/** Ícones de traço, na cor do texto (currentColor). */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function DiscIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 6a6 6 0 0 1 6 6" />
    </svg>
  )
}

export function BulbIcon() {
  return (
    <svg {...base}>
      <path d="M9.5 18h5M10.5 21h3" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V16h5v-.2c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

export function GiftIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="8" width="17" height="4.5" rx="1" />
      <path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5M12 8v12.5" />
      <path d="M12 8C11 5.5 7.5 4.5 7.5 6.5 7.5 8 10 8 12 8Zm0 0c1-2.5 4.5-3.5 4.5-1.5C16.5 8 14 8 12 8Z" />
    </svg>
  )
}

export function ExitIcon() {
  return (
    <svg {...base}>
      <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" />
      <path d="M14.5 8l4 4-4 4M18.5 12H9.5" />
    </svg>
  )
}

export function ShareIcon() {
  return (
    <svg {...base}>
      <path d="M12 14V3M8 7l4-4 4 4" />
      <path d="M8 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function TimerIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 2M10 2.5h4M12 2.5V6" />
    </svg>
  )
}

export function MicIcon() {
  return (
    <svg {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </svg>
  )
}

/* Bandeiras de traço, sem cor, no mesmo estilo dos ícones. */

const flagBox = <rect x="2.5" y="5" width="19" height="14" rx="2" />

export function FlagBR() {
  const cut = useId()
  return (
    <svg {...base}>
      {flagBox}
      <path d="M12 7.4 19 12l-7 4.6L5 12Z" strokeWidth={1.4} />
      {/* O círculo cheio com a faixa curva atravessando, como na bandeira. */}
      <mask id={cut}>
        <rect width="24" height="24" fill="#fff" />
        <path d="M9 12.6q3-1.9 6 0" stroke="#000" strokeWidth={0.9} fill="none" />
      </mask>
      <circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none" mask={`url(#${cut})`} />
    </svg>
  )
}

export function FlagUK() {
  return (
    <svg {...base}>
      {flagBox}
      <path d="M4.2 6.3 19.8 17.7M19.8 6.3 4.2 17.7" strokeWidth={1.1} />
      <path d="M12 5v14M2.5 12h19" strokeWidth={2.2} strokeLinecap="butt" />
    </svg>
  )
}

export function FlagES() {
  return (
    <svg {...base}>
      {flagBox}
      {/* As faixas de cima e de baixo cheias; o brasão na do meio. */}
      <path d="M2.5 8.5V7a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v1.5ZM2.5 15.5V17a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-1.5Z" fill="currentColor" stroke="none" />
      <path d="M7 10.3h2.8v2.1a1.4 1.4 0 0 1-2.8 0Z" strokeWidth={1.2} />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg {...base}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}
