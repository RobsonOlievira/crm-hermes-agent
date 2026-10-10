'use client'

import { useState, useEffect, useCallback } from 'react'
import { MONTH_NAMES_PT, DEFAULT_EXPENSE_CATEGORIES } from '@/lib/crm-constants'
import { formatCurrency } from '@/lib/format'

type Client = { id: string; name: string; phone: string; email?: string | null }

type MonthData = {
  month: number
  receitaProjetada: number
  receitaRealizada: number
  receitaExtra: number
  despesas: number
  saldo: number
  observation?: string | null
}

type Installment = {
  id: string
  number: number
  amount: number
  dueDate: string
  paid: boolean
  paidAmount?: number | null
}

type MonthProject = {
  id: string
  name: string
  client: { name: string }
  status: string
  totalValue: number
  startDate: string
  installments: Installment[]
}

type MonthDetail = {
  projects: MonthProject[]
  activeProjects: { id: string; name: string; client: { name: string }; status: string }[]
  invoices: any[]
  receitaProjetada: number
  receitaRealizada: number
  receitaExtra: number
  despesas: number
  saldo: number
  cashFlow?: {
    id: string
    expenses: { id: string; category: string; description?: string | null; amount: number; isFixed: boolean }[]
    extraRevenues: { id: string; description: string; amount: number }[]
    revenueEntries: RevenueEntry[]
    observation?: string | null
  }
}

type BankAccount = { id: string; name: string; balance: number }
type DefaultExpense = { id: string; category: string; description: string; amount: number }
type RevenueSource = { id: string; name: string; icon: string | null; isRecurring: boolean; isActive: boolean; sortOrder: number }
type RevenueEntry = { sourceId: string; amount: number }

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

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth()

function KPICard({ label, value, sub, color = 'gray' }: { label: string; value: string; sub?: string; color?: 'green' | 'amber' | 'red' | 'blue' | 'gray' }) {
  const colorMap = {
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-gray-900 dark:text-gray-100',
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${colorMap[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export function CashFlowView({ clients = [] }: { clients?: Client[] }) {
  const [viewMode, setViewMode] = useState<'cashflow' | 'billing'>('cashflow')

  // --- Cashflow State ---
  const [year, setYear] = useState(CURRENT_YEAR)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [annualData, setAnnualData] = useState<{ months: MonthData[]; totals: MonthData; bankAccounts: BankAccount[]; defaultExpenses: DefaultExpense[]; revenueSources: RevenueSource[]; yearInvoices: any[] } | null>(null)
  const [monthDetail, setMonthDetail] = useState<MonthDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editExpenses, setEditExpenses] = useState<{ category: string; description: string; amount: string; isFixed: boolean }[]>([])
  const [editExtras, setEditExtras] = useState<{ description: string; amount: string }[]>([])
  const [editObs, setEditObs] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Default Expenses config
  const [showConfig, setShowConfig] = useState(false)
  const [defaultExpensesEdit, setDefaultExpensesEdit] = useState<{ category: string; description: string; amount: string }[]>([])

  // Revenue Sources config
  const [showRevenueSources, setShowRevenueSources] = useState(false)
  const [revenueSourcesEdit, setRevenueSourcesEdit] = useState<{ id?: string; name: string; icon: string; isRecurring: boolean; isActive: boolean }[]>([])
  const [savingRevenueSources, setSavingRevenueSources] = useState(false)

  // Revenue entries for selected month
  const [editRevenueEntries, setEditRevenueEntries] = useState<{ sourceId: string; name: string; icon: string | null; amount: string }[]>([])

  // --- Billing State ---
  const [selectedClientId, setSelectedClientId] = useState('')
  const [billingLoading, setBillingLoading] = useState(false)
  const [billing, setBilling] = useState<GeneratedBilling | null>(null)
  const [billingError, setBillingError] = useState('')
  const [overdueList, setOverdueList] = useState<OverdueInstallment[]>([])
  const [overdueLoading, setOverdueLoading] = useState(true)
  const [copiedText, setCopiedText] = useState(false)
  const [showBillingText, setShowBillingText] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [markError, setMarkError] = useState('')

  const loadAnnual = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cashflow?year=${year}`)
      const data = await res.json()
      setAnnualData(data)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { loadAnnual() }, [loadAnnual])

  useEffect(() => {
    if (viewMode === 'billing' && overdueLoading) {
      fetch('/api/dashboard/financial')
        .then((res) => res.json())
        .then((data) => {
          setOverdueList(data.overdueInstallments ?? [])
          setOverdueLoading(false)
        })
        .catch(() => setOverdueLoading(false))
    }
  }, [viewMode, overdueLoading])

  const loadMonth = async (month: number) => {
    setSelectedMonth(month)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/cashflow?year=${year}&month=${month}`)
      const data = await res.json()
      setMonthDetail(data)
      
      let exp = (data.cashFlow?.expenses ?? []).map((e: any) => ({
        category: e.category,
        description: e.description ?? '',
        amount: String(e.amount),
        isFixed: e.isFixed,
      }))
      
      // Auto-load default expenses if none exist for this month
      if (exp.length === 0 && data.defaultExpenses && data.defaultExpenses.length > 0) {
        exp = data.defaultExpenses.map((de: any) => ({
           category: de.category,
           description: de.description,
           amount: String(de.amount),
           isFixed: true
        }))
      }
      
      setEditExpenses(exp)

      setEditExtras(
        (data.cashFlow?.extraRevenues ?? []).map((r: any) => ({
          description: r.description,
          amount: String(r.amount),
        }))
      )

      // Inicializar revenue entries com todas as fontes ativas do tenant
      const sources: RevenueSource[] = data.revenueSources ?? annualData?.revenueSources ?? []
      const entriesMap = new Map((data.cashFlow?.revenueEntries ?? []).map((e: RevenueEntry) => [e.sourceId, e.amount]))
      setEditRevenueEntries(
        sources
          .filter((s) => s.isActive)
          .map((s) => ({
            sourceId: s.id,
            name: s.name,
            icon: s.icon,
            amount: entriesMap.has(s.id) ? String(entriesMap.get(s.id)) : '',
          }))
      )

      setEditObs(data.cashFlow?.observation ?? '')
    } finally {
      setDetailLoading(false)
    }
  }

  const saveMonth = async () => {
    if (selectedMonth === null) return
    setSaving(true)
    try {
      await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month: selectedMonth,
          expenses: editExpenses.map((e) => ({
            category: e.category,
            description: e.description || null,
            amount: parseFloat(e.amount) || 0,
            isFixed: e.isFixed,
          })).filter((e) => e.amount > 0 && e.category),
          extraRevenues: editExtras.map((r) => ({
            description: r.description,
            amount: parseFloat(r.amount) || 0,
          })).filter((r) => r.amount > 0 && r.description),
          revenueEntries: editRevenueEntries.map((e) => ({
            sourceId: e.sourceId,
            amount: parseFloat(e.amount) || 0,
          })).filter((e) => e.amount > 0),
          observation: editObs || null,
        }),
      })
      await loadAnnual()
      await loadMonth(selectedMonth)
    } finally {
      setSaving(false)
    }
  }

  const markInstallmentPaid = async (projectId: string, installment: Installment) => {
    if (selectedMonth === null) return
    setMarkingId(installment.id)
    setMarkError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/installments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId: installment.id, paidAmount: installment.amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao marcar parcela como paga')
      await loadAnnual()
      await loadMonth(selectedMonth)
    } catch (err: any) {
      setMarkError(err.message)
    } finally {
      setMarkingId(null)
    }
  }
  
  const saveDefaultExpenses = async () => {
    try {
      await fetch('/api/cashflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: defaultExpensesEdit.filter(e => e.amount && e.category) }),
      })
      setShowConfig(false)
      await loadAnnual()
    } catch (e) {
      console.error(e)
    }
  }

  const saveRevenueSources = async () => {
    setSavingRevenueSources(true)
    try {
      const res = await fetch('/api/cashflow/revenue-sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: revenueSourcesEdit.filter(s => s.name.trim()) }),
      })
      if (!res.ok) throw new Error('Erro ao salvar fontes')
      setShowRevenueSources(false)
      await loadAnnual()
      // Re-inicializar entries do mês se houver mês selecionado
      if (selectedMonth !== null) await loadMonth(selectedMonth)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingRevenueSources(false)
    }
  }

  const generateBilling = async () => {
    if (!selectedClientId) { setBillingError('Selecione um cliente.'); return }
    setBillingError('')
    setBillingLoading(true)
    setBilling(null)
    setShowBillingText(false)
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
      setBillingError(err.message)
    } finally {
      setBillingLoading(false)
    }
  }

  const handleCopy = () => {
    if (!billing?.text) return
    navigator.clipboard.writeText(billing.text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const totals = annualData?.totals

  return (
    <div className="space-y-5">
      {/* Abas */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          onClick={() => setViewMode('cashflow')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'cashflow'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Visão Anual
        </button>
        <button
          onClick={() => setViewMode('billing')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'billing'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Inadimplência e Cobranças
        </button>
      </div>

      {viewMode === 'cashflow' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6">
            {/* Header / Configuração */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setYear((y) => y - 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  ‹
                </button>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[60px] text-center">{year}</span>
                <button
                  onClick={() => setYear((y) => y + 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  ›
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setRevenueSourcesEdit((annualData?.revenueSources || []).map(s => ({ id: s.id, name: s.name, icon: s.icon ?? '', isRecurring: s.isRecurring, isActive: s.isActive })))
                    setShowRevenueSources(true)
                  }}
                  className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
                >
                  📊 Fontes de Receita
                </button>
                <button
                  onClick={() => {
                    setDefaultExpensesEdit((annualData?.defaultExpenses || []).map(d => ({ category: d.category, description: d.description, amount: String(d.amount) })))
                    setShowConfig(true)
                  }}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ⚙️ Configurar Despesas Fixas
                </button>
              </div>
            </div>

          {/* Grid de meses */}
          {loading ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">Carregando...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(annualData?.months ?? []).map((m) => {
                const isSelected = selectedMonth === m.month
                const isCurrent = m.month === CURRENT_MONTH && year === CURRENT_YEAR
                const isFuture = year > CURRENT_YEAR || (year === CURRENT_YEAR && m.month > CURRENT_MONTH)

                return (
                  <button
                    key={m.month}
                    onClick={() => loadMonth(m.month)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isCurrent
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {MONTH_NAMES_PT[m.month].slice(0, 3)}
                        {isCurrent && <span className="ml-1 text-xs text-amber-500">•</span>}
                        {isFuture && <span className="ml-1 text-xs text-gray-400 font-normal">→</span>}
                      </span>
                      <span className={`text-xs font-medium ${m.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {m.saldo >= 0 ? '+' : ''}{formatCurrency(m.saldo)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {m.receitaProjetada > 0 && (
                        <div className="flex justify-between">
                          <span>Proj.</span>
                          <span className="text-blue-500">{formatCurrency(m.receitaProjetada)}</span>
                        </div>
                      )}
                      {m.receitaRealizada > 0 && (
                        <div className="flex justify-between">
                          <span>Real.</span>
                          <span className="text-green-600 dark:text-green-400">{formatCurrency(m.receitaRealizada)}</span>
                        </div>
                      )}
                      {m.receitaExtra > 0 && (
                        <div className="flex justify-between">
                          <span>Extra</span>
                          <span className="text-teal-500">{formatCurrency(m.receitaExtra)}</span>
                        </div>
                      )}
                      {m.despesas > 0 && (
                        <div className="flex justify-between">
                          <span>Desp.</span>
                          <span className="text-red-500">−{formatCurrency(m.despesas)}</span>
                        </div>
                      )}
                    </div>

                    {/* Mini barra de progresso */}
                    {m.receitaProjetada > 0 && (
                      <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (m.receitaRealizada / m.receitaProjetada) * 100)}%` }}
                        />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Painel do mês selecionado */}
          {selectedMonth !== null && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {MONTH_NAMES_PT[selectedMonth]} {year}
                </h3>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {detailLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Carregando mês...</div>
              ) : monthDetail && (
                <div className="p-6 space-y-6">
                  {/* Projetos em andamento e projetos do mês */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Projetos Ativos ({monthDetail.activeProjects?.length || 0})
                      </h4>
                      {(!monthDetail.activeProjects || monthDetail.activeProjects.length === 0) ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum projeto em andamento.</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                          {monthDetail.activeProjects.map((p) => (
                            <div key={p.id} className="px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                              <div className="text-xs text-gray-400">{p.client.name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Projetos do Mês ({monthDetail.projects?.length || 0})
                      </h4>
                      {!monthDetail.projects || monthDetail.projects.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum projeto iniciado neste mês.</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                          {monthDetail.projects.map((proj) => (
                            <div key={proj.id} className="px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{proj.name}</div>
                                  <div className="text-xs text-gray-400">{proj.client.name}</div>
                                </div>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  {formatCurrency(proj.totalValue)}
                                </div>
                              </div>
                              <div className="mt-2 space-y-1 border-t border-gray-200 dark:border-gray-700 pt-2">
                                {proj.installments.map((inst) => (
                                  <label
                                    key={inst.id}
                                    className={`flex items-center justify-between gap-2 rounded px-1 py-1 cursor-pointer ${
                                      inst.paid
                                        ? 'bg-green-50 dark:bg-green-900/10'
                                        : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/30'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={inst.paid}
                                        disabled={inst.paid || markingId !== null}
                                        onChange={() => markInstallmentPaid(proj.id, inst)}
                                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 accent-green-600"
                                      />
                                      <span className="text-xs text-gray-700 dark:text-gray-300">
                                        Parcela {inst.number}
                                        <span className="text-[10px] text-gray-400">
                                          {' '}— {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                                        </span>
                                      </span>
                                    </span>
                                    <span className={`text-xs font-semibold ${inst.paid ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {inst.paid
                                        ? formatCurrency(inst.paidAmount ?? inst.amount)
                                        : formatCurrency(inst.amount)}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {markingId !== null && (
                        <p className="text-xs text-gray-400 mt-2">Salvando pagamento...</p>
                      )}
                      {markError && (
                        <p className="text-xs text-red-500 mt-2">{markError}</p>
                      )}
                    </div>
                  </div>

                  {/* Despesas editáveis */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Despesas</h4>
                      <button
                        onClick={() => setEditExpenses((prev) => [...prev, { category: '', description: '', amount: '', isFixed: false }])}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                      >
                        + Adicionar
                      </button>
                    </div>
                    {editExpenses.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma despesa registrada.</p>
                    ) : (
                      <div className="space-y-2">
                        {editExpenses.map((exp, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <select
                              value={exp.category}
                              onChange={(e) => setEditExpenses((prev) => prev.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))}
                              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Categoria...</option>
                              {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Descrição"
                              value={exp.description}
                              onChange={(e) => setEditExpenses((prev) => prev.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                              className="w-32 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="R$"
                              value={exp.amount}
                              onChange={(e) => setEditExpenses((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))}
                              className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={exp.isFixed}
                                onChange={(e) => setEditExpenses((prev) => prev.map((x, idx) => idx === i ? { ...x, isFixed: e.target.checked } : x))}
                                className="rounded"
                              />
                              Fixa
                            </label>
                            <button
                              onClick={() => setEditExpenses((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-600 text-xs px-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fontes de Receita */}
                  {editRevenueEntries.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fontes de Receita</h4>
                        <button
                          onClick={() => {
                            setRevenueSourcesEdit((annualData?.revenueSources || []).map(s => ({ id: s.id, name: s.name, icon: s.icon ?? '', isRecurring: s.isRecurring, isActive: s.isActive })))
                            setShowRevenueSources(true)
                          }}
                          className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium"
                        >
                          ⚙️ Gerenciar
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editRevenueEntries.map((entry, i) => (
                          <div key={entry.sourceId} className="flex items-center gap-2">
                            <span className="text-base w-6 text-center flex-shrink-0">{entry.icon || '💰'}</span>
                            <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{entry.name}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="R$"
                              value={entry.amount}
                              onChange={(e) => setEditRevenueEntries((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))}
                              className="w-28 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {editRevenueEntries.length === 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Nenhuma fonte de receita configurada.</span>
                      <button
                        onClick={() => { setRevenueSourcesEdit([]); setShowRevenueSources(true) }}
                        className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline"
                      >
                        + Adicionar
                      </button>
                    </div>
                  )}

                  {/* Receitas extras editáveis */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Receitas Extras</h4>
                      <button
                        onClick={() => setEditExtras((prev) => [...prev, { description: '', amount: '' }])}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                      >
                        + Adicionar
                      </button>
                    </div>
                    {editExtras.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma receita extra este mês.</p>
                    ) : (
                      <div className="space-y-2">
                        {editExtras.map((ext, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Descrição da receita..."
                              value={ext.description}
                              onChange={(e) => setEditExtras((prev) => prev.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="R$"
                              value={ext.amount}
                              onChange={(e) => setEditExtras((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))}
                              className="w-28 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => setEditExtras((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-600 text-xs px-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Observação */}
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Observação do mês</label>
                    <textarea
                      value={editObs}
                      onChange={(e) => setEditObs(e.target.value)}
                      rows={2}
                      placeholder="Anotações sobre este mês..."
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={saveMonth}
                      disabled={saving}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      {saving ? 'Salvando...' : 'Salvar Mês'}
                    </button>
                  </div>
                </div>
            )}
          </div>
          )}
          </div>
          
          {/* BARRA LATERAL */}
          <div className="lg:col-span-1 space-y-4">
             {/* Resumo do Ano */}
             <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Resumo {year}</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500">Faturamento Projetado</div>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(totals?.receitaProjetada || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Recebido (Realizado)</div>
                    <div className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totals?.receitaRealizada || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gastos Totais</div>
                    <div className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(totals?.despesas || 0)}</div>
                  </div>
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-xs text-gray-500">Saldo Anual</div>
                    <div className={`font-bold ${(totals?.saldo || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>{formatCurrency(totals?.saldo || 0)}</div>
                  </div>
                </div>
             </div>
             
             {/* Provisionado do Mês (se selecionado) */}
             {selectedMonth !== null && (
               <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 p-5">
                  <h3 className="font-bold text-blue-800 dark:text-blue-400 text-sm mb-1">Provisionado (Mês)</h3>
                  <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-2">A Receber</div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                     {formatCurrency((monthDetail?.receitaProjetada || 0) - (monthDetail?.receitaRealizada || 0))}
                  </div>
               </div>
             )}
             
             {/* Contas Bancárias */}
             <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Contas Bancárias</h3>
                {(!annualData?.bankAccounts || annualData.bankAccounts.length === 0) ? (
                  <p className="text-xs text-gray-500">Nenhuma conta cadastrada.</p>
                ) : (
                  <div className="space-y-3">
                    {annualData.bankAccounts.map(b => (
                      <div key={b.id} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{b.name}</span>
                        <span className={`text-sm font-semibold ${b.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {formatCurrency(b.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             {/* Notas Fiscais */}
             <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Notas Fiscais</h3>
                
                {selectedMonth !== null ? (
                   <div>
                     <div className="text-xs text-gray-500 mb-1">Total emitido no mês</div>
                     <div className="font-semibold text-gray-800 dark:text-gray-200">
                       {formatCurrency((monthDetail?.invoices || []).reduce((a, b) => a + b.amount, 0))}
                     </div>
                   </div>
                ) : (
                   <div>
                     <div className="text-xs text-gray-500 mb-1">Total emitido no ano</div>
                     <div className="font-semibold text-gray-800 dark:text-gray-200">
                       {formatCurrency((annualData?.yearInvoices || []).reduce((a, b) => a + b.amount, 0))}
                     </div>
                   </div>
                )}
             </div>
             
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Painel de vencidas */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                Parcelas Vencidas
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Parcelas não pagas e com data de vencimento no passado.</p>
            </div>

            {overdueLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
            ) : overdueList.length === 0 ? (
              <div className="text-center py-8 text-green-600 dark:text-green-400 text-sm font-medium">
                ✅ Nenhuma parcela vencida! Tudo em dia.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {overdueList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.client}
                        <span className="text-gray-400 font-normal mx-2">—</span>
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Gerar Extrato de Cobranças</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Selecione um cliente para ver todas as parcelas pendentes e gerar a mensagem de cobrança.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-3 items-start">
                <select
                  value={selectedClientId}
                  onChange={(e) => { setSelectedClientId(e.target.value); setBilling(null); setBillingError('') }}
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
                <button
                  onClick={generateBilling}
                  disabled={billingLoading || !selectedClientId}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {billingLoading ? 'Gerando...' : 'Gerar Extrato'}
                </button>
              </div>

              {billingError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                  {billingError}
                </div>
              )}

              {billing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{billing.client.name}</div>
                      <div className="text-xs text-gray-400">
                        {billing.installmentCount} parcela{billing.installmentCount !== 1 ? 's' : ''} pendente{billing.installmentCount !== 1 ? 's' : ''}
                        {' — '}
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(billing.total)} a receber</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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

                  {/* Preview da mensagem oculto por padrão */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <button
                      onClick={() => setShowBillingText(!showBillingText)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1"
                    >
                      {showBillingText ? 'Ocultar texto gerado' : 'Mostrar texto gerado'}
                    </button>
                    {showBillingText && (
                      <textarea
                        readOnly
                        className="w-full text-xs text-gray-700 dark:text-gray-300 font-sans leading-relaxed bg-transparent border-none resize-none focus:outline-none"
                        rows={billing.text.split('\n').length}
                        value={billing.text}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Despesas Fixas */}
      {/* Modal Fontes de Receita */}
      {showRevenueSources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Fontes de Receita</h2>
              <button onClick={() => setShowRevenueSources(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-500">
                Cadastre suas fontes de receita recorrentes (YouTube, AdSense, cursos, etc.). A cada mês, basta digitar o valor de cada fonte.
              </p>
              <div className="space-y-3">
                {revenueSourcesEdit.map((src, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <input
                      type="text"
                      placeholder="Emoji"
                      value={src.icon}
                      onChange={(e) => setRevenueSourcesEdit((prev) => prev.map((x, idx) => idx === i ? { ...x, icon: e.target.value } : x))}
                      className="w-12 text-center border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      placeholder="Nome da fonte (ex: YouTube)"
                      value={src.name}
                      onChange={(e) => setRevenueSourcesEdit((prev) => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                      className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={src.isActive}
                        onChange={(e) => setRevenueSourcesEdit((prev) => prev.map((x, idx) => idx === i ? { ...x, isActive: e.target.checked } : x))}
                        className="rounded"
                      />
                      Ativa
                    </label>
                    <button onClick={() => setRevenueSourcesEdit((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-500 text-xs font-medium hover:text-red-700">✕</button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setRevenueSourcesEdit((prev) => [...prev, { name: '', icon: '', isRecurring: true, isActive: true }])}
                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                + Adicionar Fonte
              </button>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
              <button onClick={() => setShowRevenueSources(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Cancelar</button>
              <button
                onClick={saveRevenueSources}
                disabled={savingRevenueSources}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {savingRevenueSources ? 'Salvando...' : 'Salvar Fontes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Despesas Fixas Padrão</h2>
              <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-500">
                Estas despesas serão carregadas automaticamente em qualquer novo mês selecionado.
              </p>
              
              <div className="space-y-3">
                 {defaultExpensesEdit.map((exp, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                       <div className="flex justify-between items-center">
                         <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Despesa {i + 1}</span>
                         <button onClick={() => setDefaultExpensesEdit(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 text-xs font-medium">Remover</button>
                       </div>
                       <select
                         value={exp.category}
                         onChange={(e) => setDefaultExpensesEdit((prev) => prev.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))}
                         className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
                       >
                         <option value="">Categoria...</option>
                         {DEFAULT_EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                       </select>
                       <input
                         type="text"
                         placeholder="Descrição (Ex: Conta de Internet)"
                         value={exp.description}
                         onChange={(e) => setDefaultExpensesEdit((prev) => prev.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                         className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
                       />
                       <input
                         type="number"
                         min="0"
                         step="0.01"
                         placeholder="Valor R$"
                         value={exp.amount}
                         onChange={(e) => setDefaultExpensesEdit((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))}
                         className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
                       />
                    </div>
                 ))}
              </div>
              <button
                onClick={() => setDefaultExpensesEdit(prev => [...prev, { category: '', description: '', amount: '' }])}
                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                + Adicionar Despesa
              </button>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
              <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Cancelar</button>
              <button onClick={saveDefaultExpenses} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Salvar Configurações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
