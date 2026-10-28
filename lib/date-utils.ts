// Datas de competência do CRM são armazenadas como "YYYY-MM-DD" → meia-noite UTC.
// Toda leitura/exibição de mês deve usar componentes UTC, senão um projeto iniciado
// em 01/09 "caia" para 31/08 no fuso -03:00 (getMonth local). Esses helpers centralizam isso.

export function competenceDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return new Date(value)
}

export function competenceYearMonth(value: string | Date | null | undefined): { year: number; month: number } {
  const d = competenceDate(value) ?? new Date()
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
}

export function formatCompetenceDate(value: string | Date | null | undefined): string {
  const d = competenceDate(value)
  if (!d) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

export function currentCompetence(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() }
}

/** Diferença em meses (UTC) entre duas competências. Positivo = `to` é depois de `from`. */
export function monthDelta(from: string | Date | null | undefined, to: string | Date | null | undefined): number {
  const a = competenceDate(from)
  const b = competenceDate(to)
  if (!a || !b) return 0
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
}

/** Soma meses em UTC preservando o dia (ajustado ao último dia do mês destino). */
export function addMonthsUTC(value: string | Date | null | undefined, months: number): Date | null {
  const d = competenceDate(value)
  if (!d) return null
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)))
}

/**
 * Data-padrão ao criar algo olhando para uma competência (aba de mês).
 * Mês atual → hoje; outro mês → primeiro dia daquele mês.
 */
export function defaultDateForCompetence(year: number, month: number): string {
  const now = new Date()
  if (now.getUTCFullYear() === year && now.getUTCMonth() === month) {
    return now.toISOString().split('T')[0]
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

/** "YYYY-MM" → data no primeiro dia daquele mês (UTC). */
export function dateFromMonthInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value)
  if (!m) return null
  return new Date(`${m[1]}-${m[2]}-01T00:00:00.000Z`)
}

/** Date → "YYYY-MM" para <input type="month">. */
export function toMonthInput(value: string | Date | null | undefined): string {
  const d = competenceDate(value)
  if (!d) return ''
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export const MONTH_LABELS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatCompetenceMonth(value: string | Date | null | undefined): string {
  const d = competenceDate(value)
  if (!d) return '—'
  return `${MONTH_LABELS_PT[d.getUTCMonth()]}/${d.getUTCFullYear()}`
}