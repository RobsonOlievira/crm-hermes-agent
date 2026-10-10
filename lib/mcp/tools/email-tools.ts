import type { McpTool } from '../tools'
import { prisma } from '@/lib/db'
import { sendEmailFromAccount } from '@/lib/services/email/email-service'

// Ferramentas MCP de E-mail 1:1. tenantId vem do token; leadId/clientId/contractId
// são validados contra o tenant antes do envio.
export const emailMcpTools: McpTool[] = [
  {
    name: 'enviar_email',
    description:
      'Envia um e-mail 1:1 para um lead ou cliente usando a conta de e-mail conectada do tenant. Informe o destinatário e, opcionalmente, leadId/clientId para registrar no histórico.',
    inputSchema: {
      type: 'object',
      properties: {
        destinatario: { type: 'string', description: 'E-mail do destinatário.' },
        assunto: { type: 'string', description: 'Assunto do e-mail.' },
        html: { type: 'string', description: 'Conteúdo em HTML (ou texto) do e-mail.' },
        leadId: { type: 'string', description: 'ID do lead (opcional).' },
        clientId: { type: 'string', description: 'ID do cliente (opcional).' },
      },
      required: ['destinatario', 'assunto', 'html'],
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
      const msg = await sendEmailFromAccount({
        tenantId,
        to: String(args.destinatario),
        subject: String(args.assunto),
        html: String(args.html),
        leadId: args.leadId ? String(args.leadId) : undefined,
        clientId: args.clientId ? String(args.clientId) : undefined,
      })
      return { ok: true, mensagemId: msg.id, enviadoEm: msg.sentAt }
    },
  },
  {
    name: 'enviar_contrato_email',
    description:
      'Envia por e-mail o link de assinatura eletrônica de um contrato (da caixa conectada do tenant). O contrato precisa já estar enviado para assinatura (status PENDING_CLIENT) — use enviar_contrato antes.',
    inputSchema: {
      type: 'object',
      properties: {
        contractId: { type: 'string', description: 'ID do contrato.' },
        destinatario: { type: 'string', description: 'E-mail do cliente/lead.' },
      },
      required: ['contractId', 'destinatario'],
    },
    handler: async (tenantId, args) => {
      const contract = await prisma.contract.findFirst({
        where: { id: String(args.contractId), tenantId },
      })
      if (!contract) throw new Error(`Contrato "${args.contractId}" não encontrado neste tenant.`)
      if (contract.status === 'DRAFT') throw new Error('Contrato ainda é rascunho. Use enviar_contrato para liberá-lo para assinatura antes de enviar o link.')

      const signUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/public/contracts/${contract.id}`
      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2>Contrato Disponível para Assinatura Eletrônica</h2>
          <p>Olá,</p>
          <p>Seu contrato <strong>"${contract.title}"</strong> já está pronto para leitura e assinatura eletrônica.</p>
          <p style="margin: 24px 0;">
            <a href="${signUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Visualizar e Assinar Contrato
            </a>
          </p>
          <p style="font-size: 12px; color: #777;">Link de acesso: ${signUrl}</p>
        </div>
      `
      const msg = await sendEmailFromAccount({
        tenantId,
        to: String(args.destinatario),
        subject: `Contrato para Assinatura: ${contract.title}`,
        html,
        clientId: contract.clientId || undefined,
        leadId: contract.leadId || undefined,
      })
      return { ok: true, mensagemId: msg.id, linkAssinatura: signUrl }
    },
  },
]
