import type { McpTool } from '../tools'
import { prisma } from '@/lib/db'
import { renderContract, hashContent, buildRenderData } from '@/lib/contracts/render'

// Ferramentas MCP do módulo de Contratos (tabela Contract, com template,
// render, hash e assinaturas). tenantId sempre vindo do token.
async function requireContract(tenantId: string, contractId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: { client: true, signatures: true, services: true },
  })
  if (!contract) throw new Error(`Contrato "${contractId}" não encontrado neste tenant.`)
  return contract
}

export const contractMcpTools: McpTool[] = [
  {
    name: 'criar_contrato',
    description:
      'Gera um CONTRATO real (rascunho) para um cliente, a partir de um template (ou do template padrão) com render de variáveis e hash de integridade. Informe os serviços para compor o objeto e o valor.',
    inputSchema: {
      type: 'object',
      properties: {
        clienteId: { type: 'string', description: 'ID do cliente.' },
        titulo: { type: 'string', description: 'Título do contrato (opcional).' },
        templateId: { type: 'string', description: 'ID do template (opcional; usa o padrão do tenant se omitido).' },
        servicos: {
          type: 'array',
          description: 'Lista de serviços: [{ descricao, quantidade?, precoUnitario? }].',
          items: { type: 'object' },
        },
        valorTotal: { type: 'number', description: 'Valor total do contrato (opcional).' },
        condicoesPagamento: { type: 'string', description: 'Condições de pagamento (opcional).' },
      },
      required: ['clienteId'],
    },
    handler: async (tenantId, args) => {
      const client = await prisma.client.findFirst({ where: { id: String(args.clienteId), tenantId } })
      if (!client) throw new Error(`Cliente "${args.clienteId}" não encontrado neste tenant.`)

      const [tenant, template] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: tenantId } }),
        args.templateId
          ? prisma.contractTemplate.findFirst({ where: { id: String(args.templateId), tenantId } })
          : prisma.contractTemplate.findFirst({ where: { tenantId, isDefault: true } }),
      ])

      const servicos = (Array.isArray(args.servicos) ? args.servicos : []).map((s: any) => ({
        catalogItemId: s.catalogItemId ?? null,
        description: String(s.descricao ?? s.description ?? 'Prestação de Serviços'),
        quantity: Number(s.quantidade ?? s.quantity ?? 1),
        unitPrice: Number(s.precoUnitario ?? s.unitPrice ?? 0),
      }))

      const data = buildRenderData(tenant, client, servicos, {
        totalValue: args.valorTotal,
        paymentTerms: args.condicoesPagamento ? String(args.condicoesPagamento) : undefined,
      })
      const bodyRendered = renderContract(template?.body ?? '', data)
      const contentHash = hashContent(bodyRendered)

      const contract = await prisma.contract.create({
        data: {
          tenantId,
          templateId: template?.id ?? null,
          clientId: client.id,
          title: args.titulo ? String(args.titulo) : `Contrato - ${client.name}`,
          status: 'DRAFT',
          bodyRendered,
          contentHash,
          totalValue: args.valorTotal !== undefined ? Number(args.valorTotal) : null,
          paymentTerms: args.condicoesPagamento ? String(args.condicoesPagamento) : null,
          providerSnapshot: JSON.stringify(data.empresa),
          clientSnapshot: JSON.stringify(data.cliente),
          services: { create: servicos },
        },
      })

      return { ok: true, contratoId: contract.id, status: contract.status, titulo: contract.title }
    },
  },
  {
    name: 'enviar_contrato',
    description:
      'Libera um contrato (rascunho) para assinatura do cliente: registra a assinatura do prestador e muda o status para PENDING_CLIENT. Retorna o link público de assinatura. Depois use enviar_contrato_email para enviar por e-mail.',
    inputSchema: {
      type: 'object',
      properties: { contratoId: { type: 'string' } },
      required: ['contratoId'],
    },
    handler: async (tenantId, args) => {
      const contract = await requireContract(tenantId, String(args.contratoId))
      if (contract.status !== 'DRAFT') throw new Error('Apenas contratos em rascunho podem ser enviados para assinatura.')

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
      const providerName = tenant?.legalRepName || tenant?.legalName || tenant?.name || 'Prestador'

      await prisma.$transaction(async (tx) => {
        await tx.contractSignature.create({
          data: {
            contractId: contract.id,
            signerRole: 'PROVIDER',
            signerName: providerName,
            signerEmail: tenant?.companyEmail ?? '',
            ipAddress: 'MCP',
            userAgent: 'Hermes Agent (MCP)',
            contentHash: contract.contentHash ?? '',
            contractVersion: contract.contentHash ?? '',
            signedAt: new Date(),
          },
        })
        await tx.contract.update({ where: { id: contract.id }, data: { status: 'PENDING_CLIENT' } })
      })

      const signUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/public/contracts/${contract.id}`
      return { ok: true, contratoId: contract.id, status: 'PENDING_CLIENT', linkAssinatura: signUrl }
    },
  },
  {
    name: 'listar_contratos',
    description:
      'Lista os contratos reais do CRM (tabela Contract), com cliente, status, valor e nº de assinaturas. Filtra por cliente e status (DRAFT, PENDING_PROVIDER, PENDING_CLIENT, SIGNED, CANCELLED, EXPIRED).',
    inputSchema: {
      type: 'object',
      properties: {
        clienteId: { type: 'string', description: 'Filtra por cliente (opcional).' },
        status: { type: 'string', description: 'Filtra por status (opcional).' },
        limite: { type: 'number', description: 'Máximo de resultados (padrão 50, máx 200).' },
      },
    },
    handler: async (tenantId, args) => {
      const limit = Math.min(Math.max(Number(args.limite) || 50, 1), 200)
      const where: any = { tenantId }
      if (args.clienteId) where.clientId = String(args.clienteId)
      if (args.status) where.status = String(args.status).toUpperCase()
      const contracts = await prisma.contract.findMany({
        where,
        include: { client: { select: { name: true } }, _count: { select: { signatures: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return {
        total: contracts.length,
        contratos: contracts.map((c) => ({
          id: c.id,
          titulo: c.title,
          status: c.status,
          cliente: c.client?.name ?? null,
          valorTotal: c.totalValue,
          assinaturas: c._count.signatures,
          criadoEm: c.createdAt.toISOString(),
        })),
      }
    },
  },
  {
    name: 'status_contrato',
    description: 'Retorna o status detalhado de um contrato e quem já assinou (prestador/cliente), com data e hash.',
    inputSchema: {
      type: 'object',
      properties: { contratoId: { type: 'string' } },
      required: ['contratoId'],
    },
    handler: async (tenantId, args) => {
      const contract = await requireContract(tenantId, String(args.contratoId))
      return {
        id: contract.id,
        titulo: contract.title,
        status: contract.status,
        cliente: contract.client?.name ?? null,
        valorTotal: contract.totalValue,
        linkAssinatura:
          contract.status === 'PENDING_CLIENT'
            ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/public/contracts/${contract.id}`
            : null,
        assinaturas: contract.signatures.map((s) => ({
          papel: s.signerRole,
          nome: s.signerName,
          assinadoEm: s.signedAt.toISOString(),
        })),
      }
    },
  },
]
