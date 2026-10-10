export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { uploadFileToStorage } from '@/lib/supabase-storage'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let publicUrl: string
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
    publicUrl = await uploadFileToStorage(`logos/${user.tenantId}`, file)
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'Erro desconhecido ao enviar o arquivo'
    return NextResponse.json({ error: 'Erro ao enviar o arquivo', detail }, { status: 500 })
  }

  return NextResponse.json({ publicUrl })
}