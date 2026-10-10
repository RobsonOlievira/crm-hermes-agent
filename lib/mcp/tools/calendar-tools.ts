import type { McpTool } from '../tools'
import { prisma } from '@/lib/db'
import { getFreeBusySlots, createCalendarEvent } from '@/lib/services/calendar/calendar-service'

// Ferramentas MCP de Agenda. O tenantId vem SEMPRE do token (nunca dos args),
// e qualquer leadId/clientId/eventId é validado contra o tenant antes de agir.
export const agendaMcpTools: McpTool[] = [
  {
    name: 'verificar_disponibilidade',
    description:
      'Consulta horários livres na agenda (CRM + Google Calendar conectado) dentro de um período, respeitando dias/horário comercial do tenant. Use para sugerir agendamentos sem choque de horário.',
    inputSchema: {
      type: 'object',
      properties: {
        de: { type: 'string', description: 'Data/hora inicial ISO 8601.' },
        ate: { type: 'string', description: 'Data/hora final ISO 8601.' },
        duracaoMinutos: { type: 'number', description: 'Duração desejada da reunião em minutos (padrão: configuração do tenant, geralmente 60).' },
      },
      required: ['de', 'ate'],
    },
    handler: async (tenantId, args) => {
      const slots = await getFreeBusySlots({
        tenantId,
        from: new Date(String(args.de)),
        to: new Date(String(args.ate)),
        durationMinutes: args.duracaoMinutos ? Number(args.duracaoMinutos) : undefined,
      })
      return { total: slots.length, horariosLivres: slots }
    },
  },
  {
    name: 'agendar_reuniao',
    description:
      'Cria uma reunião na agenda. Se houver Google Calendar conectado, gera o link do Google Meet e envia confirmação por e-mail ao lead. Informe leadId OU clientId (opcional).',
    inputSchema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Título da reunião.' },
        descricao: { type: 'string', description: 'Pauta/descrição (opcional).' },
        inicio: { type: 'string', description: 'Início em ISO 8601.' },
        fim: { type: 'string', description: 'Término em ISO 8601.' },
        leadId: { type: 'string', description: 'ID do lead (opcional).' },
        clientId: { type: 'string', description: 'ID do cliente (opcional).' },
        gerarMeet: { type: 'boolean', description: 'Se true (padrão), cria link do Google Meet quando houver conta Google conectada.' },
      },
      required: ['titulo', 'inicio', 'fim'],
    },
    handler: async (tenantId, args) => {
      if (args.leadId) {
        const lead = await prisma.lead.findFirst({ where: { id: String(args.leadId), tenantId }, select: { id: true } })
        if (!lead) throw new Error(`Lead "${args.leadId}" não encontrado neste tenant.`)
      }
      if (args.clientId) {
        const client = await prisma.client.findFirst({ where: { id: String(args.clientId), tenantId }, select: { id: true } })
        if (!client) throw new Error(`Cliente "${args.clientId}" não encontrado neste tenant.`)
      }
      const event = await createCalendarEvent({
        tenantId,
        title: String(args.titulo),
        description: args.descricao ? String(args.descricao) : undefined,
        startsAt: new Date(String(args.inicio)),
        endsAt: new Date(String(args.fim)),
        leadId: args.leadId ? String(args.leadId) : undefined,
        clientId: args.clientId ? String(args.clientId) : undefined,
        createOnlineMeeting: args.gerarMeet !== false,
      })
      return { ok: true, eventoId: event.id, linkReuniao: event.meetingUrl }
    },
  },
]
