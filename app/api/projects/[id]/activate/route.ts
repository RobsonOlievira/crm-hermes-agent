import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { onProjectCreated } from '@/lib/cashflow-engine'

// ── POST — Iniciar uma proposta (status PROPOSAL → IN_PROGRESS) ──
// Gera as parcelas e provisiona o fluxo de caixa na data efetivamente escolhida.
// body: { startDate, installmentCount?, installmentDates?, installmentAmounts? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: { installments: true },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    if (project.status !== 'PROPOSAL') {
      return NextResponse.json({ error: 'Este projeto não está em negociação.' }, { status: 400 })
    }

    const body = await req.json()
    const {
      startDate,
      installmentCount = 1,
      installmentDates = [],
      installmentAmounts = [],
    } = body

    if (!startDate) {
      return NextResponse.json({ error: 'startDate é obrigatório' }, { status: 400 })
    }

    const effectiveStart = new Date(startDate)
    const count = Math.max(1, installmentCount)

    // Atualizar o projeto: vira IN_PROGRESS na data clicada
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'IN_PROGRESS',
        startDate: effectiveStart,
      },
    })

    // Gerar parcelas (idempotência simples: só se ainda não houver)
    const createdInstallments = []
    if (project.installments.length === 0) {
      for (let i = 0; i < count; i++) {
        const amount = installmentAmounts[i] ?? project.totalValue / count
        const dueDate = installmentDates[i]
          ? new Date(installmentDates[i])
          : new Date(effectiveStart.getTime() + i * 30 * 86400000)

        const inst = await prisma.projectInstallment.create({
          data: {
            tenantId: user.tenantId,
            projectId: project.id,
            number: i + 1,
            amount,
            dueDate,
          },
        })
        createdInstallments.push(inst)
      }

      // Motor financeiro — provisionar parcelas na competência (startDate)
      await onProjectCreated({
        projectId: project.id,
        tenantId: user.tenantId,
        projectName: project.name,
        clientId: project.clientId,
        startDate: effectiveStart,
        installments: createdInstallments,
      })
    }

    await prisma.interaction.create({
      data: {
        tenantId: user.tenantId,
        clientId: project.clientId,
        userId: user.id,
        type: 'STATUS_CHANGE',
        title: `Proposta aprovada → projeto iniciado: ${project.name}`,
        content: `Valor: R$ ${Number(project.totalValue).toFixed(2)} em ${count}x`,
        amount: project.totalValue,
      },
    })

    const result = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        installments: { orderBy: { number: 'asc' } },
        credentials: true,
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/projects/[id]/activate]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
