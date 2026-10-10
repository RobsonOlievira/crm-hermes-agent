import type { McpTool } from '../tools'
import { prisma } from '@/lib/db'
import { onProjectCreated, onInstallmentPaid } from '@/lib/cashflow-engine'
import { getOrSeedChecklistStages, buildChecklistSnapshot, type ChecklistItem } from '@/lib/project-checklist'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function parseChecklist(raw?: string | null): ChecklistItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function projectView(p: any) {
  const checklist = parseChecklist(p.checklist)
  const pagas = (p.installments ?? []).filter((i: any) => i.paid)
  const recebido = pagas.reduce((s: number, i: any) => s + (i.paidAmount ?? i.amount), 0)
  return {
    id: p.id,
    nome: p.name,
    status: p.status,
    cliente: p.client?.name ?? null,
    valorTotal: p.totalValue,
    recebido: round2(recebido),
    aReceber: round2(p.totalValue - recebido),
    parcelas: (p.installments ?? []).length,
    parcelasPagas: pagas.length,
    checklist: checklist.length
      ? `${checklist.filter((c) => c.done).length}/${checklist.length}`
      : null,
    dataEntrada: p.proposalDate ? p.proposalDate.toISOString() : null,
    dataPlanejada: p.plannedDate ? p.plannedDate.toISOString() : null,
    inicio: p.startDate ? p.startDate.toISOString() : null,
  }
}

async function requireProject(tenantId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    include: { client: true, installments: { orderBy: { number: 'asc' } } },
  })
  if (!project) throw new Error(`Projeto "${projectId}" não encontrado neste tenant.`)
  return project
}

export const financeMcpTools: McpTool[] = [
  {
    name: 'listar_projetos',
    description:
      'Lista projetos e propostas do CRM. Filtra por status (PROPOSAL, ENTRY, IN_PROGRESS, CLOSED, PAID, CANCELLED), cliente, texto e limite. PROPOSAL = negociação ainda não iniciada.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Status do projeto (opcional).' },
        clienteId: { type: 'string', description: 'Filtra por cliente (opcional).' },
        busca: { type: 'string', description: 'Texto no nome do projeto (opcional).' },
        limite: { type: 'number', description: 'Máximo de resultados (padrão 25, máx 100).' },
      },
    },
    handler: async (tenantId, args) => {
      const limit = Math.min(Math.max(Number(args.limite) || 25, 1), 100)
      const where: any = { tenantId }
      if (args.status) where.status = String(args.status).toUpperCase()
      if (args.clienteId) where.clientId = String(args.clienteId)
      if (args.busca) where.name = { contains: String(args.busca), mode: 'insensitive' }
      const projects = await prisma.project.findMany({
        where,
        include: { client: { select: { name: true } }, installments: { orderBy: { number: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return { total: projects.length, projetos: projects.map(projectView) }
    },
  },
  {
    name: 'criar_proposta',
    description:
      'Cria uma PROPOSTA (negociação em andamento). Não gera parcelas nem entra no fluxo de caixa até ser iniciada. Informe clienteId OU novoCliente { nome, telefone }.',
    inputSchema: {
      type: 'object',
      properties: {
        clienteId: { type: 'string', description: 'ID de cliente existente (use este OU novoCliente).' },
        novoClienteNome: { type: 'string', description: 'Nome para criar um novo cliente (se não houver clienteId).' },
        novoClienteTelefone: { type: 'string', description: 'Telefone/WhatsApp do novo cliente.' },
        tema: { type: 'string', description: 'Tema/serviço proposto (nome da proposta).' },
        valor: { type: 'number', description: 'Valor proposto em reais.' },
        dataEntrada: { type: 'string', description: 'Data de entrada do contato ISO 8601 (opcional; padrão hoje).' },
        dataPlanejada: { type: 'string', description: 'Data planejada de execução ISO 8601 (opcional).' },
      },
      required: ['tema', 'valor'],
    },
    handler: async (tenantId, args) => {
      let clientId = args.clienteId ? String(args.clienteId) : ''
      if (clientId) {
        const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } })
        if (!client) throw new Error(`Cliente "${clientId}" não encontrado neste tenant.`)
      } else if (args.novoClienteNome) {
        const created = await prisma.client.create({
          data: {
            tenantId,
            name: String(args.novoClienteNome).trim(),
            phone: args.novoClienteTelefone ? String(args.novoClienteTelefone).trim() : '',
            status: 'PROSPECTADO',
          },
        })
        clientId = created.id
      } else {
        throw new Error('Informe clienteId ou novoClienteNome.')
      }

      const plannedDate = args.dataPlanejada ? new Date(String(args.dataPlanejada)) : null
      const proposalDate = args.dataEntrada ? new Date(String(args.dataEntrada)) : new Date()
      const stages = await getOrSeedChecklistStages(tenantId)
      const checklist = buildChecklistSnapshot(stages)

      const project = await prisma.project.create({
        data: {
          tenantId,
          clientId,
          name: String(args.tema),
          status: 'PROPOSAL',
          totalValue: Number(args.valor),
          startDate: plannedDate ?? proposalDate,
          proposalDate,
          plannedDate,
          checklist: JSON.stringify(checklist),
        },
      })

      await prisma.interaction.create({
        data: {
          tenantId,
          clientId,
          type: 'NOTE',
          title: `Proposta registrada: ${project.name}`,
          content: `Valor proposto: R$ ${Number(args.valor).toFixed(2)}`,
          amount: Number(args.valor),
        },
      })

      return { ok: true, propostaId: project.id, status: project.status }
    },
  },
  {
    name: 'iniciar_proposta',
    description:
      'Aprova/inicia uma proposta: vira projeto IN_PROGRESS na data informada, gera as parcelas e provisiona o fluxo de caixa no mês de competência.',
    inputSchema: {
      type: 'object',
      properties: {
        projetoId: { type: 'string', description: 'ID da proposta.' },
        dataInicio: { type: 'string', description: 'Data de início/competência ISO 8601.' },
        parcelas: { type: 'number', description: 'Número de parcelas (padrão 1).' },
      },
      required: ['projetoId', 'dataInicio'],
    },
    handler: async (tenantId, args) => {
      const project = await requireProject(tenantId, String(args.projetoId))
      if (project.status !== 'PROPOSAL') throw new Error('Este projeto não está em negociação (PROPOSAL).')

      const effectiveStart = new Date(String(args.dataInicio))
      const count = Math.max(1, Number(args.parcelas) || 1)

      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'IN_PROGRESS', startDate: effectiveStart },
      })

      const createdInstallments = []
      if (project.installments.length === 0) {
        for (let i = 0; i < count; i++) {
          const amount = project.totalValue / count
          const dueDate = new Date(effectiveStart.getTime() + i * 30 * 86400000)
          const inst = await prisma.projectInstallment.create({
            data: { tenantId, projectId: project.id, number: i + 1, amount, dueDate },
          })
          createdInstallments.push(inst)
        }
        await onProjectCreated({
          projectId: project.id,
          tenantId,
          projectName: project.name,
          clientId: project.clientId,
          startDate: effectiveStart,
          installments: createdInstallments,
        })
      }

      await prisma.interaction.create({
        data: {
          tenantId,
          clientId: project.clientId,
          type: 'STATUS_CHANGE',
          title: `Proposta aprovada → projeto iniciado: ${project.name}`,
          amount: project.totalValue,
        },
      })

      return { ok: true, projetoId: project.id, parcelasCriadas: createdInstallments.length }
    },
  },
  {
    name: 'atualizar_checklist_projeto',
    description:
      'Marca ou desmarca uma etapa do checklist de um projeto/proposta. Informe a etapa pelo rótulo (ex.: "Roteiro Aprovado") ou pelo índice (0-based).',
    inputSchema: {
      type: 'object',
      properties: {
        projetoId: { type: 'string', description: 'ID do projeto.' },
        etapa: { type: 'string', description: 'Rótulo da etapa (ou use indice).' },
        indice: { type: 'number', description: 'Índice da etapa (0-based), alternativa ao rótulo.' },
        concluido: { type: 'boolean', description: 'true para marcar como concluída, false para desmarcar.' },
      },
      required: ['projetoId', 'concluido'],
    },
    handler: async (tenantId, args) => {
      const project = await requireProject(tenantId, String(args.projetoId))
      const checklist = parseChecklist(project.checklist)
      if (checklist.length === 0) throw new Error('Este projeto não tem checklist configurado.')

      let idx = -1
      if (typeof args.indice === 'number') idx = Number(args.indice)
      else if (args.etapa) idx = checklist.findIndex((c) => c.label.toLowerCase() === String(args.etapa).toLowerCase())
      if (idx < 0 || idx >= checklist.length) throw new Error('Etapa não encontrada. Use listar_projetos para ver o checklist.')

      const done = Boolean(args.concluido)
      checklist[idx] = { ...checklist[idx], done, doneAt: done ? new Date().toISOString() : null }
      await prisma.project.update({ where: { id: project.id }, data: { checklist: JSON.stringify(checklist) } })

      return {
        ok: true,
        etapa: checklist[idx].label,
        concluido: done,
        progresso: `${checklist.filter((c) => c.done).length}/${checklist.length}`,
      }
    },
  },
  {
    name: 'listar_parcelas',
    description: 'Lista as parcelas de um projeto, com valor, vencimento e status de pagamento.',
    inputSchema: {
      type: 'object',
      properties: { projetoId: { type: 'string' } },
      required: ['projetoId'],
    },
    handler: async (tenantId, args) => {
      const project = await requireProject(tenantId, String(args.projetoId))
      return {
        projeto: project.name,
        parcelas: project.installments.map((i) => ({
          id: i.id,
          numero: i.number,
          valor: i.amount,
          vencimento: i.dueDate.toISOString(),
          paga: i.paid,
          valorPago: i.paidAmount,
          pagaEm: i.paidAt ? i.paidAt.toISOString() : null,
          metodo: i.paymentMethod,
        })),
      }
    },
  },
  {
    name: 'registrar_pagamento_parcela',
    description:
      'Marca uma parcela de projeto como paga. Dispara toda a cascata financeira (entrada no caixa, Purchase, lifetimeValue, saldo de conta bancária e, se todas pagas, status PAID). Identifique a parcela por parcelaId OU por numero.',
    inputSchema: {
      type: 'object',
      properties: {
        projetoId: { type: 'string', description: 'ID do projeto.' },
        parcelaId: { type: 'string', description: 'ID da parcela (use este OU numero).' },
        numero: { type: 'number', description: 'Número da parcela (alternativa a parcelaId).' },
        valorPago: { type: 'number', description: 'Valor efetivamente pago (opcional; padrão o valor da parcela).' },
        metodo: { type: 'string', description: 'Forma de pagamento (pix, boleto, etc.) — opcional.' },
        contaBancariaId: { type: 'string', description: 'ID da conta bancária que recebeu (opcional).' },
      },
      required: ['projetoId'],
    },
    handler: async (tenantId, args) => {
      const project = await requireProject(tenantId, String(args.projetoId))
      let installment = args.parcelaId
        ? project.installments.find((i) => i.id === String(args.parcelaId))
        : typeof args.numero === 'number'
          ? project.installments.find((i) => i.number === Number(args.numero))
          : undefined
      if (!installment) throw new Error('Parcela não encontrada. Informe parcelaId ou numero válido.')
      if (installment.paid) throw new Error('Parcela já está paga.')

      if (args.contaBancariaId) {
        const acc = await prisma.bankAccount.findFirst({ where: { id: String(args.contaBancariaId), tenantId }, select: { id: true } })
        if (!acc) throw new Error(`Conta bancária "${args.contaBancariaId}" não encontrada neste tenant.`)
      }

      const result = await onInstallmentPaid({
        installmentId: installment.id,
        tenantId,
        paidAmount: args.valorPago !== undefined ? Number(args.valorPago) : installment.amount,
        paymentMethod: args.metodo ? String(args.metodo) : undefined,
        bankAccountId: args.contaBancariaId ? String(args.contaBancariaId) : undefined,
      })

      return { ok: true, parcelaId: installment.id, projetoQuitado: result.allPaid }
    },
  },
  {
    name: 'resumo_fluxo_caixa',
    description:
      'Resumo do fluxo de caixa de um ano (e opcionalmente um mês): faturamento projetado, recebido, receitas extras, despesas e saldo. Baseado nos projetos (competência = início) e no fluxo mensal.',
    inputSchema: {
      type: 'object',
      properties: {
        ano: { type: 'number', description: 'Ano (ex.: 2026). Padrão: ano atual.' },
        mes: { type: 'number', description: 'Mês 0-11 (opcional). Se omitido, retorna o ano todo.' },
      },
    },
    handler: async (tenantId, args) => {
      const year = Number(args.ano) || new Date().getFullYear()
      const hasMonth = typeof args.mes === 'number'
      const month = hasMonth ? Number(args.mes) : null

      const periodStart = hasMonth ? new Date(year, month as number, 1) : new Date(year, 0, 1)
      const periodEnd = hasMonth ? new Date(year, (month as number) + 1, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59)

      const projects = await prisma.project.findMany({
        where: {
          tenantId,
          status: { not: 'PROPOSAL' },
          startDate: { gte: periodStart, lte: periodEnd },
        },
        include: { installments: true },
      })

      const receitaProjetada = projects.reduce((s, p) => s + p.totalValue, 0)
      const receitaRealizada = projects.reduce(
        (s, p) => s + p.installments.filter((i) => i.paid).reduce((a, i) => a + (i.paidAmount ?? i.amount), 0),
        0,
      )

      const cashFlows = await prisma.monthlyCashFlow.findMany({
        where: { tenantId, year, ...(hasMonth ? { month: month as number } : {}) },
        include: { expenses: true, extraRevenues: true },
      })
      const receitaExtra = cashFlows.reduce((s, cf) => s + cf.extraRevenues.reduce((a, r) => a + r.amount, 0), 0)
      const despesas = cashFlows.reduce((s, cf) => s + cf.expenses.reduce((a, e) => a + e.amount, 0), 0)

      return {
        periodo: hasMonth ? `${String((month as number) + 1).padStart(2, '0')}/${year}` : String(year),
        projetos: projects.length,
        faturamentoProjetado: round2(receitaProjetada),
        recebidoRealizado: round2(receitaRealizada),
        aReceber: round2(receitaProjetada - receitaRealizada),
        receitasExtras: round2(receitaExtra),
        despesas: round2(despesas),
        saldo: round2(receitaRealizada + receitaExtra - despesas),
      }
    },
  },
]
