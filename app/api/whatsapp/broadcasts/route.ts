export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { listWaBroadcasts, createWaBroadcast } from '@/lib/whatsapp-broadcast'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const broadcasts = await listWaBroadcasts(user.tenantId)
    return NextResponse.json({ broadcasts })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao listar disparos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.title || !body.templateId) {
      return NextResponse.json({ error: 'Título e Template são obrigatórios' }, { status: 400 })
    }

    const { broadcast, recipientCount } = await createWaBroadcast(user.tenantId, {
      title: body.title,
      templateId: body.templateId,
      targetFilters: body.targetFilters,
      variableMapping: body.variableMapping,
    })

    return NextResponse.json({ broadcast, recipientCount }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao criar disparo' }, { status: 500 })
  }
}
