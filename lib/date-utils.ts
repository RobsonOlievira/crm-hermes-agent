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