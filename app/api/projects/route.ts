import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { onProjectCreated } from '@/lib/cashflow-engine'
import { getOrSeedChecklistStages, buildChecklistSnapshot } from '@/lib/project-checklist'

// ── GET — Lista projetos do tenant ──
// Query: ?status=ENTRY&clientId=xxx&search=termo
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')

    const where: any = { tenantId: user.tenantId }
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        installments: { orderBy: { number: 'asc' } },
        _count: { select: { credentials: true, invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projects)
  } catch (err) {
    console.error('[GET /api/projects]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── POST — Criar projeto com parcelas automáticas ──
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const {
      kind = 'PROJECT',
      clientId: bodyClientId,
      newClient,
      name,
      description,
      totalValue,
      startDate,
      deadline,
      projectLink,
      installmentCount = 1,
      installmentDates = [],
      installmentAmounts = [],
      referralName,
      referralModel,
      referralValue,
      catalogItemId,
      assignedToId,
      credentials = [],
      proposalDate,
      plannedDate,
    } = body

    const isProposal = kind === 'PROPOSAL'

    if (!name || totalValue === undefined || totalValue === null) {
      return NextResponse.json({ error: 'Campos obrigatórios: name, totalValue' }, { status: 400 })
    }

    // Cliente: existente ou criado inline (newClient: { name, phone, ... })
    let clientId: string | undefined = bodyClientId
    if (!clientId && newClient && typeof newClient.name === 'string' && newClient.name.trim()) {
      const created = await prisma.client.create({
        data: {
          tenantId: user.tenantId,
          name: newClient.name.trim(),
          phone: typeof newClient.phone === 'string' ? newClient.phone.trim() : '',
          email: typeof newClient.email === 'string' ? newClient.email.trim() || null : null,
          companyName: typeof newClient.companyName === 'string' ? newClient.companyName.trim() || null : null,
          status: 'PROSPECTADO',
        },
      })
      clientId = created.id
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Informe um cliente (clientId ou newClient).' }, { status: 400 })
    }

    // Data de início: num projeto normal é obrigatória; numa proposta usamos a data
    // planejada (ou de entrada) como placeholder — a data real é definida ao iniciar.
    const effectiveStart = startDate
      ? new Date(startDate)
      : plannedDate
        ? new Date(plannedDate)
        : proposalDate
          ? new Date(proposalDate)
          : new Date()

    if (!isProposal && !startDate) {
      return NextResponse.json({ error: 'Campo obrigatório: startDate' }, { status: 400 })
    }

    // Snapshot do checklist (etapas ativas do tenant)
    const stages = await getOrSeedChecklistStages(user.tenantId)
    const checklistSnapshot = buildChecklistSnapshot(stages)

    // Criar o projeto (ou proposta)
    const project = await prisma.project.create({
      data: {
        tenantId: user.tenantId,
        clientId,
        name,
        description,
        status: isProposal ? 'PROPOSAL' : 'ENTRY',
        totalValue,
        startDate: effectiveStart,
        proposalDate: proposalDate ? new Date(proposalDate) : isProposal ? new Date() : null,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        projectLink,
        referralName,
        referralModel,
        referralValue,
        catalogItemId,
        assignedToId: assignedToId || user.id,
        checklist: JSON.stringify(checklistSnapshot),
      },
    })

    // Propostas não geram parcelas nem provisões até serem iniciadas.
    if (isProposal) {
      await prisma.interaction.create({
        data: {
          tenantId: user.tenantId,
          clientId,
          userId: user.id,
          type: 'NOTE',
          title: `Proposta registrada: ${name}`,
          content: `Valor proposto: R$ ${Number(totalValue).toFixed(2)}`,
          amount: totalValue,
        },
      })

      const proposalResult = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          installments: { orderBy: { number: 'asc' } },
          credentials: true,
        },
      })
      return NextResponse.json(proposalResult, { status: 201 })
    }

    // Gerar parcelas automáticas
    const count = Math.max(1, installmentCount)
    const createdInstallments = []

    for (let i = 0; i < count; i++) {
      const amount = installmentAmounts[i] ?? totalValue / count
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

    // Credenciais (se fornecidas)
    if (credentials.length > 0) {
      await prisma.projectCredential.createMany({
        data: credentials.map((c: any) => ({
          projectId: project.id,
          label: c.label,
          url: c.url,
          username: c.username,
          email: c.email,
          password: c.password,
          notes: c.notes,
        })),
      })
    }

    // Interaction no Client
    await prisma.interaction.create({
      data: {
        tenantId: user.tenantId,
        clientId,
        userId: user.id,
        type: 'TASK_CREATED',
        title: `Projeto criado: ${name}`,
        content: `Valor: R$ ${Number(totalValue).toFixed(2)} em ${count}x`,
        amount: totalValue,
      },
    })

    // Motor financeiro — provisionar parcelas
    await onProjectCreated({
      projectId: project.id,
      tenantId: user.tenantId,
      projectName: name,
      clientId,
      startDate: effectiveStart,
      installments: createdInstallments,
    })

    const result = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        installments: { orderBy: { number: 'asc' } },
        credentials: true,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('[POST /api/projects]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
