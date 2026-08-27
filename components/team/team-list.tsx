'use client'

import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ROLE_META } from '@/lib/crm-constants'
import { initials } from '@/lib/format'
import { Stagger, StaggerItem } from '@/components/ui/animate'
import { Users, Building2, Mail } from 'lucide-react'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  jobTitle: string | null
  avatarUrl: string | null
  leads: number
  clients: number
}

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700' },
  ADMIN: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MANAGER: { bg: 'bg-amber-100', text: 'text-amber-700' },
  MEMBER: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

export function TeamList({ members }: { members: TeamMember[] }) {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(members ?? []).map((m) => {
        const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.MEMBER
        return (
          <StaggerItem key={m.id}>
            <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                  <AvatarFallback className="bg-primary/10 text-primary">{initials(m.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.jobTitle ?? ROLE_META[m.role]?.label}</p>
                </div>
              </div>
              <div className="mt-3">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                  {ROLE_META[m.role]?.label ?? m.role}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{m.email}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold leading-none">{m.leads}</p>
                    <p className="text-[10px] text-muted-foreground">leads</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold leading-none">{m.clients}</p>
                    <p className="text-[10px] text-muted-foreground">clientes</p>
                  </div>
                </div>
              </div>
            </Card>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}
