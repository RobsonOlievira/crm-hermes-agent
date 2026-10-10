import { prisma } from '@/lib/db'
import { decryptText, encryptText } from '@/lib/crypto'
import { sendEmailFromAccount } from '../email/email-service'

export interface GetFreeBusyInput {
  tenantId: string
  from: Date
  to: Date
  durationMinutes?: number
}

export interface FreeSlot {
  startsAt: string
  endsAt: string
  label: string
}

export interface CreateEventInput {
  tenantId: string
  title: string
  description?: string
  startsAt: Date
  endsAt: Date
  leadId?: string
  clientId?: string
  assignedToId?: string
  meetingUrl?: string
  createOnlineMeeting?: boolean
}

// Auxiliar para formatar data/hora ISO sem timezone drift
function formatISOString(d: Date): string {
  return d.toISOString()
}

export async function getFreeBusySlots(input: GetFreeBusyInput): Promise<FreeSlot[]> {
  const { tenantId, from, to, durationMinutes } = input

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  })

  if (!tenant) throw new Error('Tenant não encontrado')

  const slotMinutes = durationMinutes || tenant.slotDuration || 60
  const workingDays = tenant.workingDays || [1, 2, 3, 4, 5]
  const [startHourStr, startMinStr] = (tenant.workingHourFrom || '09:00').split(':')
  const [endHourStr, endMinStr] = (tenant.workingHourTo || '18:00').split(':')

  const startHour = parseInt(startHourStr, 10)
  const startMin = parseInt(startMinStr, 10)
  const endHour = parseInt(endHourStr, 10)
  const endMin = parseInt(endMinStr, 10)

  // 1. Buscar compromissos locais do CRM no período
  const localEvents = await prisma.calendarEvent.findMany({
    where: {
      tenantId,
      status: { not: 'CANCELED' },
      startsAt: { lte: to },
      endsAt: { gte: from },
    },
  })

  // 2. Buscar conta Google conectada para obter busy slots externos
  const googleAccount = await prisma.emailAccount.findFirst({
    where: { tenantId, provider: 'google', status: 'active' },
  })

  const busyIntervals: { start: Date; end: Date }[] = localEvents.map(e => ({
    start: new Date(e.startsAt),
    end: new Date(e.endsAt),
  }))

  if (googleAccount && googleAccount.accessToken) {
    try {
      let token = decryptText(googleAccount.accessToken)
      if (googleAccount.tokenExpiresAt && new Date(googleAccount.tokenExpiresAt) <= new Date()) {
        const refresh = decryptText(googleAccount.refreshToken || '')
        if (refresh) {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              refresh_token: refresh,
              grant_type: 'refresh_token',
            }),
          })
          const data = await tokenRes.json()
          if (data.access_token) {
            token = data.access_token
            await prisma.emailAccount.update({
              where: { id: googleAccount.id },
              data: {
                accessToken: encryptText(data.access_token),
                tokenExpiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
              },
            })
          }
        }
      }

      const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          timeZone: tenant.bookingTimezone || 'America/Sao_Paulo',
          items: [{ id: 'primary' }],
        }),
      })

      if (fbRes.ok) {
        const fbData = await fbRes.json()
        const primaryBusy = fbData.calendars?.primary?.busy || []
        for (const slot of primaryBusy) {
          busyIntervals.push({
            start: new Date(slot.start),
            end: new Date(slot.end),
          })
        }
      }
    } catch (err) {
      console.warn('[FreeBusy Google Fetch Warning]', err)
    }
  }

  // 3. Gerar slots disponíveis durante horário comercial
  const freeSlots: FreeSlot[] = []
  let cursor = new Date(from)

  while (cursor < to) {
    const dayOfWeek = cursor.getDay() // 0 = Dom ... 6 = Sáb

    if (workingDays.includes(dayOfWeek)) {
      const slotStart = new Date(cursor)
      slotStart.setHours(startHour, startMin, 0, 0)

      const workDayEnd = new Date(cursor)
      workDayEnd.setHours(endHour, endMin, 0, 0)

      let currentSlot = new Date(slotStart)

      while (currentSlot.getTime() + slotMinutes * 60000 <= workDayEnd.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + slotMinutes * 60000)

        // Verificar se colide com algum intervalo ocupado
        const isBusy = busyIntervals.some(busy => {
          return currentSlot < busy.end && slotEnd > busy.start
        })

        if (!isBusy && currentSlot >= from && currentSlot <= to) {
          freeSlots.push({
            startsAt: currentSlot.toISOString(),
            endsAt: slotEnd.toISOString(),
            label: `${currentSlot.toLocaleDateString('pt-BR')} ${currentSlot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          })
        }

        currentSlot = new Date(currentSlot.getTime() + slotMinutes * 60000)
      }
    }

    cursor.setDate(cursor.getDate() + 1)
    cursor.setHours(0, 0, 0, 0)
  }

  return freeSlots
}

export async function createCalendarEvent(input: CreateEventInput) {
  const {
    tenantId,
    title,
    description,
    startsAt,
    endsAt,
    leadId,
    clientId,
    assignedToId,
    meetingUrl: inputMeetingUrl,
    createOnlineMeeting = true,
  } = input

  let meetingUrl = inputMeetingUrl || null
  let googleEventId: string | null = null

  // 1. Verificar conta Google para criar no Google Calendar e gerar Meet
  const googleAccount = await prisma.emailAccount.findFirst({
    where: { tenantId, provider: 'google', status: 'active' },
  })

  if (googleAccount && googleAccount.accessToken) {
    try {
      let token = decryptText(googleAccount.accessToken)
      if (googleAccount.tokenExpiresAt && new Date(googleAccount.tokenExpiresAt) <= new Date()) {
        const refresh = decryptText(googleAccount.refreshToken || '')
        if (refresh) {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              refresh_token: refresh,
              grant_type: 'refresh_token',
            }),
          })
          const data = await tokenRes.json()
          if (data.access_token) {
            token = data.access_token
          }
        }
      }

      let leadEmail: string | null = null
      if (leadId) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } })
        if (lead?.email) leadEmail = lead.email
      } else if (clientId) {
        const client = await prisma.client.findUnique({ where: { id: clientId } })
        if (client?.email) leadEmail = client.email
      }

      const postBody: any = {
        summary: title,
        description: description || 'Agendamento via CRM Hermes Agent',
        start: { dateTime: startsAt.toISOString() },
        end: { dateTime: endsAt.toISOString() },
      }

      if (leadEmail) {
        postBody.attendees = [{ email: leadEmail }]
      }

      if (createOnlineMeeting) {
        postBody.conferenceData = {
          createRequest: {
            requestId: `crm-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        }
      }

      const eventRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postBody),
        }
      )

      if (eventRes.ok) {
        const eventData = await eventRes.json()
        googleEventId = eventData.id
        if (eventData.hangoutLink) {
          meetingUrl = eventData.hangoutLink
        }
      }
    } catch (err) {
      console.warn('[Google Event Creation Warning]', err)
    }
  }

  // 2. Criar evento no banco de dados local
  const event = await prisma.calendarEvent.create({
    data: {
      tenantId,
      title,
      description,
      startsAt,
      endsAt,
      leadId,
      clientId,
      assignedToId,
      meetingUrl,
      googleEventId,
      syncSource: googleEventId ? 'google' : 'local',
      syncStatus: 'synced',
    },
  })

  // 3. Registrar Interaction
  await prisma.interaction.create({
    data: {
      tenantId,
      leadId,
      clientId,
      userId: assignedToId,
      type: 'MEETING_SCHEDULED',
      title: `Reunião agendada: ${title}`,
      content: `Data: ${startsAt.toLocaleString('pt-BR')}${meetingUrl ? ` | Link: ${meetingUrl}` : ''}`,
    },
  })

  // 4. Se houver lead com email, enviar confirmação por email automático
  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (lead?.email) {
      try {
        const emailContent = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Reunião Agendada com Sucesso!</h2>
            <p>Olá, <strong>${lead.name}</strong>,</p>
            <p>Sua reunião foi agendada para <strong>${startsAt.toLocaleDateString('pt-BR')} às ${startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>.</p>
            ${meetingUrl ? `<p><strong>Link da videochamada:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>` : ''}
            <p>Atenciosamente,<br/>Equipe de Atendimento</p>
          </div>
        `
        await sendEmailFromAccount({
          tenantId,
          to: lead.email,
          subject: `Confirmação de Reunião: ${title}`,
          html: emailContent,
          leadId: lead.id,
        })
      } catch (emailErr) {
        console.warn('[Email Confirmação Reunião Warning]', emailErr)
      }
    }
  }

  return event
}
