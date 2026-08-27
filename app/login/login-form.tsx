'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { LayoutGrid, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@vortex.com.br')
  const [password, setPassword] = useState('demo1234')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) {
        toast.error('Email ou senha inválidos.')
        setLoading(false)
        return
      }
      toast.success('Bem-vindo de volta!')
      router.replace('/dashboard')
    } catch (err) {
      toast.error('Erro ao entrar. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #3B82F6, #1E40AF 55%, #10B981)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">NexusCRM</span>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
            O CRM whitelabel<br />modular da sua empresa.
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Gerencie leads, pipeline, clientes e vendas em um só lugar — sob a sua marca, com os módulos que você precisa.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {['Pipeline Kanban', 'Gestão de Leads', 'Multi-módulos', 'Whitelabel'].map((t) => (
              <span key={t} className="rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">{t}</span>
            ))}
          </div>
        </div>
        <div className="text-white/60 text-sm">© 2026 NexusCRM. Todos os direitos reservados.</div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)' }}>
              <LayoutGrid className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold">NexusCRM</span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Entrar na plataforma</h2>
          <p className="mt-1 text-sm text-muted-foreground">Acesse o painel para gerenciar seu negócio.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="voce@empresa.com.br" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Conta de demonstração:</span> admin@vortex.com.br / demo1234
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
