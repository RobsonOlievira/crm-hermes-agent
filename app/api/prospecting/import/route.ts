export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { prospects } = body

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'Nenhum prospect selecionado' }, { status: 400 })
    }

    let importedCount = 0
    let skippedCount = 0

    for (const p of prospects) {
      const phone = (p.whatsapp || p.telefone || '').replace(/\D/g, '')
      const email = p.email ? p.email.trim().toLowerCase() : null

      // Verifica duplicidade por telefone ou email no mesmo Tenant
      let existing = null
      if (phone && phone.length >= 8) {
        existing = await prisma.lead.findFirst({
          where: {
            tenantId: user.tenantId,
            phone: { contains: phone.slice(-8) },
          },
        })
      }

      if (!existing && email) {
        existing = await prisma.lead.findFirst({
          where: {
            tenantId: user.tenantId,
            email,
          },
        })
      }

      if (existing) {
        skippedCount++
        continue
      }

      const customFieldsObj = {
        prospectAi: true,
        nicho: p.nicho,
        cidade: p.cidade,
        instagram: p.instagram,
        igSeguidores: p.igSeguidores,
        igPosts: p.igPosts,
        igAtivo: p.igAtivo,
        siteAntigo: p.siteAntigo,
        motivo: p.motivo,
        abordagem: p.abordagem,
        temperatura: p.temperatura,
        nota: p.nota,
        avaliacoes: p.avaliacoes,
        dossie: p.dossie,
      }

      await prisma.lead.create({
        data: {
          tenantId: user.tenantId,
          name: p.nome,
          email: p.email || null,
          phone: phone || p.telefone || 'Sem telefone',
          companyName: p.nome,
          city: p.cidade || null,
          source: 'PROSPEC_AI' as any,
          score: p.score || 75,
          tags: ['prospect_ai', p.nicho || 'Geral', p.cidade || 'Brasil'],
          socialMedia: p.instagram || null,
          customFields: JSON.stringify(customFieldsObj),
          assignedToId: user.id,
        },
      })

      importedCount++
    }

    return NextResponse.json({
      ok: true,
      importedCount,
      skippedCount,
      message: `${importedCount} prospect(s) importado(s) com sucesso! ${skippedCount > 0 ? `(${skippedCount} já existiam)` : ''}`,
    })
  } catch (e: any) {
    console.error('Erro ao importar prospects:', e)
    return NextResponse.json(
      { error: e?.message || 'Erro ao importar prospects' },
      { status: 500 }
    )
  }
}
