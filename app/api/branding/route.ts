export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const data: Record<string, string> = {}
    if (typeof body?.tenantName === 'string') data.name = body.tenantName
    if (typeof body?.primaryColor === 'string') data.primaryColor = body.primaryColor
    if (typeof body?.secondaryColor === 'string') data.secondaryColor = body.secondaryColor
    if (typeof body?.logoUrl === 'string') data.logoUrl = body.logoUrl
    const tenant = await prisma.tenant.update({ where: { id: user.tenantId }, data })
    return NextResponse.json({ tenant })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao salvar branding' }, { status: 500 })
  }
}
