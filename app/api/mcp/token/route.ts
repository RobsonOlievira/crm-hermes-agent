export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { generateMcpToken } from '@/lib/mcp/auth'

function canManage(role?: string | null) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

// POST: gera (ou regenera) o token de conexão MCP do tenant.
export async function POST() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!canManage(user.role)) return NextResponse.json({ error: 'Apenas administradores podem gerenciar a integração MCP.' }, { status: 403 })
  const token = generateMcpToken()
  const tenant = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { mcpToken: token, mcpTokenSetAt: new Date(), mcpEnabled: true },
    select: { mcpToken: true, mcpEnabled: true, mcpTokenSetAt: true },
  })
  return NextResponse.json({ ok: true, ...tenant })
}

// PATCH: ativa/desativa a integração sem apagar o token.
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!canManage(user.role)) return NextResponse.json({ error: 'Apenas administradores podem gerenciar a integração MCP.' }, { status: 403 })
  const { enabled } = await req.json()
  const tenant = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { mcpEnabled: !!enabled },
    select: { mcpToken: true, mcpEnabled: true, mcpTokenSetAt: true },
  })
  return NextResponse.json({ ok: true, ...tenant })
}

// DELETE: revoga o token (remove e desativa).
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!canManage(user.role)) return NextResponse.json({ error: 'Apenas administradores podem gerenciar a integração MCP.' }, { status: 403 })
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { mcpToken: null, mcpTokenSetAt: null, mcpEnabled: false },
  })
  return NextResponse.json({ ok: true })
}
