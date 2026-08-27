'use client'

import { createContext, useContext, useState, useCallback } from 'react'

export interface ModuleItem {
  id: string
  key: string
  displayName: string
  description: string | null
  category: string
  isActive: boolean
  isCore: boolean
  sortOrder: number
}

interface ModulesContextValue {
  modules: ModuleItem[]
  isActive: (key: string) => boolean
  toggleModule: (key: string) => void
  updating: string | null
}

const ModulesContext = createContext<ModulesContextValue | null>(null)

export function ModulesProvider({ initial, children }: { initial: ModuleItem[]; children: React.ReactNode }) {
  const [modules, setModules] = useState<ModuleItem[]>(initial ?? [])
  const [updating, setUpdating] = useState<string | null>(null)

  const isActive = useCallback(
    (key: string) => modules?.some((m) => m?.key === key && m?.isActive) ?? false,
    [modules]
  )

  const toggleModule = useCallback(async (key: string) => {
    let nextValue = false
    setModules((prev) =>
      prev.map((m) => {
        if (m.key === key && !m.isCore) {
          nextValue = !m.isActive
          return { ...m, isActive: nextValue }
        }
        return m
      })
    )
    setUpdating(key)
    try {
      await fetch('/api/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, isActive: nextValue }),
      })
    } catch (e) {
      // ignore in demo
    } finally {
      setUpdating(null)
    }
  }, [])

  return (
    <ModulesContext.Provider value={{ modules, isActive, toggleModule, updating }}>
      {children}
    </ModulesContext.Provider>
  )
}

export function useModules() {
  const ctx = useContext(ModulesContext)
  if (!ctx) throw new Error('useModules deve ser usado dentro de ModulesProvider')
  return ctx
}
