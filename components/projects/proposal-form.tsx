'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'

type Client = { id: string; name: string; phone: string; email?: string | null }

interface Props {
  clients: Client[]
  onClose: () => void
  onCreated: (project: any) => void
}

export function ProposalForm({ clients, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<'existing' | 'new'>(clients.length > 0 ? 'existing' : 'new')
  const [clientId, setClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')

  const [name, setName] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0])
  const [plannedDate, setPlannedDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'existing' && !clientId) {
      setError('Selecione um cliente ou cadastre um novo.')
      return
    }
    if (mode === 'new' && !newClientName.trim()) {
      setError('Informe o nome do novo cliente.')
      return
    }
    if (!name.trim() || !totalValue) {
      setError('Preencha o tema/serviço e o valor proposto.')
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        kind: 'PROPOSAL',
        name: name.trim(),
        totalValue: parseFloat(totalValue),
        proposalDate: proposalDate || null,
        plannedDate: plannedDate || null,
      }
      if (mode === 'existing') {
        payload.clientId = clientId
      } else {
        payload.newClient = { name: newClientName.trim(), phone: newClientPhone.trim() }
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar proposta')
      onCreated(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nova Proposta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Registre uma negociação em andamento. Nada entra no caixa até ser iniciada.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none p-1">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente *</label>
              <button
                type="button"
                onClick={() => setMode(mode === 'existing' ? 'new' : 'existing')}
                className="text-xs font-medium text-[#8b5cf6] hover:underline"
              >
                {mode === 'existing' ? '+ Novo cliente' : '← Escolher existente'}
              </button>
            </div>
            {mode === 'existing' ? (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
              >
                <option value="">Selecionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                />
                <input
                  type="text"
                  placeholder="WhatsApp / telefone"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                />
              </div>
            )}
          </div>

          {/* Tema / serviço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema / Serviço proposto *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vídeo institucional — Loja Abc"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor proposto (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="2500.00"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
              />
              {totalValue && <p className="text-xs text-gray-400 mt-1">{formatCurrency(parseFloat(totalValue) || 0)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de entrada</label>
              <input
                type="date"
                value={proposalDate}
                onChange={(e) => setProposalDate(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data planejada de execução</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
            />
            <p className="text-xs text-gray-400 mt-1">Apenas planejamento — a data real é definida quando você iniciar o projeto.</p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Cancelar</button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Criar Proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
