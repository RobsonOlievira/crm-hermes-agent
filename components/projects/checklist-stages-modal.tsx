'use client'

import { useState } from 'react'

type ChecklistStage = { id?: string; label: string; sortOrder: number; isActive: boolean; isSystem?: boolean }

interface Props {
  stages: ChecklistStage[]
  onClose: () => void
  onSaved: (stages: ChecklistStage[]) => void
}

export function ChecklistStagesModal({ stages: initial, onClose, onSaved }: Props) {
  const [stages, setStages] = useState<ChecklistStage[]>(
    initial.length > 0
      ? initial.map((s) => ({ ...s }))
      : [{ label: '', sortOrder: 0, isActive: true }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (i: number, patch: Partial<ChecklistStage>) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const remove = (i: number) => setStages((prev) => prev.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    setStages((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const save = async () => {
    setError('')
    const clean = stages.map((s, i) => ({ label: s.label.trim(), sortOrder: i, isActive: s.isActive })).filter((s) => s.label)
    if (clean.length === 0) {
      setError('Adicione ao menos uma etapa.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/projects/checklist-stages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar etapas')
      onSaved(data.stages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Etapas do Checklist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-500">
            Estas etapas aparecem como checklist em cada novo projeto/proposta. Alterações valem para os próximos criados.
          </p>
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 text-sm">{error}</div>}

          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs leading-none">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === stages.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs leading-none">▼</button>
              </div>
              <input
                type="text"
                placeholder="Nome da etapa"
                value={s.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                <input type="checkbox" checked={s.isActive} onChange={(e) => update(i, { isActive: e.target.checked })} className="rounded" />
                Ativa
              </label>
              <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-sm px-1">×</button>
            </div>
          ))}

          <button
            onClick={() => setStages((prev) => [...prev, { label: '', sortOrder: prev.length, isActive: true }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            + Adicionar etapa
          </button>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar etapas'}
          </button>
        </div>
      </div>
    </div>
  )
}
