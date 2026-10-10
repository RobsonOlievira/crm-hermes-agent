'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'

type Client = { id: string; name: string; phone: string; email?: string | null }
type Member = { id: string; name: string; avatarUrl?: string | null }

interface Props {
  clients: Client[]
  members: Member[]
  onClose: () => void
  onCreated: (project: any) => void
}

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
]

export function ProjectForm({ clients, members, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [deadline, setDeadline] = useState('')
  const [projectLink, setProjectLink] = useState('')
  const [installmentCount, setInstallmentCount] = useState(1)
  const [assignedToId, setAssignedToId] = useState('')
  const [referralName, setReferralName] = useState('')
  const [referralModel, setReferralModel] = useState('')
  const [referralValue, setReferralValue] = useState('')

  // Credenciais iniciais (opcionais)
  const [credentials, setCredentials] = useState<{ label: string; url: string; username: string; password: string }[]>([])

  const addCredential = () => {
    setCredentials((prev) => [...prev, { label: '', url: '', username: '', password: '' }])
  }
  const removeCredential = (i: number) => {
    setCredentials((prev) => prev.filter((_, idx) => idx !== i))
  }
  const updateCredential = (i: number, field: string, value: string) => {
    setCredentials((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!clientId || !name || !totalValue || !startDate) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          name,
          description: description || null,
          totalValue: parseFloat(totalValue),
          startDate,
          deadline: deadline || null,
          projectLink: projectLink || null,
          installmentCount,
          assignedToId: assignedToId || null,
          referralName: referralName || null,
          referralModel: referralModel || null,
          referralValue: referralValue ? parseFloat(referralValue) : null,
          credentials: credentials.filter((c) => c.label),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar projeto')

      onCreated(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Novo Projeto</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">As parcelas serão criadas e provisionadas automaticamente.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Dados do cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome do Projeto *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Site Institucional — Loja Abc"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                required
                placeholder="2500.00"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nº de Parcelas
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 1)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {totalValue && installmentCount > 1 && (
                <p className="text-xs text-gray-400 mt-1">
                  ≈ {formatCurrency(parseFloat(totalValue) / installmentCount)} por parcela
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data de Início *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prazo de Entrega
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrição do Projeto
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descreva brevemente o escopo do projeto..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsável
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link do Projeto
              </label>
              <input
                type="url"
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Indicação */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Indicação (opcional)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nome do Indicador</label>
                <input
                  type="text"
                  value={referralName}
                  onChange={(e) => setReferralName(e.target.value)}
                  placeholder="Nome"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Modelo</label>
                <select
                  value={referralModel}
                  onChange={(e) => setReferralModel(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum</option>
                  <option value="PERCENTAGE">Percentual (%)</option>
                  <option value="FIXED">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {referralModel === 'PERCENTAGE' ? 'Percentual (%)' : 'Valor (R$)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={referralValue}
                  onChange={(e) => setReferralValue(e.target.value)}
                  disabled={!referralModel}
                  placeholder="0"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Credenciais */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Credenciais de Acesso (opcional)</h3>
              <button
                type="button"
                onClick={addCredential}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium"
              >
                + Adicionar
              </button>
            </div>
            {credentials.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma credencial. Você pode adicionar depois.</p>
            ) : (
              <div className="space-y-2">
                {credentials.map((cred, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Label (ex: cPanel)"
                      value={cred.label}
                      onChange={(e) => updateCredential(i, 'label', e.target.value)}
                      className="col-span-1 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="URL / Usuário"
                      value={cred.url}
                      onChange={(e) => updateCredential(i, 'url', e.target.value)}
                      className="col-span-1 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Senha"
                      value={cred.password}
                      onChange={(e) => updateCredential(i, 'password', e.target.value)}
                      className="col-span-1 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCredential(i)}
                      className="text-red-400 hover:text-red-600 text-xs py-1.5"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
