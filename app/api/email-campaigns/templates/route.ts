export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ templates })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao carregar templates' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body?.name?.trim()) return NextResponse.json({ error: 'Informe o nome do template' }, { status: 400 })
    if (!body?.subject?.trim()) return NextResponse.json({ error: 'Informe o assunto do template' }, { status: 400 })
    const created = await prisma.emailTemplate.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        subject: body.subject.trim(),
        htmlBody: typeof body.htmlBody === 'string' ? body.htmlBody : '',
        category: typeof body.category === 'string' && body.category ? body.category : 'broadcast',
        variables: Array.isArray(body.variables) ? body.variables.map((v: any) => String(v)) : [],
      },
    })
    return NextResponse.json({ template: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar template' }, { status: 500 })
  }
}
