import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { Lead } from '@prisma/client'

// Tipos de segmentação suportados para campanhas de email.
// 'ALL' = todos os leads; demais filtram por um critério específico.
export type SegmentType = 'ALL' | 'STATUS' | 'SOURCE' | 'LEAD_TYPE' | 'TAG' | 'FORMULARIO' | 'COMPANY' | 'CNPJ' | 'CATALOG_ITEM' | 'OBJECTIVE' | 'DEAL_VALUE'

// Monta o filtro Prisma (where) que representa o segmento selecionado.
// Reutilizado pela rota /leads (para preview/contagem) e pela rota /send (para disparo).
export function buildSegmentWhere(
  tenantId: string,
  segmentType: string,
  segmentValue?: string | null
): Prisma.LeadWhereInput {
  const base: Prisma.LeadWhereInput = { tenantId }
  switch (segmentType) {
    case 'STATUS':
      if (segmentValue) base.status = segmentValue as Lead['status']
      break
    case 'SOURCE':
      if (segmentValue) base.source = segmentValue as Lead['source']
      break
    case 'LEAD_TYPE':
      if (segmentValue) base.leadTypes = { some: { leadTypeId: segmentValue } }
      break
    case 'TAG':
      if (segmentValue) base.tags = { has: segmentValue }
      break
    case 'FORMULARIO':
      if (segmentValue) base.formulario = segmentValue
      break
    case 'COMPANY':
      if (segmentValue) base.companyName = { contains: segmentValue, mode: 'insensitive' }
      break
    case 'CNPJ':
      if (segmentValue) base.cnpj = { contains: segmentValue }
      break
    case 'CATALOG_ITEM':
      if (segmentValue) base.catalogItemId = segmentValue
      break
    case 'OBJECTIVE':
      if (segmentValue) base.objective = { contains: segmentValue, mode: 'insensitive' }
      break
    case 'DEAL_VALUE':
      if (segmentValue) base.dealValue = { gte: Number(segmentValue) }
      break
    default:
      break
  }
  return base
}

// Resolve os leads destinatários de uma campanha (com email não-nulo).
export async function resolveSegmentLeads(
  tenantId: string,
  segmentType: string,
  segmentValue?: string | null,
  limit = 5000
): Promise<{ leads: Array<{ id: string; name: string; email: string; status: string; source: string | null; tags: string[] }>; total: number }> {
  const where: Prisma.LeadWhereInput = {
    ...buildSegmentWhere(tenantId, segmentType, segmentValue),
    email: { not: null },
  }
  const select = {
    id: true,
    name: true,
    email: true,
    status: true,
    source: true,
    tags: true,
  } as const
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, take: limit, select, orderBy: { createdAt: 'desc' } }),
    prisma.lead.count({ where }),
  ])
  const mapped = leads
    .filter((l): l is typeof l & { email: string } => Boolean(l.email))
    .map(l => ({ ...l, email: l.email! }))
  return { leads: mapped, total }
}
