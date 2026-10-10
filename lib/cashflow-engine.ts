import { prisma } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════
// MOTOR DO FLUXO DE CAIXA AUTOMÁTICO
// Toda ação financeira do CRM passa por aqui.
// Centraliza a cascata: parcela paga → Purchase, Lead, Client, Interaction, Dashboard
// ═══════════════════════════════════════════════════════════════

// ── EVENTO 1: PROJETO CRIADO ──
// Quando um projeto é criado com parcelas, gera N transações PROVISION
// (uma por parcela futura). A receita é provisionada no mês de cada vencimento.
export async function onProjectCreated(params: {
  projectId: string
  tenantId: string
  projectName: string
  clientId: string
  startDate: Date
  installments: Array<{ id: string; number: number; amount: number; dueDate: Date }>
}) {
  if (!params.installments.length) return

  await prisma.cashFlowTransaction.createMany({
    data: params.installments.map((inst) => ({
      tenantId: params.tenantId,
      type: 'PROVISION',
      origin: 'INSTALLMENT_DUE',
      category: 'Receita de Projetos',
      subcategory: params.projectName,
      amount: inst.amount,
      isDebit: false,
      competenceDate: params.startDate,
      cashDate: null,
      description: `Provisionado: Parcela ${inst.number}/${params.installments.length} — ${params.projectName}`,
      projectId: params.projectId,
      installmentId: inst.id,
      clientId: params.clientId,
      isAutomatic: true,
    })),
  })
}

// ── EVENTO 2: PARCELA PAGA ──
// O coração do sistema. Quando confirmam pagamento:
// 1. Atualiza transação PROVISION → PROVISION_REALIZED
// 2. Cria transação INCOME (entrada real no caixa)
// 3. Se bankAccountId, atualiza saldo da conta bancária
// 4. Cria Purchase + atualiza Lead.totalPurchased
// 5. Atualiza Client.lifetimeValue
// 6. Cria Interaction PAYMENT_RECEIVED
// 7. Se todas as parcelas pagas → Project.status = PAID
export async function onInstallmentPaid(params: {
  installmentId: string
  tenantId: string
  paidAmount: number
  paymentMethod?: string
  bankAccountId?: string
  paidAt?: Date
  userId?: string
}) {
  const paidAt = params.paidAt || new Date()

  const installment = await prisma.projectInstallment.findUnique({
    where: { id: params.installmentId },
    include: {
      project: {
        include: {
          client: true,
          installments: { select: { id: true, paid: true } },
        },
      },
    },
  })
  if (!installment) throw new Error('Parcela não encontrada')

  const project = installment.project
  const client = project.client
  const totalInstallments = project.installments.length

  // 1. Atualizar parcela
  await prisma.projectInstallment.update({
    where: { id: params.installmentId },
    data: {
      paid: true,
      paidAt,
      paidAmount: params.paidAmount,
      paymentMethod: params.paymentMethod,
    },
  })

  // 2. Marcar provisão como realizada e criar INCOME
  await prisma.cashFlowTransaction.updateMany({
    where: {
      installmentId: params.installmentId,
      type: 'PROVISION',
    },
    data: {
      type: 'PROVISION_REALIZED',
      cashDate: paidAt,
      updatedAt: new Date(),
    },
  })

  await prisma.cashFlowTransaction.create({
    data: {
      tenantId: params.tenantId,
      type: 'INCOME',
      origin: 'INSTALLMENT_PAID',
      category: 'Receita de Projetos',
      subcategory: project.name,
      amount: params.paidAmount,
      isDebit: false,
      competenceDate: project.startDate,
      cashDate: paidAt,
      description: `Parcela ${installment.number}/${totalInstallments} — ${project.name} — ${client.name}`,
      projectId: project.id,
      installmentId: params.installmentId,
      clientId: client.id,
      bankAccountId: params.bankAccountId,
      paymentMethod: params.paymentMethod,
      isAutomatic: true,
    },
  })

  // 3. Atualizar saldo da conta bancária (se informada)
  if (params.bankAccountId) {
    await prisma.bankAccount.update({
      where: { id: params.bankAccountId },
      data: { balance: { increment: params.paidAmount } },
    })
  }

  // 4. Buscar lead pelo telefone do cliente e criar Purchase
  const lead = await prisma.lead.findFirst({
    where: { tenantId: params.tenantId, phone: client.phone },
    orderBy: { createdAt: 'desc' },
  })

  if (lead) {
    const purchase = await prisma.purchase.create({
      data: {
        tenantId: params.tenantId,
        leadId: lead.id,
        description: `${project.name} — Parcela ${installment.number}/${totalInstallments}`,
        amount: params.paidAmount,
        catalogItemId: project.catalogItemId,
      },
    })

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        totalPurchased: { increment: params.paidAmount },
        lastInteraction: paidAt,
      },
    })

    // Vincular purchase à transaction
    await prisma.cashFlowTransaction.updateMany({
      where: { installmentId: params.installmentId, type: 'INCOME' },
      data: { purchaseId: purchase.id, leadId: lead.id },
    })
  }

  // 5. Atualizar lifetimeValue do Client
  await prisma.client.update({
    where: { id: client.id },
    data: { lifetimeValue: { increment: params.paidAmount } },
  })

  // 6. Criar Interaction PAYMENT_RECEIVED
  await prisma.interaction.create({
    data: {
      tenantId: params.tenantId,
      clientId: client.id,
      leadId: lead?.id,
      userId: params.userId,
      type: 'PAYMENT_RECEIVED',
      title: `Pagamento: ${project.name} — Parcela ${installment.number}/${totalInstallments}`,
      content: `R$ ${params.paidAmount.toFixed(2)} via ${params.paymentMethod || 'não informado'}`,
      amount: params.paidAmount,
    },
  })

  // 7. Verificar se TODAS as parcelas foram pagas → mudar Project para PAID
  const allInstallments = await prisma.projectInstallment.findMany({
    where: { projectId: project.id },
    select: { paid: true },
  })
  const allPaid = allInstallments.every((i) => i.paid)

  if (allPaid) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'PAID' },
    })

    await prisma.interaction.create({
      data: {
        tenantId: params.tenantId,
        clientId: client.id,
        type: 'SYSTEM_EVENT',
        title: `Projeto "${project.name}" totalmente pago ✅`,
      },
    })
  }

  return { ok: true, allPaid, leadFound: !!lead }
}

// ── EVENTO 2b: VENDA/PAGAMENTO DIRETO (sem parcela de projeto) ──
// Registra uma entrada real no caixa para compras/pagamentos manuais avulsos
// (não vinculados a uma parcela de projeto). Mantém o ledger consistente com a
// UI de fluxo de caixa. competência = caixa = data informada (padrão agora).
export async function onManualSale(params: {
  tenantId: string
  description: string
  amount: number
  leadId?: string
  clientId?: string
  purchaseId?: string
  paymentMethod?: string
  date?: Date
}) {
  const when = params.date || new Date()
  await prisma.cashFlowTransaction.create({
    data: {
      tenantId: params.tenantId,
      type: 'INCOME',
      origin: 'PRODUCT_SALE',
      category: 'Venda Direta',
      subcategory: params.description,
      amount: params.amount,
      isDebit: false,
      competenceDate: when,
      cashDate: when,
      description: params.description,
      leadId: params.leadId,
      clientId: params.clientId,
      purchaseId: params.purchaseId,
      paymentMethod: params.paymentMethod,
      isAutomatic: false,
    },
  })
}

// ── EVENTO 3: DESPESA ADICIONADA ──
export async function onExpenseAdded(params: {
  tenantId: string
  category: string
  description?: string
  amount: number
  isFixed: boolean
  competenceDate: Date
  bankAccountId?: string
}) {
  await prisma.cashFlowTransaction.create({
    data: {
      tenantId: params.tenantId,
      type: 'EXPENSE',
      origin: params.isFixed ? 'FIXED_EXPENSE' : 'MANUAL_EXPENSE',
      category: params.category,
      description: params.description || params.category,
      amount: params.amount,
      isDebit: true,
      competenceDate: params.competenceDate,
      cashDate: params.competenceDate,
      bankAccountId: params.bankAccountId,
      isAutomatic: false,
    },
  })
}

// ── EVENTO 4: RECEITA EXTRA ADICIONADA ──
export async function onExtraRevenueAdded(params: {
  tenantId: string
  description: string
  amount: number
  competenceDate: Date
}) {
  await prisma.cashFlowTransaction.create({
    data: {
      tenantId: params.tenantId,
      type: 'INCOME',
      origin: 'MANUAL_INCOME',
      category: 'Receita Extra',
      description: params.description,
      amount: params.amount,
      isDebit: false,
      competenceDate: params.competenceDate,
      cashDate: params.competenceDate,
      isAutomatic: false,
    },
  })
}

// ── EVENTO 5: NOTA FISCAL EMITIDA ──
export async function onInvoiceIssued(params: {
  tenantId: string
  invoiceId: string
  clientId?: string
  projectId?: string
  amount: number
  issueDate: Date
  description?: string
}) {
  await prisma.cashFlowTransaction.create({
    data: {
      tenantId: params.tenantId,
      type: 'INCOME',
      origin: 'INVOICE_ISSUED',
      category: 'Nota Fiscal',
      description: params.description || `NF emitida — R$ ${params.amount.toFixed(2)}`,
      amount: params.amount,
      isDebit: false,
      competenceDate: params.issueDate,
      cashDate: null,
      invoiceId: params.invoiceId,
      clientId: params.clientId,
      projectId: params.projectId,
      isAutomatic: true,
    },
  })
}
