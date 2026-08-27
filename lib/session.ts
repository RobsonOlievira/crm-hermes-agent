import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true },
  })
  return user
}

export async function getTenantId() {
  const user = await getCurrentUser()
  return user?.tenantId ?? null
}
