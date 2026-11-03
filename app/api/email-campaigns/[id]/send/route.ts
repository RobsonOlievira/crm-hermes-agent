export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isResendConfigured } from '@/lib/resend'
import {
  buildResendConfig,
  campaignSegments,
  campaignStats,
  sendCampaignBatch,
} from '@/lib/services/email/campaigns'

// GET: informa quantos destinatários cairiam no público (sem enviar).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: { audiences: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

    const stats = await campaignStats(campaign as any)
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { resendApiKey: true, resendFrom: true, resendReplyTo: true, resendEnabled: true },
    })
    const cfg = buildResendConfig(tenant)

    return NextResponse.json({
      total: stats.total,
      recipientsPreview: stats.total,
      remaining: stats.remaining,
      sent: stats.sent,
      failed: stats.failed,
      unsubscribed: stats.unsubscribed,
      configured: isResendConfigured(cfg) && (tenant?.resendApiKey ? tenant.resendEnabled : true),
      listas: campaignSegments(campaign as any),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao calcular destinatários' }, { status: 500 })
  }
}

// POST: envia apenas o próximo lote (mesmo motor da ferramenta MCP).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const batchSize = Math.min(Math.max(parseInt(searchParams.get('batch') || '25', 10) || 25, 1), 100)

    const result = await sendCampaignBatch({
      tenantId: user.tenantId,
      campaignId: params.id,
      limit: batchSize,
    })
    return NextResponse.json(result)
  } catch (e: any) {
    const message = String(e?.message || 'Erro ao enviar campanha')
    const status = /não configurado|desativado|pausada|cancelada/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
