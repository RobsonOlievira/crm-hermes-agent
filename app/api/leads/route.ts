export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { queryLeads } from '@/lib/leads-list'

// GET /api/leads — lista paginada (rolagem infinita da tela de Leads)
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const sp = new URL(req.url).searchParams
    const mine = sp.get('mine') === '1' || user.role === 'MEMBER'
    const result = await queryLeads(user.tenantId, {
      search: sp.get('search') ?? undefined,
      status: sp.get('status') ?? undefined,
      source: sp.get('source') ?? undefined,
      leadTypeId: sp.get('leadType') ?? undefined,
      assigneeId: mine ? user.id : sp.get('assignee') ?? undefined,
      sortKey: sp.get('sort') ?? undefined,
      sortDir: sp.get('dir') ?? undefined,
      offset: Number(sp.get('offset')) || 0,
      limit: Number(sp.get('limit')) || undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/leads]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
