'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { hexToHslString } from '@/lib/color'

export interface Branding {
  tenantName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
}

interface BrandingContextValue {
  branding: Branding
  setBranding: (b: Partial<Branding>) => void
  saveBranding: (b: Partial<Branding>) => Promise<void>
  saving: boolean
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function BrandingProvider({ initial, children }: { initial: Branding; children: React.ReactNode }) {
  const [branding, setBrandingState] = useState<Branding>(initial)
  const [saving, setSaving] = useState(false)

  const applyColors = useCallback((primary: string, secondary: string) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.style.setProperty('--primary', hexToHslString(primary))
    root.style.setProperty('--ring', hexToHslString(primary))
    root.style.setProperty('--brand-primary', primary)
    root.style.setProperty('--brand-secondary', secondary)
  }, [])

  useEffect(() => {
    applyColors(branding.primaryColor, branding.secondaryColor)
  }, [branding.primaryColor, branding.secondaryColor, applyColors])

  const setBranding = useCallback((b: Partial<Branding>) => {
    setBrandingState((prev) => ({ ...prev, ...b }))
  }, [])

  const saveBranding = useCallback(async (b: Partial<Branding>) => {
    setBrandingState((prev) => ({ ...prev, ...b }))
    setSaving(true)
    try {
      await fetch('/api/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      })
    } catch (e) {
      // ignore in demo
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <BrandingContext.Provider value={{ branding, setBranding, saveBranding, saving }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding deve ser usado dentro de BrandingProvider')
  return ctx
}
