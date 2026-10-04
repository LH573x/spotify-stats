/**
 * O logo: a constelação de Lyra (a lira de Orfeu). Vega, a estrela maior, ligada
 * ao paralelogramo que forma o corpo da lira. Desenhado numa caixa de 32 × 32.
 */
const LYRA_STARS: [number, number, number][] = [
  [20, 5, 2.9], // Vega
  [16.8, 10, 1.8],
  [12, 14, 1.8],
  [13.9, 27, 1.8],
  [18.2, 23.3, 1.8],
]
const LYRA_LINES = 'M20 5L16.8 10M16.8 10L12 14L13.9 27L18.2 23.3Z'

/** Os traços e as estrelas, na cor `color`. Serve dentro de qualquer <svg>. */
export function LyraShape({ color }: { color: string }) {
  return (
    <>
      <path d={LYRA_LINES} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      {LYRA_STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={color} />
      ))}
    </>
  )
}

export function LyraMark() {
  return (
    <svg viewBox="9 2 15 28" aria-hidden>
      <LyraShape color="currentColor" />
    </svg>
  )
}
