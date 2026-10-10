import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getFreeBusySlots } from '@/lib/services/calendar/calendar-service'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fromStr = searchParams.get('from') || new Date().toISOString()
    const toStr = searchParams.get('to') || new Date(Date.now() + 7 * 86400000).toISOString()
    const duration = searchParams.get('duration') ? parseInt(searchParams.get('duration')!, 10) : undefined

    const slots = await getFreeBusySlots({
      tenantId: user.tenantId,
      from: new Date(fromStr),
      to: new Date(toStr),
      durationMinutes: duration,
    })

    return NextResponse.json({ slots })
  } catch (err: any) {
    console.error('[GET /api/calendar/freebusy]', err)
    return NextResponse.json({ error: err?.message || 'Erro ao consultar disponibilidade' }, { status: 500 })
  }
}
