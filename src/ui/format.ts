const nf = new Intl.NumberFormat('pt-BR')
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const num = (n: number) => nf.format(Math.round(n))

export function hours(ms: number): string {
  const h = ms / 3.6e6
  if (h < 1) return `${Math.round(ms / 60000)} min`
  return `${h < 10 ? nf1.format(h) : nf.format(Math.round(h))} h`
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** 10 → "novembro" (mês de 0 a 11). */
export const monthName = (m: number) => MONTHS_LONG[m]

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

/** Data curta para destaques: "29 jun 2020". */
export function shortDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Data sem ano, para quando o ano já está claro: "29 jun". */
export function dayMonth(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Horas por extenso para frases: "773 horas", "1,5 hora", "45 minutos". */
export function longHours(ms: number): string {
  const h = ms / 3.6e6
  if (h < 1) {
    const m = Math.round(ms / 60000)
    return `${m} ${m === 1 ? 'minuto' : 'minutos'}`
  }
  const s = h < 10 ? nf1.format(h) : nf.format(Math.round(h))
  // Singular abaixo de 2 ("1,5 hora"), olhando o número já arredondado (1,98 vira "2 horas").
  return `${s} ${Number(s.replace(',', '.')) < 2 ? 'hora' : 'horas'}`
}

const WEEKDAYS_LONG = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

/** 0 = segunda … 6 = domingo. */
export const weekdayName = (i: number) => WEEKDAYS_LONG[i]

/** "2024-03-07" → data local em ms. */
export function keyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Tira o "- Remastered 2011" e o "(feat. Fulano)" do nome da música, que só ocupam espaço no cartão. */
export const cleanTitle = (name: string) =>
  name
    .replace(/\s+(?:-\s+|\()(?:\d{4}\s+)?(?:remaster(?:ed)?|remasterizad[ao])(?:\s+\d{4})?(?:\s+version)?\)?$/i, '')
    .replace(/\s+[([]feat\.?\s[^)\]]*[)\]]/i, '') || name
