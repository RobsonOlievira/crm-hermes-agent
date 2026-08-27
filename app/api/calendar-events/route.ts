export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

const ALLOWED_TYPES = ['MEETING', 'CALL', 'FOLLOWUP', 'TASK', 'DEADLINE', 'OTHER']
const ALLOWED_STATUS = ['SCHEDULED', 'DONE', 'CANCELED']

// Lista os eventos da agenda do tenant. Aceita filtro opcional por intervalo (?from&to ISO).
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const where: any = { tenantId: user.tenantId }
    if (from || to) {
      where.startsAt = {}
      if (from) where.startsAt.gte = new Date(from)
      if (to) where.startsAt.lte = new Date(to)
    }
    const events = await prisma.calendarEvent.findMany({
      where,
      include: { lead: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
      orderBy: { startsAt: 'asc' },
    })
    return NextResponse.json({ events })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao carregar a agenda' }, { status: 500 })
  }
}

// Cria um novo evento na agenda.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body?.title?.trim()) return NextResponse.json({ error: 'Informe um título para o evento' }, { status: 400 })
    if (!body?.startsAt) return NextResponse.json({ error: 'Informe a data e hora de início' }, { status: 400 })
    const startsAt = new Date(body.startsAt)
    if (isNaN(startsAt.getTime())) return NextResponse.json({ error: 'Data de início inválida' }, { status: 400 })
    let endsAt = body.endsAt ? new Date(body.endsAt) : new Date(startsAt.getTime() + 30 * 60 * 1000)
    if (isNaN(endsAt.getTime()) || endsAt < startsAt) endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000)
    const type = ALLOWED_TYPES.includes(body.type) ? body.type : 'MEETING'
    const status = ALLOWED_STATUS.includes(body.status) ? body.status : 'SCHEDULED'
    const created = await prisma.calendarEvent.create({
      data: {
        tenantId: user.tenantId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        type,
        status,
        startsAt,
        endsAt,
        allDay: Boolean(body.allDay),
        location: body.location?.trim() || null,
        meetingUrl: body.meetingUrl?.trim() || null,
        leadId: body.leadId || null,
        assignedToId: body.assignedToId || null,
        reminderMinutes: Number.isFinite(Number(body.reminderMinutes)) ? Math.max(0, Math.round(Number(body.reminderMinutes))) : null,
        syncSource: 'local',
      },
      include: { lead: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ event: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar o evento' }, { status: 500 })
  }
}
