'use client'

import { createContext, useContext, useState, useCallback } from 'react'

export type ViewRole = 'ADMIN' | 'MANAGER' | 'MEMBER'

interface ViewRoleContextValue {
  viewRole: ViewRole
  setViewRole: (r: ViewRole) => void
  can: (permission: string) => boolean
}

// Permission matrix from PRD section 9.2
const ROLE_PERMISSIONS: Record<ViewRole, string[]> = {
  ADMIN: [
    'settings:modules', 'settings:branding', 'settings:integrations', 'settings:team',
    'leads:view:all', 'leads:create', 'leads:edit', 'leads:delete',
    'dashboard:full', 'payments:manage', 'automations:config', 'reports:access', 'audit:view',
  ],
  MANAGER: [
    'settings:team',
    'leads:view:all', 'leads:create', 'leads:edit',
    'dashboard:full', 'payments:view', 'automations:config', 'reports:access',
  ],
  MEMBER: [
    'leads:view:own', 'leads:create', 'leads:edit',
    'dashboard:own', 'payments:view', 'reports:own',
  ],
}

const ViewRoleContext = createContext<ViewRoleContextValue | null>(null)

export function ViewRoleProvider({ initial, children }: { initial: ViewRole; children: React.ReactNode }) {
  const [viewRole, setViewRole] = useState<ViewRole>(initial ?? 'ADMIN')
  const can = useCallback((permission: string) => ROLE_PERMISSIONS[viewRole]?.includes(permission) ?? false, [viewRole])
  return (
    <ViewRoleContext.Provider value={{ viewRole, setViewRole, can }}>
      {children}
    </ViewRoleContext.Provider>
  )
}

export function useViewRole() {
  const ctx = useContext(ViewRoleContext)
  if (!ctx) throw new Error('useViewRole deve ser usado dentro de ViewRoleProvider')
  return ctx
}
