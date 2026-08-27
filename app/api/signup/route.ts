export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, name } = body ?? {}
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma conta com este email.' }, { status: 409 })
    }
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'vortex' } })
    const hashed = await bcrypt.hash(String(password), 10)
    await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: hashed,
        name: String(name),
        role: 'ADMIN',
        tenantId: tenant?.id ?? null,
        avatarUrl: null,
      },
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 })
  }
}
