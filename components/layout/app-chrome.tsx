'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import type { CurrentUser } from '@/components/providers/app-providers'

export function AppChrome({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 border-r shadow-lg transition-all duration-normal ease-out lg:shadow-none',
          collapsed ? 'w-[76px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main */}
      <div className={cn('transition-all duration-normal', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <Topbar user={user} onOpenSidebar={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
