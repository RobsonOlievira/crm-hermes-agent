export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

async function requireCampaign(tenantId: string, id: string) {
  const campaign = await prisma.emailCampaign.findFirst({ where: { id, tenantId }, select: { id: true } })
  if (!campaign) throw new Error('Campanha não encontrada')
  return campaign
}

// GET: lista os leads/e-mails excluídos manualmente do público.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    await requireCampaign(user.tenantId, params.id)
    const exclusions = await prisma.emailCampaignExclusion.findMany({
      where: { campaignId: params.id, tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    const leadIds = exclusions.map((e) => e.leadId).filter(Boolean) as string[]
    const leads = leadIds.length
      ? await prisma.lead.findMany({
          where: { id: { in: leadIds }, tenantId: user.tenantId },
          select: { id: true, name: true, email: true },
        })
      : []
    const byId = new Map(leads.map((l) => [l.id, l]))
    return NextResponse.json({
      exclusions: exclusions.map((e) => ({
        id: e.id,
        leadId: e.leadId,
        name: e.leadId ? byId.get(e.leadId)?.name ?? null : null,
        email: e.email || (e.leadId ? byId.get(e.leadId)?.email ?? null : null),
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar exclusões' }, { status: 404 })
  }
}

// POST: adiciona leads/e-mails à exclusão da campanha.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    await requireCampaign(user.tenantId, params.id)
    const body = await req.json()
    const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds.map(String).filter(Boolean) : []
    const emails: string[] = Array.isArray(body.emails)
      ? body.emails.map((e: any) => String(e).trim().toLowerCase()).filter(Boolean)
      : []
    if (!leadIds.length && !emails.length) {
      return NextResponse.json({ error: 'Informe leadIds ou emails.' }, { status: 400 })
    }

    if (leadIds.length) {
      const found = await prisma.lead.findMany({
        where: { id: { in: leadIds }, tenantId: user.tenantId },
        select: { id: true },
      })
      const valid = new Set(found.map((l) => l.id))
      const invalid = leadIds.filter((id) => !valid.has(id))
      if (invalid.length) {
        return NextResponse.json({ error: `Leads não encontrados: ${invalid.join(', ')}` }, { status: 400 })
      }
    }

    await prisma.emailCampaignExclusion.createMany({
      data: [
        ...leadIds.map((leadId) => ({
          tenantId: user.tenantId!,
          campaignId: params.id,
          leadId,
          reason: body.reason ? String(body.reason) : null,
        })),
        ...emails.map((email) => ({
          tenantId: user.tenantId!,
          campaignId: params.id,
          email,
          reason: body.reason ? String(body.reason) : null,
        })),
      ],
    })
    const total = await prisma.emailCampaignExclusion.count({ where: { campaignId: params.id } })
    return NextResponse.json({ ok: true, total })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao excluir leads' }, { status: 400 })
  }
}

// DELETE: desfaz exclusões (por id da exclusão).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    await requireCampaign(user.tenantId, params.id)
    const body = await req.json().catch(() => ({}))
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : []
    if (!ids.length) return NextResponse.json({ error: 'Informe ids.' }, { status: 400 })
    const result = await prisma.emailCampaignExclusion.deleteMany({
      where: { id: { in: ids }, campaignId: params.id, tenantId: user.tenantId },
    })
    return NextResponse.json({ ok: true, removidas: result.count })
  } catch {
    return NextResponse.json({ error: 'Erro ao remover exclusões' }, { status: 500 })
  }
}
