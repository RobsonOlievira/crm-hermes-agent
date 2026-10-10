import React from 'react'
import { ProposalData } from '@/lib/proposal-types'
import { formatCurrency } from '@/lib/format'
import { ShieldCheck } from 'lucide-react'

interface Props {
  data: ProposalData
  id?: string
}

export const ProposalPreview: React.FC<Props> = ({ data, id }) => {
  const brandColor = data.companyColor || '#8b5cf6'
  const items = data.serviceItems ?? []

  const subtotal = data.subtotal ?? items.reduce((acc, item) => acc + (item.quantity ?? 1) * (item.price || 0), 0)
  const finalPrice = data.finalPrice ?? subtotal

  return (
    <div
      id={id}
      className="w-[794px] min-h-[1123px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 relative overflow-hidden flex flex-col p-12 print:p-8 font-['Inter'] selection:bg-transparent shadow-2xl border border-gray-200 dark:border-zinc-800"
      style={{
        backgroundImage: `radial-gradient(circle at 100% 0%, ${brandColor}15 0%, transparent 40%)`,
      }}
    >
      {/* Header com Branding do Tenant */}
      <header className="flex justify-between items-start pb-6 border-b border-gray-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          {data.companyLogo ? (
            <img src={data.companyLogo} alt={data.companyName} className="h-12 object-contain max-w-[180px]" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
              {data.companyName?.substring(0, 2).toUpperCase() || 'CRM'}
            </div>
          )}
          <div>
            <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">{data.companyName || 'Empresa'}</h2>
            <p className="text-xs text-gray-400">Proposta Comercial</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Orçamento Para</span>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{data.clientName || 'Nome do Cliente'}</h1>
          {data.clientEmail && <p className="text-xs text-gray-400">{data.clientEmail}</p>}
          <p className="text-xs text-gray-400 mt-1">Data: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </header>

      {/* Título do Serviço */}
      <div className="py-8 border-b border-gray-200 dark:border-zinc-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {data.serviceType || 'Serviço'}
        </span>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-1" style={{ color: brandColor }}>
          {data.serviceTitle || 'Prestação de Serviços'}
        </h2>
      </div>

      {/* Tabela de Entregáveis / Itens */}
      <div className="py-8 flex-grow">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Itens & Escopo do Projeto</h3>
        
        <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Descrição do Entregável</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 w-20">Qtd</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 w-32">Valor Unit.</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400 text-xs">Sem itens adicionados.</td>
                </tr>
              ) : (
                items.map((item, idx) => {
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo Financeiro e Condições */}
      <div className="py-6 border-t border-gray-200 dark:border-zinc-800 grid grid-cols-2 gap-8 items-end shrink-0">
        <div className="space-y-3">
          {data.paymentTerms && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Condições de Pagamento</h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                {data.paymentTerms}
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-zinc-800/50 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2 text-right">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {(data.discount ?? 0) > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Desconto:</span>
              <span className="text-green-600 dark:text-green-400">- {formatCurrency(data.discount || 0)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-zinc-700">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Investimento Final:</span>
            <span className="text-2xl font-extrabold" style={{ color: brandColor }}>
              {formatCurrency(finalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Observações e Rodapé */}
      <footer className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-800 flex justify-between items-end text-xs text-gray-400 shrink-0">
        <div className="w-2/3 space-y-1">
          {data.observations && (
            <>
              <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Observações:</p>
              <p className="leading-relaxed whitespace-pre-wrap text-[11px]">{data.observations}</p>
            </>
          )}
        </div>
        <div className="text-right flex items-center gap-1">
          <ShieldCheck size={14} /> Documento gerado por {data.companyName}
        </div>
      </footer>
    </div>
  )
}
