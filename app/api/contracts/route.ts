export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { renderContract, hashContent, buildRenderData } from '@/lib/contracts/render'
import { onProjectCreated } from '@/lib/cashflow-engine'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contracts = await prisma.contract.findMany({
    where: { tenantId: user.tenantId },
    include: { client: true, template: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ contracts })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { 
    templateId, 
    clientId, 
    title, 
    services, 
    totalValue, 
    paymentTerms,
    proposalId,
    projectId,
    installmentCount = 1,
    createProject = false
  } = await req.json()

  const [tenant, client] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: user.tenantId } }),
    prisma.client.findFirst({ where: { id: clientId, tenantId: user.tenantId } }),
  ])

  const template = templateId 
    ? await prisma.contractTemplate.findFirst({ where: { id: templateId, tenantId: user.tenantId } }) 
    : await prisma.contractTemplate.findFirst({ where: { tenantId: user.tenantId, isDefault: true } })
  
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const body = template?.body ?? ''
  const data = buildRenderData(tenant, client, services ?? [], { totalValue, paymentTerms })
  const bodyRendered = renderContract(body, data)
  const contentHash = hashContent(bodyRendered)

  let createdProjectId = projectId || null

  // Se o usuário solicitou a criação do projeto automático no financeiro
  if (createProject && !projectId && totalValue && totalValue > 0) {
    try {
      const projName = title || `Projeto - ${client.name}`
      const newProj = await prisma.project.create({
        data: {
          tenantId: user.tenantId,
          clientId,
          name: projName,
          totalValue: parseFloat(totalValue),
          startDate: new Date(),
          assignedToId: user.id,
          proposalId: proposalId || null,
        }
      })
      createdProjectId = newProj.id

      // Gerar parcelas
      const count = Math.max(1, parseInt(installmentCount) || 1)
      const installments = []
      for (let i = 0; i < count; i++) {
        const amt = parseFloat(totalValue) / count
        const dueDate = new Date()
        dueDate.setMonth(dueDate.getMonth() + i)

        const inst = await prisma.projectInstallment.create({
          data: {
            tenantId: user.tenantId,
            projectId: newProj.id,
            number: i + 1,
            amount: amt,
            dueDate,
          }
        })
        installments.push(inst)
      }

      // Provisionar no motor financeiro
      await onProjectCreated({
        projectId: newProj.id,
        tenantId: user.tenantId,
        projectName: projName,
        clientId,
        startDate: new Date(),
        installments,
      })
    } catch (err) {
      console.error('[POST /api/contracts] Erro ao criar projeto automático:', err)
    }
  }

  const contract = await prisma.contract.create({
    data: {
      tenantId: user.tenantId,
      templateId: templateId ?? null,
      clientId,
      createdById: user.id,
      proposalId: proposalId || null,
      projectId: createdProjectId,
      installmentCount: parseInt(installmentCount) || 1,
      title: title || `Contrato - ${client.name}`,
      status: 'DRAFT',
      bodyRendered,
      contentHash,
      totalValue: totalValue ? parseFloat(totalValue) : null,
      paymentTerms: paymentTerms ?? null,
      providerSnapshot: JSON.stringify(data.empresa),
      clientSnapshot: JSON.stringify(data.cliente),
      services: {
        create: (services ?? []).map((s: any) => ({
          catalogItemId: s.catalogItemId ?? null,
          description: s.description,
          quantity: s.quantity ?? 1,
          unitPrice: s.unitPrice ?? 0,
        })),
      },
    },
    include: { services: true, client: true, template: true, project: true, proposal: true },
  })
  
  return NextResponse.json({ contract })
}