import type { LeadStatus } from '@prisma/client'

// Ordem canônica das etapas do pipeline. O índice corresponde à `position` da
// tabela Stage (fonte de verdade no banco), usada como fallback de resolução.
export const LEAD_STATUS_VALUES: LeadStatus[] = [
  'PRIMEIRO_CONTATO',
  'CONVERSA_ATIVA',
  'FOLLOW_UP',
  'BANCO_7_DIAS',
  'NOVAS_MENSAGENS',
  'REUNIAO_AGENDADA',
  'PROPOSTA_ENVIADA',
  'SERVICO_FECHADO',
  'PAGAMENTO_CONFIRMADO',
  'INATIVO',
  'SEM_RESPOSTA',
  'CONVERSAS_OFF',
]

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUS_VALUES as string[]).includes(value)
}

export function normalizeStageKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

export function stripStagePrefix(value: string): string {
  return value.replace(/^stage[-_\s]*/i, '')
}

type StageLike = { id: string; name: string; position?: number | null }

// Resolve o LeadStatus a partir de uma etapa real do banco, aceitando nomes no
// formato status ("CONVERSAS_OFF"), rótulos ("Conversas em Off") e ids slug
// ("stage-conversas-off") ou legados ("stage-8", via position).
export function deriveLeadStatus(stage: StageLike): LeadStatus | null {
  const candidates = [
    normalizeStageKey(stage.name),
    normalizeStageKey(stripStagePrefix(stage.name)),
    normalizeStageKey(stripStagePrefix(stage.id)),
  ]
  const match = candidates.find((c) => isLeadStatus(c))
  if (match) return match as LeadStatus
  if (
    typeof stage.position === 'number' &&
    stage.position >= 0 &&
    stage.position < LEAD_STATUS_VALUES.length
  ) {
    return LEAD_STATUS_VALUES[stage.position]
  }
  return null
}

export function isClosedStage(stage: { id: string; name: string; position?: number | null }): boolean {
  return deriveLeadStatus(stage) === 'SERVICO_FECHADO'
}
