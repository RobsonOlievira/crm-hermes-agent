'use client'

import { SessionProvider } from 'next-auth/react'
import { BrandingProvider, Branding } from './branding-provider'
import { ModulesProvider, ModuleItem } from './modules-provider'
import { ViewRoleProvider, ViewRole } from './view-role-provider'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
  jobTitle: string | null
  avatarUrl: string | null
}

export function AppProviders({
  branding,
  modules,
  role,
  children,
}: {
  branding: Branding
  modules: ModuleItem[]
  role: ViewRole
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <BrandingProvider initial={branding}>
        <ModulesProvider initial={modules}>
          <ViewRoleProvider initial={role}>{children}</ViewRoleProvider>
        </ModulesProvider>
      </BrandingProvider>
    </SessionProvider>
  )
}
