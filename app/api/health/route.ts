// Health check para a plataforma de deploy.
// Retorna 200 SEMPRE, sem tocar no banco — usado pelo health check do
// ambiente de publicação para considerar o container "healthy".
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 },
  )
}
