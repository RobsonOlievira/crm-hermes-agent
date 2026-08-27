export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/dashboard')
  return <LoginForm />
}
