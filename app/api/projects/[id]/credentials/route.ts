import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// ── GET — Listar credenciais do projeto ──
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const credentials = await prisma.projectCredential.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(credentials)
  } catch (err) {
    console.error('[GET /api/projects/[id]/credentials]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── POST — Adicionar credencial ──
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const body = await req.json()
    const { label, url, username, email, password, notes } = body

    if (!label) return NextResponse.json({ error: 'label é obrigatório' }, { status: 400 })

    const credential = await prisma.projectCredential.create({
      data: {
        projectId: params.id,
        label,
        url,
        username,
        email,
        password,
        notes,
      },
    })

    return NextResponse.json(credential, { status: 201 })
  } catch (err) {
    console.error('[POST /api/projects/[id]/credentials]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── DELETE — Remover credencial ──
// Query: ?credentialId=xxx
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const credentialId = searchParams.get('credentialId')

    if (!credentialId) return NextResponse.json({ error: 'credentialId é obrigatório' }, { status: 400 })

    // Verificar que a credencial pertence ao projeto correto e tenant
    const cred = await prisma.projectCredential.findFirst({
      where: { id: credentialId, projectId: params.id, project: { tenantId: user.tenantId } },
    })
    if (!cred) return NextResponse.json({ error: 'Credencial não encontrada' }, { status: 404 })

    await prisma.projectCredential.delete({ where: { id: credentialId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/projects/[id]/credentials]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
