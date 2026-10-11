'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/format'

type Client = { id: string; name: string; phone: string; email?: string | null }

type OverdueInstallment = {
  id: string
  project: string
  client: string
  clientPhone: string
  amount: number
  dueDate: string
  daysLate: number
}

type GeneratedBilling = {
  text: string
  whatsappUrl: string
  client: { name: string; phone: string }
  total: number
  installmentCount: number
}

interface Props {
  clients: Client[]
}

export function BillingView({ clients }: Props) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [loading, setLoading] = useState(false)
  const [billing, setBilling] = useState<GeneratedBilling | null>(null)
  const [error, setError] = useState('')
  const [overdueList, setOverdueList] = useState<OverdueInstallment[]>([])
  const [overdueLoading, setOverdueLoading] = useState(true)
  const [copiedText, setCopiedText] = useState(false)

  const loadOverdue = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/financial')
      const data = await res.json()
      setOverdueList(data.overdueInstallments ?? [])
    } finally {
      setOverdueLoading(false)
    }
  }, [])

  useEffect(() => { loadOverdue() }, [loadOverdue])

  const generateBilling = async () => {
    if (!selectedClientId) { setError('Selecione um cliente.'); return }
    setError('')
    setLoading(true)
    setBilling(null)
    try {
      const res = await fetch('/api/billing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar cobrança')
      setBilling(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!billing?.text) return
    navigator.clipboard.writeText(billing.text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Painel de vencidas */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Parcelas Vencidas
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Parcelas não pagas e com data de vencimento no passado.</p>
        </div>

        {overdueLoading ? (
          <div className="text-center py-8 text-neutral-400 text-sm">Carregando...</div>
        ) : overdueList.length === 0 ? (
          <div className="text-center py-8 text-green-600 dark:text-green-400 text-sm font-medium">
            ✅ Nenhuma parcela vencida! Tudo em dia.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {overdueList.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {item.client}
                    <span className="text-neutral-400 font-normal mx-2">—</span>
                    {item.project}
                  </div>
                  <div className="text-xs text-red-500 font-medium mt-0.5">
                    Venceu {new Date(item.dueDate).toLocaleDateString('pt-BR')} — {item.daysLate} dias atrasado
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(item.amount)}</div>
                  </div>
                  <a
                    href={`https://wa.me/${item.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Passando para lembrar da parcela vencida em ${new Date(item.dueDate).toLocaleDateString('pt-BR')} referente a "${item.project}". Valor: ${formatCurrency(item.amount)}. Podemos verificar o pagamento? 🙏`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gerador de notinha */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Gerar Extrato de Cobranças</h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Selecione um cliente para ver todas as parcelas pendentes e enviar por WhatsApp.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3 items-start">
            <select
              value={selectedClientId}
              onChange={(e) => { setSelectedClientId(e.target.value); setBilling(null); setError('') }}
              className="flex-1 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
            <button
              onClick={generateBilling}
              disabled={loading || !selectedClientId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Gerando...' : 'Gerar Extrato'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {billing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{billing.client.name}</div>
                  <div className="text-xs text-neutral-400">
                    {billing.installmentCount} parcela{billing.installmentCount !== 1 ? 's' : ''} pendente{billing.installmentCount !== 1 ? 's' : ''}
                    {' — '}
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(billing.total)} a receber</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                  >
                    {copiedText ? '✓ Copiado' : 'Copiar texto'}
                  </button>
                  <a
                    href={billing.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Abrir WhatsApp
                  </a>
                </div>
              </div>

              {/* Preview da mensagem */}
              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-2 font-medium">Preview da mensagem:</div>
                <pre className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {billing.text}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
