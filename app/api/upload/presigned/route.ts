export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { generatePresignedUploadUrl, getPublicUrl } from '@/lib/s3'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { fileName, contentType } = await req.json()
    if (!fileName || !contentType) return NextResponse.json({ error: 'Dados ausentes' }, { status: 400 })
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, true)
    const publicUrl = getPublicUrl(cloud_storage_path)
    return NextResponse.json({ uploadUrl, cloud_storage_path, publicUrl })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao gerar URL de upload' }, { status: 500 })
  }
}
