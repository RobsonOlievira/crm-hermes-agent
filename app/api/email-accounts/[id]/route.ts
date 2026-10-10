import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params
    const account = await prisma.emailAccount.findFirst({
      where: { id, tenantId: user.tenantId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    await prisma.emailAccount.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/email-accounts/[id]]', err)
    return NextResponse.json({ error: 'Erro ao remover conta de email' }, { status: 500 })
  }
}
