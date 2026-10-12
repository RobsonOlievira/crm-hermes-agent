import { prisma } from '@/lib/db'
import { LEAD_STATUS_META, LEAD_SOURCE_META } from '@/lib/crm-constants'
import type { LeadRow } from '@/components/leads/leads-table'

export const LEADS_PAGE_SIZE = 50

export type LeadSortKey = 'name' | 'company' | 'status' | 'type' | 'source' | 'value' | 'date'

export interface LeadListParams {
  search?: string
  status?: string
  source?: string
  leadTypeId?: string
  assigneeId?: string
  sortKey?: string
  sortDir?: string
  offset?: number
  limit?: number
}

export interface LeadListResult {
  rows: LeadRow[]
  total: number
  totalValue: number
}

function buildOrderBy(key: string | undefined, dir: 'asc' | 'desc'): any[] {
  const tie = { id: 'asc' as const }
  switch (key) {
    case 'name':
      return [{ name: dir }, tie]
    case 'company':
      return [{ companyName: { sort: dir, nulls: 'last' } }, tie]
    case 'status':
      return [{ status: dir }, tie]
    case 'source':
      return [{ source: dir }, tie]
    case 'value':
      return [{ dealValue: { sort: dir, nulls: 'last' } }, tie]
    case 'type':
      return [{ leadTypes: { _count: dir } }, tie]
    default:
      return [{ createdAt: dir }, tie]
  }
}

export async function queryLeads(tenantId: string, p: LeadListParams): Promise<LeadListResult> {
  const where: any = { tenantId }
  const search = p.search?.trim()
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (p.status && p.status in LEAD_STATUS_META) where.status = p.status
  if (p.source && p.source in LEAD_SOURCE_META) where.source = p.source
  if (p.leadTypeId) where.leadTypes = { some: { leadTypeId: p.leadTypeId } }
  if (p.assigneeId) where.assignedToId = p.assigneeId

  const dir = p.sortDir === 'asc' ? 'asc' : 'desc'
  const take = Math.min(Math.max(Number(p.limit) || LEADS_PAGE_SIZE, 1), 100)
  const skip = Math.max(Number(p.offset) || 0, 0)

  const [items, total, agg] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: buildOrderBy(p.sortKey, dir),
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        status: true,
        source: true,
        dealValue: true,
        assignedToId: true,
        createdAt: true,
        assignedTo: { select: { name: true, avatarUrl: true } },
        leadTypes: { select: { leadTypeId: true, leadType: { select: { label: true, color: true, icon: true } } } },
      },
    }),
    prisma.lead.count({ where }),
    prisma.lead.aggregate({ where, _sum: { dealValue: true } }),
  ])

  const rows: LeadRow[] = (items as any[]).map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    companyName: l.companyName,
    status: l.status,
    source: l.source,
    dealValue: l.dealValue,
    leadTypeIds: l.leadTypes.map((lt: any) => lt.leadTypeId),
    leadTypeLabels: l.leadTypes.map((lt: any) => lt.leadType?.label),
    leadTypeColors: l.leadTypes.map((lt: any) => lt.leadType?.color),
    leadTypeIcons: l.leadTypes.map((lt: any) => lt.leadType?.icon),
    assignedToId: l.assignedToId,
    assignedToName: l.assignedTo?.name ?? null,
    assignedToAvatar: l.assignedTo?.avatarUrl ?? null,
    createdAt: l.createdAt?.toISOString?.() ?? '',
  }))

  return { rows, total, totalValue: agg._sum.dealValue ?? 0 }
}
