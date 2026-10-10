'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProposalData } from '@/lib/proposal-types'
import { formatCurrency, formatDate } from '@/lib/format'
import { CheckCircle2, Download, ShieldCheck } from 'lucide-react'

interface Props {
  proposalId: string
  status: string
  data: ProposalData | null
  companyName: string
  logoUrl?: string | null
  primaryColor: string
  clientName: string
  createdAt: string
}

export function PublicProposalView({
  proposalId,
  status: initialStatus,
  data,
  companyName,
  logoUrl,
  primaryColor,
  clientName,
  createdAt,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/public`, { method: 'POST' })
      if (res.ok) {
        setStatus('ACCEPTED')
      } else {
        alert('Erro ao aprovar orçamento.')
      }
    } catch {
      alert('Erro de conexão.')
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (!data) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Não foi possível carregar os detalhes deste orçamento.
      </Card>
    )
  }

  const items = data.serviceItems ?? []
  const isAccepted = status === 'ACCEPTED'

  return (
    <div className="space-y-6">
      {/* Main Document Card */}
      <Card className="p-6 md:p-10 shadow-xl bg-white dark:bg-zinc-900 border-t-4 overflow-hidden print:shadow-none print:border-none" style={{ borderTopColor: primaryColor }}>
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-100 dark:border-zinc-800 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Para</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.clientName || clientName}</h2>
            {data.clientEmail && <p className="text-xs text-gray-500">{data.clientEmail}</p>}
          </div>
          <div className="sm:text-right">
            <div className="text-xs text-gray-400">Emissão: {formatDate(createdAt)}</div>
            {data.validUntil && <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Válido até: {data.validUntil}</div>}
          </div>
        </div>

        {/* Service Title */}
        <div className="py-6 border-b border-gray-100 dark:border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            {data.serviceType || 'Serviço'}
          </span>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {data.serviceTitle}
          </h3>
        </div>

        {/* Deliverables Table */}
        <div className="py-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Itens e Entregáveis</h4>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Descrição</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 w-20">Qtd</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 w-32">Valor Unit.</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {items.map((item, idx) => {
                  const qtd = item.quantity ?? 1
                  const total = qtd * (item.price || 0)
                  return (
                    <tr key={item.id || idx}>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{item.description}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{qtd}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(item.price || 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="py-6 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            {data.paymentTerms && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Condições de Pagamento</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                  {data.paymentTerms}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2 text-right">
            {(data.discount ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Desconto:</span>
                <span className="text-green-600 dark:text-green-400">- {formatCurrency(data.discount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-zinc-700">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Investimento Total:</span>
              <span className="text-2xl font-extrabold" style={{ color: primaryColor }}>
                {formatCurrency(data.finalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Observations */}
        {data.observations && (
          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Observações</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {data.observations}
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-zinc-800 flex justify-between items-center text-xs text-gray-400">
          <div>{companyName}</div>
          <div className="flex items-center gap-1"><ShieldCheck size={14} /> Orçamento oficial</div>
        </div>
      </Card>

      {/* Action Bar (Print / Accept) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-md print:hidden">
        <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
        </Button>

        {isAccepted ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm bg-green-50 dark:bg-green-950/40 px-4 py-2 rounded-lg border border-green-200 dark:border-green-900/50">
            <CheckCircle2 size={18} /> Orçamento Aprovado pelo Cliente!
          </div>
        ) : (
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="w-full sm:w-auto text-white shadow-lg font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? 'Aprovando...' : 'Aprovar Orçamento ✓'}
          </Button>
        )}
      </div>
    </div>
  )
}
