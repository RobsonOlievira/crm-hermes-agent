export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SignupForm } from './signup-form'

export default async function SignupPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/dashboard')
  return <SignupForm />
}
