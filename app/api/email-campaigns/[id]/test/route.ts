export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { sendEmail, isResendConfigured, defaultConfig, type ResendConfig } from '@/lib/resend'

interface TenantResend {
  resendApiKey: string | null
  resendFrom: string | null
  resendReplyTo: string | null
  resendEnabled: boolean
}

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

// POST: envia um email de teste real para o usuário logado.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    })
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (!user.email) return NextResponse.json({ error: 'Usuário sem email para envio de teste' }, { status: 400 })

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

    const first = (user.name || 'Teste').split(' ')[0] || 'Teste'
    const html = campaign.htmlBody
      .replace(/\{\{primeiro_nome\}\}/g, first)
      .replace(/\{\{nome\}\}/g, user.name || 'Teste')
      .replace(/\{\{email\}\}/g, user.email)

    const res = await sendEmail({
      to: user.email,
      subject: '[TESTE] ' + campaign.subject,
      html,
      tags: [
        { name: 'campaign_id', value: campaign.id },
        { name: 'type', value: 'test' },
      ],
    }, cfg)

    if (!res.ok) {
      return NextResponse.json({ error: 'Falha no envio: ' + (res.error || 'erro desconhecido') }, { status: 502 })
    }
    return NextResponse.json({ ok: true, resendId: res.id, to: user.email })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao enviar teste' }, { status: 500 })
  }
}
