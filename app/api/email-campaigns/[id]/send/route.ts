export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { resolveSegmentLeads } from '@/lib/email-segment'
import { sendEmail, isResendConfigured, defaultConfig, type ResendConfig } from '@/lib/resend'

const DEFAULT_BATCH = 100

interface TenantResend {
  resendApiKey: string | null
  resendFrom: string | null
  resendReplyTo: string | null
  resendEnabled: boolean
}

// Monta a configuração do Resend a partir do tenant (com fallback p/ env).
function buildResendConfig(t?: TenantResend | null): ResendConfig {
  const fallback = defaultConfig()
  if (t?.resendApiKey) {
    return {
      apiKey: t.resendApiKey,
      from: t.resendFrom || fallback.from,
      replyTo: t.resendReplyTo || t.resendFrom || fallback.replyTo,
    }
  }
  return fallback
}

// Retorna a contagem/limite e resolve os destinatários. Requer o campaign id.
async function loadCampaign(id: string, tenantId: string) {
  return prisma.emailCampaign.findFirst({
    where: { id, tenantId },
  })
}

function personalize(template: string, first: string, fullName: string, email: string): string {
  return template
    .replace(/\{\{primeiro_nome\}\}/g, first)
    .replace(/\{\{nome\}\}/g, fullName)
    .replace(/\{\{email\}\}/g, email)
}

function firstWord(name: string): string {
  return (name || '').split(' ')[0] || name
}

// GET: só informa quantos destinatários cairiam no segmento (sem enviar).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const campaign = await loadCampaign(params.id, user.tenantId)
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

    const { leads, total } = await resolveSegmentLeads(
      user.tenantId,
      campaign.segmentType,
      campaign.segmentValue,
      5000
    )
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { resendApiKey: true, resendFrom: true, resendReplyTo: true, resendEnabled: true },
    })
    const cfg = buildResendConfig(tenant)
    return NextResponse.json({ total, recipientsPreview: leads.length, configured: isResendConfigured(cfg) })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao calcular destinatários' }, { status: 500 })
  }
}

// POST: cria os EmailRecipient e dispara via Resend em lotes.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const campaign = await loadCampaign(params.id, user.tenantId)
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED' && campaign.status !== 'SENDING') {
      return NextResponse.json({ error: 'Esta campanha não pode ser enviada (status atual: ' + campaign.status + ')' }, { status: 400 })
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { resendApiKey: true, resendFrom: true, resendReplyTo: true, resendEnabled: true },
    })
    const cfg = buildResendConfig(tenant)
    if (!isResendConfigured(cfg)) {
      return NextResponse.json(
        { error: 'Resend não configurado. Vá em Configurações → Email para adicionar sua chave da API.' },
        { status: 503 }
      )
    }
    if (tenant?.resendApiKey && !tenant.resendEnabled) {
      return NextResponse.json(
        { error: 'O envio de email está desativado nas configurações do tenant. Ative em Configurações → Email.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(req.url)
    const batchSize = Math.min(Math.max(parseInt(searchParams.get('batch') || String(DEFAULT_BATCH), 10) || DEFAULT_BATCH, 1), 500)

    const { leads, total } = await resolveSegmentLeads(
      user.tenantId,
      campaign.segmentType,
      campaign.segmentValue,
      5000
    )
    if (leads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead com email no segmento selecionado' }, { status: 400 })
    }

    // Marca como enviando e registra o total de destinatários
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: 'SENDING', totalRecipients: total },
    })

    // Já processados (SENT/FAILED) para esta campanha — não re-enviar.
    const processed = await prisma.emailRecipient.findMany({
      where: { campaignId: campaign.id, leadId: { in: leads.map(l => l.id) } },
      select: { leadId: true },
    })
    const processedIds = new Set(processed.map(p => p.leadId))
    const remaining = leads.filter(l => !processedIds.has(l.id))
    const slice = remaining.slice(0, batchSize)

    if (slice.length === 0) {
      // Nada restante para processar: considera concluído.
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: 'SENT', sentAt: new Date(), totalSent: processed.length },
      })
      return NextResponse.json({ ok: true, done: true, sent: processed.length, failed: 0, processed: 0, remaining: 0, total })
    }

    let sent = 0
    let failed = 0

    // dispara um a um (só os que não foram processados ainda)
    for (const lead of slice) {
      let status: 'PENDING' | 'SENT' | 'FAILED' = 'PENDING'
      let externalId: string | null = null
      let errorMessage: string | null = null
      let sentAt: Date | null = null

      const res = await sendEmail({
        to: lead.email,
        subject: campaign.subject,
        html: personalize(campaign.htmlBody, firstWord(lead.name), lead.name, lead.email),
        tags: [
          { name: 'campaign_id', value: campaign.id },
          { name: 'category', value: campaign.category || 'geral' },
        ],
      }, cfg)

      if (res.ok) {
        status = 'SENT'
        externalId = res.id || null
        sentAt = new Date()
        sent++
      } else {
        status = 'FAILED'
        errorMessage = res.error || null
        failed++
      }

      await prisma.emailRecipient.create({
        data: {
          tenantId: campaign.tenantId,
          campaignId: campaign.id,
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          status,
          externalId,
          errorMessage,
          sentAt,
        },
      })
    }

    // Acumula com os totais anteriores
    const totalSent = (campaign.totalSent || 0) + sent
    const totalFailed = (campaign.totalFailed || 0) + failed
    const done = totalSent + totalFailed >= total

    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        totalSent,
        totalFailed,
        status: done ? 'SENT' : 'SENDING',
        sentAt: done ? new Date() : campaign.sentAt,
      },
    })

    return NextResponse.json({
      ok: true,
      sent: totalSent,
      failed: totalFailed,
      processed: slice.length,
      remaining: Math.max(0, total - (totalSent + totalFailed) - processedIds.size),
      done,
      total,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao enviar campanha' }, { status: 500 })
  }
}
