export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { CalendarBoard, CalendarEventRow, LeadOption, MemberOption } from '@/components/calendar/calendar-board'

export default async function CalendarPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null
  const canManage = user?.role !== 'MEMBER'

  const [events, leads, members] = tenantId
    ? await Promise.all([
        prisma.calendarEvent.findMany({
          where: { tenantId },
          include: { lead: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
          orderBy: { startsAt: 'asc' },
        }),
        prisma.lead.findMany({
          where: { tenantId, isArchived: false },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 200,
        }),
        prisma.user.findMany({
          where: { tenantId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ])
    : [[], [], []]

  const rows: CalendarEventRow[] = (events as any[]).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    status: e.status,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    allDay: e.allDay,
    location: e.location,
    meetingUrl: e.meetingUrl,
    leadId: e.leadId,
    leadName: e.lead?.name ?? null,
    assignedToId: e.assignedToId,
    assignedToName: e.assignedTo?.name ?? null,
  }))

  const leadOptions: LeadOption[] = (leads as any[]).map((l) => ({ id: l.id, name: l.name }))
  const memberOptions: MemberOption[] = (members as any[]).map((m) => ({ id: m.id, name: m.name }))

  return <CalendarBoard initial={rows} leads={leadOptions} members={memberOptions} canManage={canManage} />
}
