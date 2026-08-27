'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { PageHeading } from '@/components/layout/page-heading'
import { Icon } from '@/components/layout/icon'
import { useModules } from '@/components/providers/modules-provider'
import { useViewRole } from '@/components/providers/view-role-provider'
import { MODULE_CATEGORY_META } from '@/lib/crm-constants'
import { PLACEHOLDER_MODULES } from '@/components/layout/nav-config'
import { NAV_GROUPS } from '@/components/layout/nav-config'
import { Stagger, StaggerItem } from '@/components/ui/animate'
import { Lock, ShieldAlert } from 'lucide-react'

const MODULE_ICONS: Record<string, string> = {
  dashboard: 'LayoutDashboard', leads: 'Users', kanban: 'KanbanSquare', clients: 'Building2',
  interactions: 'Activity', team: 'UserCog', notifications: 'Activity',
  whatsapp: 'MessageCircle', calendar: 'CalendarDays', payments: 'CreditCard',
  contracts: 'FileText', ads_tracker: 'Megaphone', automations: 'Workflow',
  catalog: 'Package',
}

export default function ModulesSettingsPage() {
  const { modules, toggleModule, updating } = useModules()
  const { can } = useViewRole()

  const grouped = useMemo(() => {
    const map = new Map<string, typeof modules>()
    for (const m of modules ?? []) {
      const arr = map.get(m.category) ?? []
      arr.push(m)
      map.set(m.category, arr)
    }
    return Array.from(map.entries())
  }, [modules])

  if (!can('settings:modules')) {
    return (
      <div>
        <PageHeading title="Módulos" description="Ative ou desative os módulos do seu CRM." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="max-w-sm text-sm text-muted-foreground">Apenas administradores podem gerenciar os módulos. Altere o perfil de visualização para Administrador no menu superior.</p>
        </Card>
      </div>
    )
  }

  const activeCount = (modules ?? []).filter((m) => m.isActive).length

  return (
    <div>
      <PageHeading
        title="Módulos"
        description="Personalize seu CRM ativando apenas os módulos que a sua operação precisa. As mudanças refletem no menu lateral imediatamente."
      />

      <Card className="mb-6 flex items-center gap-4 bg-primary/5 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="Blocks" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{activeCount} módulos ativos</p>
          <p className="text-xs text-muted-foreground">Módulos essenciais estão sempre ativos e não podem ser desativados.</p>
        </div>
      </Card>

      <div className="space-y-8">
        {grouped.map(([category, mods]) => (
          <div key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {MODULE_CATEGORY_META[category]?.label ?? category}
            </h2>
            <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(mods ?? []).map((m) => (
                <StaggerItem key={m.id}>
                  <Card className={`flex h-full items-start gap-3 p-4 transition-shadow hover:shadow-md ${m.isActive ? 'ring-1 ring-primary/20' : ''}`}>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: m.isActive ? 'var(--brand-primary)' + '1a' : undefined }}
                    >
                      <Icon name={MODULE_ICONS[m.key] ?? 'Blocks'} className={`h-5 w-5 ${m.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{m.displayName}</p>
                        {m.isCore && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <Lock className="h-2.5 w-2.5" /> Essencial
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {m.description ?? PLACEHOLDER_MODULES[m.key]?.description ?? 'Módulo do CRM.'}
                      </p>
                    </div>
                    <Switch
                      checked={m.isActive}
                      disabled={m.isCore || updating === m.key}
                      onCheckedChange={() => toggleModule(m.key)}
                      aria-label={`Ativar ${m.displayName}`}
                    />
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        ))}
      </div>
    </div>
  )
}
