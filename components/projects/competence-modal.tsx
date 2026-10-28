'use client'

import { useState } from 'react'
import { MONTH_NAMES_PT } from '@/lib/crm-constants'

interface Props {
  title?: string
  description?: string
  /** Aviso extra exibido em destaque (ex.: "as parcelas em aberto serão movidas") */
  note?: string
  initialYear: number
  initialMonth: number
  confirmLabel?: string
  onSave: (year: number, month: number) => Promise<void> | void
  onClose: () => void
}

/**
 * Seletor de competência (mês/ano) usado para mover um projeto ou uma proposta
 * de mês sem precisar editar a data completa.
 */
export function CompetenceModal({
  title = 'Alterar mês',
  description,
  note,
  initialYear,
  initialMonth,
  confirmLabel = 'Mover',
  onSave,
  onClose,
}: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentYear = new Date().getUTCFullYear()
  const years = Array.from({ length: 9 }, (_, i) => currentYear - 3 + i)
  if (!years.includes(year)) years.push(year)
  years.sort((a, b) => a - b)

  const changed = year !== initialYear || month !== initialMonth

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{title}</h3>
        {description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">{description}</p>}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Mês</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
            >
              {MONTH_NAMES_PT.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Ano</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {note && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2">
            {note}
          </p>
        )}
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Cancelar
          </button>
          <button
            disabled={loading || !changed}
            onClick={async () => {
              setLoading(true)
              setError('')
              try {
                await onSave(year, month)
              } catch (err: any) {
                setError(err?.message || 'Não foi possível alterar o mês.')
              } finally {
                setLoading(false)
              }
            }}
            className="px-5 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Movendo...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
