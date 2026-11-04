import { createHmac } from 'node:crypto'
import { prisma } from '@/lib/db'
import { buildSegmentWhere } from '@/lib/email-segment'
import { sendEmail, defaultConfig, isResendConfigured, type ResendConfig } from '@/lib/resend'

// ---------------------------------------------------------------------------
// Serviço de campanhas de e-mail marketing.
//
// Regras importantes (runtime Workers):
//  - cada chamada envia apenas um lote pequeno e retorna (evita erro 1102);
//  - o público é a UNIÃO das listas da campanha (ou o segmento legado);
//  - exclusões manuais, descadastros e quem já recebeu ficam de fora;
//  - o registro é por destinatário (EmailRecipient), então repetir o lote não
//    reenvia para quem já foi processado.
// ---------------------------------------------------------------------------

export interface CampaignSegment {
  segmentType: string
  segmentValue?: string | null
  label?: string | null
}

export const DEFAULT_BATCH = 25
export const MAX_BATCH = 100

type CampaignWithAudiences = {
  id: string
  tenantId: string
  name: string
  subject: string
  htmlBody: string
  category: string
  status: string
  segmentType: string
  segmentValue: string | null
  senderName: string | null
  senderEmail: string | null
  audiences?: Array<{ segmentType: string; segmentValue: string | null; label?: string | null }>
}

// Lista efetiva de segmentos: as listas novas (união) ou o segmento legado.
export function campaignSegments(campaign: CampaignWithAudiences): CampaignSegment[] {
  if (campaign.audiences && campaign.audiences.length > 0) {
    return campaign.audiences.map((a) => ({
      segmentType: a.segmentType,
      segmentValue: a.segmentValue,
      label: a.label ?? null,
    }))
  }
  return [{ segmentType: campaign.segmentType || 'ALL', segmentValue: campaign.segmentValue }]
}

export function segmentsWhere(tenantId: string, segments: CampaignSegment[]) {
  const valid = segments.filter((s) => s.segmentType)
  if (valid.length === 0 || valid.some((s) => s.segmentType === 'ALL')) {
    return buildSegmentWhere(tenantId, 'ALL', null)
  }
  return {
    tenantId,
    OR: valid.map((s) => buildSegmentWhere(tenantId, s.segmentType, s.segmentValue ?? null)),
  }
}

// Público-base (sem considerar quem já recebeu).
export function audienceWhere(tenantId: string, segments: CampaignSegment[]) {
  return {
    ...segmentsWhere(tenantId, segments),
    email: { not: null },
    isArchived: false,
    emailOptOut: false,
  }
}

export function buildResendConfig(
  tenant?: {
    resendApiKey: string | null
    resendFrom: string | null
    resendReplyTo: string | null
    resendEnabled: boolean
  } | null
): ResendConfig {
  const fallback = defaultConfig()
  if (tenant?.resendApiKey) {
    return {
      apiKey: tenant.resendApiKey,
      from: tenant.resendFrom || fallback.from,
      replyTo: tenant.resendReplyTo || tenant.resendFrom || fallback.replyTo,
    }
  }
  return fallback
}

export function personalize(template: string, first: string, fullName: string, email: string): string {
  return template
    .replace(/\{\{primeiro_nome\}\}/g, first)
    .replace(/\{\{nome\}\}/g, fullName)
    .replace(/\{\{email\}\}/g, email)
}

function firstWord(name: string): string {
  return (name || '').split(' ')[0] || name
}

function appUrl(): string {
  return (process.env.NEXTAUTH_URL || 'https://crm-hermes-agent.tesseractescoladesign.workers.dev').replace(/\/$/, '')
}

function unsubscribeSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.RESEND_API_KEY || 'nexuscrm-unsubscribe'
}

export function unsubscribeToken(campaignId: string, email: string): string {
  const payload = `${campaignId}:${email.toLowerCase()}`
  const sig = createHmac('sha256', unsubscribeSecret()).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyUnsubscribeToken(token: string): { campaignId: string; email: string } | null {
  const [encoded, sig] = String(token || '').split('.')
  if (!encoded || !sig) return null
  let payload: string
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }
  const expected = createHmac('sha256', unsubscribeSecret()).update(payload).digest('base64url')
  if (expected !== sig) return null
  const idx = payload.lastIndexOf(':')
  if (idx <= 0) return null
  return { campaignId: payload.slice(0, idx), email: payload.slice(idx + 1) }
}

export function unsubscribeUrl(campaignId: string, email: string): string {
  return `${appUrl()}/api/email/unsubscribe?t=${encodeURIComponent(unsubscribeToken(campaignId, email))}`
}

// Rodapé bem discreto: uma linha, centralizada, cinza claro, sem borda.
export function unsubscribeFooter(campaignId: string, email: string): string {
  const url = unsubscribeUrl(campaignId, email)
  return `<div style="margin:28px 0 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;color:#9ca3af">
  <a href="${url}" style="color:#9ca3af;text-decoration:none">Não quero mais receber estes e-mails</a>
</div>`
}

// Cabeçalhos de descadastro em um clique (exigidos por Gmail/Yahoo para volume).
export function unsubscribeHeaders(campaignId: string, email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl(campaignId, email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

export interface CampaignStats {
  total: number
  sent: number
  failed: number
  pending: number
  unsubscribed: number
  bounced: number
  opened: number
  clicked: number
  remaining: number
  status: string
}

// Totais calculados a partir dos destinatários registrados + público atual.
export async function campaignStats(campaign: CampaignWithAudiences): Promise<CampaignStats> {
  const segments = campaignSegments(campaign)
  const [groups, exclusions] = await Promise.all([
    prisma.emailRecipient.groupBy({
      by: ['status'],
      where: { campaignId: campaign.id },
      _count: { _all: true },
    }),
    prisma.emailCampaignExclusion.findMany({
      where: { campaignId: campaign.id },
      select: { leadId: true, email: true },
    }),
  ])
  const where = applyExclusions(audienceWhere(campaign.tenantId, segments) as any, exclusions)
  const total = await prisma.lead.count({ where })
  const byStatus = new Map<string, number>()
  for (const g of groups) byStatus.set(g.status, g._count._all)
  const sent = byStatus.get('SENT') ?? 0
  const failed = byStatus.get('FAILED') ?? 0
  const unsubscribed = byStatus.get('UNSUBSCRIBED') ?? 0
  const bounced = byStatus.get('BOUNCED') ?? 0
  const opened = byStatus.get('OPENED') ?? 0
  const clicked = byStatus.get('CLICKED') ?? 0
  const processed = sent + failed + unsubscribed + bounced
  return {
    total,
    sent,
    failed,
    pending: Math.max(0, total - processed),
    unsubscribed,
    bounced,
    opened,
    clicked,
    remaining: Math.max(0, total - processed),
    status: campaign.status,
  }
}

function exclusionFilter(exclusions: Array<{ leadId: string | null; email: string | null }>) {
  const leadIds = exclusions.map((e) => e.leadId).filter(Boolean) as string[]
  const emails = exclusions.map((e) => e.email).filter(Boolean) as string[]
  return { leadIds, emails }
}

function applyExclusions(where: any, exclusions: Array<{ leadId: string | null; email: string | null }>) {
  const { leadIds, emails } = exclusionFilter(exclusions)
  if (leadIds.length) where.id = { notIn: leadIds }
  if (emails.length) where.email = { not: null, notIn: emails }
  return where
}

// Busca o próximo lote de leads ainda não processados desta campanha.
async function nextPendingLeads(
  campaign: CampaignWithAudiences,
  limit: number
): Promise<Array<{ id: string; name: string; email: string }>> {
  const segments = campaignSegments(campaign)
  const base = audienceWhere(campaign.tenantId, segments) as any

  const [processed, exclusions] = await Promise.all([
    prisma.emailRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { email: true },
    }),
    prisma.emailCampaignExclusion.findMany({
      where: { campaignId: campaign.id },
      select: { leadId: true, email: true },
    }),
  ])
  const processedEmails = new Set(processed.map((r) => r.email.toLowerCase()))
  const { leadIds, emails } = exclusionFilter(exclusions)

  const where: any = { ...base }
  if (leadIds.length) where.id = { notIn: leadIds }
  if (emails.length) where.email = { not: null, notIn: emails }

  const collected: Array<{ id: string; name: string; email: string }> = []
  let cursor: string | undefined
  const pageSize = Math.max(limit * 2, 200)

  while (collected.length < limit) {
    const page = await prisma.lead.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (page.length === 0) break
    for (const lead of page) {
      if (!lead.email) continue
      if (processedEmails.has(lead.email.toLowerCase())) continue
      collected.push({ id: lead.id, name: lead.name, email: lead.email })
      if (collected.length >= limit) break
    }
    cursor = page[page.length - 1].id
    if (page.length < pageSize) break
  }
  return collected
}

export interface BatchResult {
  ok: boolean
  campaignId: string
  campaign: string
  sent: number
  failed: number
  processed: number
  remaining: number
  total: number
  done: boolean
  status: string
  message?: string
}

// Envia o próximo lote. Cada chamada é curta de propósito.
export async function sendCampaignBatch(opts: {
  tenantId: string
  campaignId: string
  limit?: number
  deadlineMs?: number
}): Promise<BatchResult> {
  const limit = Math.min(Math.max(Number(opts.limit) || DEFAULT_BATCH, 1), MAX_BATCH)
  const deadline = Date.now() + Math.min(Math.max(opts.deadlineMs ?? 20000, 2000), 25000)

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: opts.campaignId, tenantId: opts.tenantId },
    include: { audiences: true },
  })
  if (!campaign) throw new Error(`Campanha "${opts.campaignId}" não encontrada neste tenant.`)

  if (campaign.status === 'CANCELLED') throw new Error('Campanha cancelada. Duplique a campanha para disparar de novo.')
  if (campaign.status === 'PAUSED') throw new Error('Campanha pausada. Retome a campanha antes de enviar.')
  if (campaign.status === 'DRAFT' && campaign.totalRecipients > 0) {
    // segue: rascunho já iniciado
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    select: { resendApiKey: true, resendFrom: true, resendReplyTo: true, resendEnabled: true },
  })
  const cfg = buildResendConfig(tenant)
  if (!isResendConfigured(cfg)) {
    throw new Error('Resend não configurado. Vá em Configurações → Email para adicionar sua chave da API.')
  }
  if (tenant?.resendApiKey && !tenant.resendEnabled) {
    throw new Error('O envio de e-mail está desativado nas configurações do tenant (Configurações → Email).')
  }

  const statsBefore = await campaignStats(campaign)
  const leads = await nextPendingLeads(campaign, limit)

  if (leads.length === 0) {
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: 'SENT', sentAt: campaign.sentAt ?? new Date(), totalSent: statsBefore.sent },
    })
    return {
      ok: true,
      campaignId: campaign.id,
      campaign: campaign.name,
      sent: statsBefore.sent,
      failed: statsBefore.failed,
      processed: 0,
      remaining: 0,
      total: statsBefore.total,
      done: true,
      status: 'SENT',
      message: 'Nenhum destinatário pendente.',
    }
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: 'SENDING', totalRecipients: statsBefore.total },
  })

  let sent = 0
  let failed = 0

  for (const lead of leads) {
    if (Date.now() > deadline) break

    const unsubscribe = unsubscribeFooter(campaign.id, lead.email)
    const html = personalize(campaign.htmlBody, firstWord(lead.name), lead.name, lead.email) + unsubscribe

    const res = await sendEmail(
      {
        to: lead.email,
        subject: campaign.subject,
        html,
        replyTo: campaign.senderEmail || undefined,
        headers: unsubscribeHeaders(campaign.id, lead.email),
        tags: [
          { name: 'campaign_id', value: campaign.id },
          { name: 'category', value: campaign.category || 'geral' },
        ],
      },
      cfg
    )

    try {
      await prisma.emailRecipient.create({
        data: {
          tenantId: campaign.tenantId,
          campaignId: campaign.id,
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          status: res.ok ? 'SENT' : 'FAILED',
          externalId: res.id ?? null,
          errorMessage: res.ok ? null : res.error ?? null,
          sentAt: res.ok ? new Date() : null,
        },
      })
    } catch {
      // Registro duplicado (corrida): não conta de novo e não reenvia.
      continue
    }

    if (res.ok) sent++
    else failed++
  }

  const after = await campaignStats({ ...campaign, status: 'SENDING' } as unknown as CampaignWithAudiences)
  const done = after.remaining <= 0
  const status = done ? 'SENT' : 'SENDING'

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: status as any,
      totalRecipients: after.total,
      totalSent: after.sent,
      totalFailed: after.failed,
      sentAt: done ? new Date() : campaign.sentAt,
    },
  })

  return {
    ok: true,
    campaignId: campaign.id,
    campaign: campaign.name,
    sent: after.sent,
    failed: after.failed,
    processed: sent + failed,
    remaining: after.remaining,
    total: after.total,
    done,
    status,
  }
}

// duplicar/redisparar: copia conteúdo e listas para uma nova campanha em rascunho.
export async function duplicateCampaign(opts: {
  tenantId: string
  campaignId: string
  name?: string
  segments?: CampaignSegment[]
}) {
  const original = await prisma.emailCampaign.findFirst({
    where: { id: opts.campaignId, tenantId: opts.tenantId },
    include: { audiences: true },
  })
  if (!original) throw new Error(`Campanha "${opts.campaignId}" não encontrada neste tenant.`)

  const segments =
    opts.segments && opts.segments.length > 0
      ? opts.segments
      : campaignSegments(original as any)

  const created = await prisma.emailCampaign.create({
    data: {
      tenantId: opts.tenantId,
      name: opts.name?.trim() || `${original.name} (reenvio)`,
      subject: original.subject,
      htmlBody: original.htmlBody,
      category: original.category,
      templateId: original.templateId,
      senderName: original.senderName,
      senderEmail: original.senderEmail,
      segmentType: segments[0]?.segmentType || 'ALL',
      segmentValue: segments[0]?.segmentValue || null,
      status: 'DRAFT',
      audiences: {
        create: segments.map((s) => ({
          tenantId: opts.tenantId,
          segmentType: s.segmentType,
          segmentValue: s.segmentValue || null,
          label: s.label || null,
        })),
      },
    },
    include: { audiences: true },
  })

  return created
}
