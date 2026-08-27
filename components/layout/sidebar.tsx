'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_GROUPS } from './nav-config'
import { Icon } from './icon'
import { BrandMark } from '@/components/brand-mark'
import { useModules } from '@/components/providers/modules-provider'
import { useViewRole } from '@/components/providers/view-role-provider'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { isActive } = useModules()
  const { can, viewRole } = useViewRole()

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Brand */}
      <div className={cn('flex h-16 shrink-0 items-center border-b px-4', collapsed && 'justify-center px-2')}>
        {collapsed ? <BrandMark showName={false} /> : <BrandMark />}
        {!collapsed && onToggleCollapse && (
          <Button variant="ghost" size="icon-sm" className="ml-auto hidden lg:flex" onClick={onToggleCollapse} aria-label="Recolher menu">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-none px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.moduleKey && !isActive(item.moduleKey)) return false
            if (item.permission && !can(item.permission)) return false
            return true
          })
          if (visibleItems.length === 0) return null
          return (
            <div key={group.title}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.title}
                </p>
              )}
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast',
                          collapsed && 'justify-center px-2',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <Icon name={item.icon} className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary' : '')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Role indicator */}
      {!collapsed && (
        <div className="shrink-0 border-t p-3">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Visualizando como</p>
            <p className="text-sm font-semibold text-foreground">
              {viewRole === 'ADMIN' ? 'Administrador' : viewRole === 'MANAGER' ? 'Gestor' : 'Colaborador'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
