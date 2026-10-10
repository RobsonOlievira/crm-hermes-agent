export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  
  const b = await req.json()
  const tenant = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      legalName: b.legalName ?? null,
      companyCnpj: b.companyCnpj ?? null,
      companyEmail: b.companyEmail ?? null,
      companyPhone: b.companyPhone ?? null,
      addressStreet: b.addressStreet ?? null,
      addressComplement: b.addressComplement ?? null,
      addressDistrict: b.addressDistrict ?? null,
      addressCity: b.addressCity ?? null,
      addressState: b.addressState ?? null,
      addressZip: b.addressZip ?? null,
      legalRepName: b.legalRepName ?? null,
      legalRepCpf: b.legalRepCpf ?? null,
      legalRepRole: b.legalRepRole ?? null,
    },
  })
  return NextResponse.json({ ok: true, tenant })
}

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
  })
  return NextResponse.json({ tenant })
}