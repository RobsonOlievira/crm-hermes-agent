import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { onInstallmentPaid } from '@/lib/cashflow-engine'

// ── PUT — Editar parcela (valor/vencimento) OU desfazer pagamento ──
// body: { installmentId, action: 'edit', amount?, dueDate? }
// body: { installmentId, action: 'unpay' }
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { installmentId, action, amount, dueDate } = body

    if (!installmentId || !action) {
      return NextResponse.json({ error: 'installmentId e action são obrigatórios' }, { status: 400 })
    }

    const installment = await prisma.projectInstallment.findFirst({
      where: { id: installmentId, projectId: params.id, project: { tenantId: user.tenantId } },
      include: { project: true },
    })
    if (!installment) return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })

    // ── Editar valor/vencimento (só parcelas não pagas) ──
    if (action === 'edit') {
      if (installment.paid) {
        return NextResponse.json({ error: 'Desfaça o pagamento antes de editar o valor.' }, { status: 400 })
      }
      const updated = await prisma.projectInstallment.update({
        where: { id: installmentId },
        data: {
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        },
      })
      if (amount !== undefined) {
        await prisma.cashFlowTransaction.updateMany({
          where: { installmentId, type: 'PROVISION' },
          data: { amount: Number(amount) },
        })
      }
      return NextResponse.json(updated)
    }

    // ── Desfazer pagamento ──
    if (action === 'unpay') {
      if (!installment.paid) {
        return NextResponse.json({ error: 'Esta parcela não está paga.' }, { status: 400 })
      }
      const paidAmount = installment.paidAmount ?? installment.amount

      const incomeTransaction = await prisma.cashFlowTransaction.findFirst({
        where: { installmentId, type: 'INCOME' },
      })

      await prisma.$transaction(async (tx) => {
        // 1. Reverter parcela para não paga
        await tx.projectInstallment.update({
          where: { id: installmentId },
          data: { paid: false, paidAt: null, paidAmount: null, paymentMethod: null },
        })

        // 2. Reverter PROVISION_REALIZED → PROVISION
        await tx.cashFlowTransaction.updateMany({
          where: { installmentId, type: 'PROVISION_REALIZED' },
          data: { type: 'PROVISION', cashDate: null },
        })

        // 3. Deletar transação INCOME
        await tx.cashFlowTransaction.deleteMany({ where: { installmentId, type: 'INCOME' } })

        // 4. Reverter saldo bancário
        if (incomeTransaction?.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: incomeTransaction.bankAccountId },
            data: { balance: { decrement: paidAmount } },
          })
        }

        // 5. Deletar Purchase e reverter Lead/Client
        if (incomeTransaction?.purchaseId) {
          await tx.purchase.delete({ where: { id: incomeTransaction.purchaseId } }).catch(() => {})
        }
        if (incomeTransaction?.leadId) {
          await tx.lead.update({
            where: { id: incomeTransaction.leadId },
            data: { totalPurchased: { decrement: paidAmount } },
          })
        }
        if (incomeTransaction?.clientId) {
          await tx.client.update({
            where: { id: incomeTransaction.clientId },
            data: { lifetimeValue: { decrement: paidAmount } },
          })
        }

        // 6. Se projeto estava PAID, volta para IN_PROGRESS
        if (installment.project.status === 'PAID') {
          await tx.project.update({ where: { id: params.id }, data: { status: 'IN_PROGRESS' } })
        }
      })

      return NextResponse.json({ ok: true, projectReverted: installment.project.status === 'PAID' })
    }

    return NextResponse.json({ error: 'action inválida (use "edit" ou "unpay")' }, { status: 400 })
  } catch (err) {
    console.error('[PUT /api/projects/[id]/installments]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── PATCH — Marcar parcela como paga ──
// body: { installmentId, paid: true, paidAmount?, paymentMethod?, bankAccountId?, notes? }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { installmentId, paidAmount, paymentMethod, bankAccountId, notes } = body

    if (!installmentId) {
      return NextResponse.json({ error: 'installmentId é obrigatório' }, { status: 400 })
    }

    // Verificar que a parcela pertence ao projeto e ao tenant
    const installment = await prisma.projectInstallment.findFirst({
      where: {
        id: installmentId,
        projectId: params.id,
        project: { tenantId: user.tenantId },
      },
    })

    if (!installment) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })
    }

    if (installment.paid) {
      return NextResponse.json({ error: 'Parcela já está paga' }, { status: 400 })
    }

    // Atualizar notes se fornecida
    if (notes !== undefined) {
      await prisma.projectInstallment.update({
        where: { id: installmentId },
        data: { notes },
      })
    }

    // Motor financeiro — executa toda a cascata
    const result = await onInstallmentPaid({
      installmentId,
      tenantId: user.tenantId,
      paidAmount: paidAmount || installment.amount,
      paymentMethod,
      bankAccountId,
      userId: user.id,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[PATCH /api/projects/[id]/installments]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── GET — Listar parcelas do projeto ──
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const installments = await prisma.projectInstallment.findMany({
      where: { projectId: params.id },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json(installments)
  } catch (err) {
    console.error('[GET /api/projects/[id]/installments]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
