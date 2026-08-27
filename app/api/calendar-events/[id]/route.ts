export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

const ALLOWED_TYPES = ['MEETING', 'CALL', 'FOLLOWUP', 'TASK', 'DEADLINE', 'OTHER']
const ALLOWED_STATUS = ['SCHEDULED', 'DONE', 'CANCELED']

// Atualiza um evento da agenda (edição parcial, incluindo reagendamento e mudança de status).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const data: any = {}
    if (typeof body.title === 'string') data.title = body.title.trim()
    if ('description' in body) data.description = body.description?.trim() || null
    if (ALLOWED_TYPES.includes(body.type)) data.type = body.type
    if (ALLOWED_STATUS.includes(body.status)) data.status = body.status
    if (body.startsAt) {
      const s = new Date(body.startsAt)
      if (!isNaN(s.getTime())) data.startsAt = s
    }
    if (body.endsAt) {
      const e = new Date(body.endsAt)
      if (!isNaN(e.getTime())) data.endsAt = e
    }
    if ('allDay' in body) data.allDay = Boolean(body.allDay)
    if ('location' in body) data.location = body.location?.trim() || null
    if ('meetingUrl' in body) data.meetingUrl = body.meetingUrl?.trim() || null
    if ('leadId' in body) data.leadId = body.leadId || null
    if ('assignedToId' in body) data.assignedToId = body.assignedToId || null
    if ('reminderMinutes' in body) data.reminderMinutes = Number.isFinite(Number(body.reminderMinutes)) ? Math.max(0, Math.round(Number(body.reminderMinutes))) : null
    const updated = await prisma.calendarEvent.update({
      where: { id: params.id },
      data,
      include: { lead: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ event: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar o evento' }, { status: 500 })
  }
}

// Remove um evento da agenda.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    await prisma.calendarEvent.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir o evento' }, { status: 500 })
  }
}
