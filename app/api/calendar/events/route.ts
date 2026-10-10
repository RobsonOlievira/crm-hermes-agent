import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { createCalendarEvent } from '@/lib/services/calendar/calendar-service'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      startsAt,
      endsAt,
      leadId,
      clientId,
      assignedToId,
      meetingUrl,
      createOnlineMeeting = true,
    } = body

    if (!title || !startsAt || !endsAt) {
      return NextResponse.json({ error: 'Campos obrigatórios: title, startsAt, endsAt' }, { status: 400 })
    }

    const event = await createCalendarEvent({
      tenantId: user.tenantId,
      title,
      description,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      leadId,
      clientId,
      assignedToId: assignedToId || user.id,
      meetingUrl,
      createOnlineMeeting,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/calendar/events]', err)
    return NextResponse.json({ error: err?.message || 'Erro ao criar evento de agenda' }, { status: 500 })
  }
}
