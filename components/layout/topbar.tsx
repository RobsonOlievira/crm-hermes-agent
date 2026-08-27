'use client'

import { signOut } from 'next-auth/react'
import { Menu, Search, Bell, LogOut, ChevronsUpDown, Check, Eye, Shield, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { useViewRole, ViewRole } from '@/components/providers/view-role-provider'
import type { CurrentUser } from '@/components/providers/app-providers'
import { initials } from '@/lib/format'
import { useState } from 'react'

const NOTIFICATIONS = [
  { title: 'Novo lead recebido', desc: 'Juliana Santos entrou pelo WhatsApp', time: 'há 5 min', color: '#3B82F6' },
  { title: 'Reunião agendada', desc: 'Carlos moveu um deal para Reunião Agendada', time: 'há 1 h', color: '#F59E0B' },
  { title: 'Pagamento confirmado', desc: 'Pagamento de R$ 4.500 confirmado via PIX', time: 'há 3 h', color: '#10B981' },
]

export function Topbar({ user, onOpenSidebar }: { user: CurrentUser; onOpenSidebar: () => void }) {
  const { viewRole, setViewRole } = useViewRole()
  const [query, setQuery] = useState('')

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar leads, clientes..."
          className="pl-10 bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* View-as role switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
              <Eye className="h-4 w-4" />
              <span className="hidden md:inline">Ver como:</span>
              <span className="font-semibold">
                {viewRole === 'ADMIN' ? 'Admin' : viewRole === 'MANAGER' ? 'Gestor' : 'Colaborador'}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Simular papel (RBAC)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={viewRole} onValueChange={(v) => setViewRole(v as ViewRole)}>
              <DropdownMenuRadioItem value="ADMIN">Administrador</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="MANAGER">Gestor</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="MEMBER">Colaborador</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} className="flex gap-3 px-2 py-2.5 hover:bg-accent rounded-md cursor-pointer">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: n.color }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.desc}</p>
                  <p className="text-[11px] text-muted-foreground/70">{n.time}</p>
                </div>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight max-w-[120px] truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{user.jobTitle ?? 'Membro'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2"><UserCircle2 className="h-4 w-4" /> Meu perfil</DropdownMenuItem>
            <DropdownMenuItem className="gap-2"><Shield className="h-4 w-4" /> Papel: {user.role}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
