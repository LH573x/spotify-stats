const nf = new Intl.NumberFormat('pt-BR')
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const num = (n: number) => nf.format(Math.round(n))

export function hours(ms: number): string {
  const h = ms / 3.6e6
  if (h < 1) return `${Math.round(ms / 60000)} min`
  return `${h < 10 ? nf1.format(h) : nf.format(Math.round(h))} h`
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2024-03" → "mar 2024" (ou só "mar" quando o ano é óbvio). */
export function monthLabel(key: string, withYear = true): string {
  const [y, m] = key.split('-')
  const name = MONTHS[Number(m) - 1]
  return withYear ? `${name} ${y}` : name
}

export function date(ms: number): string {
  return new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** 0.623 → "62%" */
export const pct = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`)
