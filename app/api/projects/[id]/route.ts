import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// ── GET — Detalhe do projeto ──
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true, companyName: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        catalogItem: { select: { id: true, name: true, price: true } },
        installments: { orderBy: { number: 'asc' } },
        credentials: { orderBy: { createdAt: 'asc' } },
        invoices: { orderBy: { issueDate: 'desc' } },
      },
    })

    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    return NextResponse.json(project)
  } catch (err) {
    console.error('[GET /api/projects/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── PUT — Atualizar projeto ──
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const body = await req.json()

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        name: body.name ?? project.name,
        description: body.description !== undefined ? body.description : project.description,
        status: body.status ?? project.status,
        startDate: body.startDate ? new Date(body.startDate) : project.startDate,
        deadline: body.deadline ? new Date(body.deadline) : project.deadline,
        totalValue: body.totalValue ?? project.totalValue,
        projectLink: body.projectLink !== undefined ? body.projectLink : project.projectLink,
        referralName: body.referralName !== undefined ? body.referralName : project.referralName,
        referralModel: body.referralModel !== undefined ? body.referralModel : project.referralModel,
        referralValue: body.referralValue !== undefined ? body.referralValue : project.referralValue,
        referralPaid: body.referralPaid !== undefined ? body.referralPaid : project.referralPaid,
        catalogItemId: body.catalogItemId !== undefined ? body.catalogItemId : project.catalogItemId,
        assignedToId: body.assignedToId !== undefined ? body.assignedToId : project.assignedToId,
        proposalDate: body.proposalDate !== undefined ? (body.proposalDate ? new Date(body.proposalDate) : null) : project.proposalDate,
        plannedDate: body.plannedDate !== undefined ? (body.plannedDate ? new Date(body.plannedDate) : null) : project.plannedDate,
        checklist:
          body.checklist !== undefined
            ? typeof body.checklist === 'string'
              ? body.checklist
              : JSON.stringify(body.checklist)
            : project.checklist,
      },
    })

    // Se mudou status → Interaction
    if (body.status && body.status !== project.status) {
      const statusLabels: Record<string, string> = {
        ENTRY: 'Entrada',
        IN_PROGRESS: 'Em Andamento',
        CLOSED: 'Entregue',
        PAID: 'Pago',
        CANCELLED: 'Cancelado',
      }
      await prisma.interaction.create({
        data: {
          tenantId: user.tenantId,
          clientId: project.clientId,
          userId: user.id,
          type: 'STATUS_CHANGE',
          title: `Projeto "${project.name}" → ${statusLabels[body.status] ?? body.status}`,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/projects/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── DELETE — Remover projeto (rollback financeiro completo) ──
// Apaga o projeto, parcelas e credentials; reverte transações de caixa, Purchases,
// saldo de BankAccount, Lead.totalPurchased e Client.lifetimeValue.
// Contratos e faturas são documentos: permanecem, apenas desvinculados do projeto.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // 1. Transações de caixa do projeto (todas: PROVISION, PROVISION_REALIZED, INCOME)
      const transactions = await tx.cashFlowTransaction.findMany({
        where: { projectId: params.id },
      })

      // 2. Reverter saldo das contas bancárias (só INCOME de parcela paga incrementa saldo)
      const bankSums = new Map<string, number>()
      for (const t of transactions) {
        if (t.bankAccountId) {
          bankSums.set(t.bankAccountId, (bankSums.get(t.bankAccountId) ?? 0) + t.amount)
        }
      }
      for (const [bankId, sum] of bankSums) {
        await tx.bankAccount.update({
          where: { id: bankId },
          data: { balance: { decrement: sum } },
        })
      }

      // 3. Reverter Client.lifetimeValue (apenas parcela paga o incrementa)
      const lifetimeSum = transactions
        .filter((t) => t.type === 'INCOME' && t.origin === 'INSTALLMENT_PAID')
        .reduce((acc, t) => acc + t.amount, 0)
      if (lifetimeSum > 0) {
        await tx.client.update({
          where: { id: project.clientId },
          data: { lifetimeValue: { decrement: lifetimeSum } },
        })
      }

      // 4. Purchases geradas pelas parcelas pagas → reverter Lead.totalPurchased
      const purchaseIds = transactions
        .map((t) => t.purchaseId)
        .filter((id): id is string => !!id)

      if (purchaseIds.length > 0) {
        const purchases = await tx.purchase.findMany({
          where: { id: { in: purchaseIds } },
          select: { id: true, leadId: true, amount: true },
        })

        await tx.paymentOrder.updateMany({
          where: { purchaseId: { in: purchaseIds } },
          data: { purchaseId: null },
        })

        const leadSums = new Map<string, number>()
        for (const p of purchases) {
          leadSums.set(p.leadId, (leadSums.get(p.leadId) ?? 0) + p.amount)
        }
        for (const [leadId, sum] of leadSums) {
          await tx.lead.update({
            where: { id: leadId },
            data: { totalPurchased: { decrement: sum } },
          })
        }
      }

      // 5. Apagar transações de caixa do projeto (antes das Purchases, que são referenciadas)
      await tx.cashFlowTransaction.deleteMany({ where: { projectId: params.id } })

      // Purchases ligadas às transações do projeto
      if (purchaseIds.length > 0) {
        await tx.purchase.deleteMany({ where: { id: { in: purchaseIds } } })
      }

      // 6. Desvincular faturas (cascade de Invoice não existe; contrato permanece como documento)
      await tx.invoice.updateMany({
        where: { projectId: params.id },
        data: { projectId: null },
      })
      await tx.contract.updateMany({
        where: { projectId: params.id },
        data: { projectId: null },
      })

      // 7. Deletar o projeto (installments e credentials serão deletados em cascata)
      await tx.project.delete({ where: { id: params.id } })
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/projects/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
