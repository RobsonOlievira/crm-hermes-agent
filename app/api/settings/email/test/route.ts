export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { sendEmail, isResendConfigured, defaultConfig, type ResendConfig } from '@/lib/resend'

interface TenantResend {
  resendApiKey: string | null
  resendFrom: string | null
  resendReplyTo: string | null
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

// POST: envia um email de teste para o usuário logado usando a config do tenant.
export async function POST() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: 'Usuário sem email cadastrado' }, { status: 400 })
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { resendApiKey: true, resendFrom: true, resendReplyTo: true },
    })
    const cfg = buildResendConfig(tenant)
    if (!isResendConfigured(cfg)) {
      return NextResponse.json(
        { error: 'Resend não configurado. Adicione sua chave da API para enviar emails.' },
        { status: 503 }
      )
    }

    const res = await sendEmail({
      to: user.email,
      subject: '[TESTE] Configuração de email',
      html: '<h2>Olá!</h2><p>Este é um email de teste para confirmar que a configuração de envio está funcionando corretamente.</p>',
      tags: [{ name: 'type', value: 'config-test' }],
    }, cfg)

    if (!res.ok) {
      return NextResponse.json({ error: 'Falha no envio: ' + (res.error || 'erro desconhecido') }, { status: 502 })
    }
    return NextResponse.json({ ok: true, to: user.email, resendId: res.id })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao enviar teste' }, { status: 500 })
  }
}
