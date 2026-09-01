export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

function canManage(role?: string | null) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

// Mascara a chave para exibição segura (nunca retorna a chave completa).
function maskKey(key: string | null): string {
  if (!key) return ''
  if (key.length <= 10) return '•'.repeat(key.length)
  return `${key.slice(0, 6)}${'•'.repeat(20)}${key.slice(-4)}`
}

// Estado sanitizado que a UI consome. Nunca expõe a chave completa.
function state(tenant: {
  resendApiKey: string | null
  resendEnabled: boolean
  resendFrom: string | null
  resendReplyTo: string | null
  resendSetAt: Date | null
}) {
  return {
    keySet: Boolean(tenant.resendApiKey),
    keyMasked: maskKey(tenant.resendApiKey),
    enabled: tenant.resendEnabled,
    from: tenant.resendFrom,
    replyTo: tenant.resendReplyTo,
    setAt: tenant.resendSetAt?.toISOString() || null,
  }
}

// GET: retorna o estado (mascarado) da configuração de email do tenant.
export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { resendApiKey: true, resendEnabled: true, resendFrom: true, resendReplyTo: true, resendSetAt: true },
  })
  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, ...state(tenant) })
}

// PUT: salva/atualiza a chave e os remetentes.
export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!canManage(user.role)) {
    return NextResponse.json({ error: 'Apenas administradores podem gerenciar a configuração de email.' }, { status: 403 })
  }
  const body = await req.json()

  const data: any = {}
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    data.resendApiKey = body.apiKey.trim()
    data.resendEnabled = true
    data.resendSetAt = new Date()
  }
  if (typeof body.from === 'string') data.resendFrom = body.from.trim() || null
  if (typeof body.replyTo === 'string') data.resendReplyTo = body.replyTo.trim() || null

  const updated = await prisma.tenant.update({
    where: { id: user.tenantId },
    data,
    select: { resendApiKey: true, resendEnabled: true, resendFrom: true, resendReplyTo: true, resendSetAt: true },
  })
  return NextResponse.json({ ok: true, ...state(updated) })
}

// PATCH: ativa/desativa o envio sem apagar a chave.
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!canManage(user.role)) {
    return NextResponse.json({ error: 'Apenas administradores podem gerenciar a configuração de email.' }, { status: 403 })
  }
  const { enabled } = await req.json()
  const updated = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { resendEnabled: !!enabled },
    select: { resendApiKey: true, resendEnabled: true, resendFrom: true, resendReplyTo: true, resendSetAt: true },
  })
  return NextResponse.json({ ok: true, ...state(updated) })
}

// DELETE: revoga a chave (remove e desativa).
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!canManage(user.role)) {
    return NextResponse.json({ error: 'Apenas administradores podem gerenciar a configuração de email.' }, { status: 403 })
  }
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      resendApiKey: null,
      resendEnabled: false,
      resendFrom: null,
      resendReplyTo: null,
      resendSetAt: null,
    },
  })
  return NextResponse.json({ ok: true })
}
