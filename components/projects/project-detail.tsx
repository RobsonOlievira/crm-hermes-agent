'use client'

import { useState } from 'react'
import { PROJECT_STATUS_META, PROJECT_PAYMENT_METHOD_OPTIONS } from '@/lib/crm-constants'
import { formatCurrency } from '@/lib/format'
import { formatCompetenceDate } from '@/lib/date-utils'

type Installment = {
  id: string
  number: number
  amount: number
  dueDate: Date | string
  paid: boolean
  paidAt?: Date | string | null
  paidAmount?: number | null
  paymentMethod?: string | null
  notes?: string | null
}

type Credential = {
  id: string
  label: string
  url?: string | null
  username?: string | null
  email?: string | null
  password?: string | null
  notes?: string | null
}

type Project = {
  id: string
  name: string
  description?: string | null
  status: string
  startDate: Date | string
  deadline?: Date | string | null
  totalValue: number
  projectLink?: string | null
  referralName?: string | null
  referralModel?: string | null
  referralValue?: number | null
  referralPaid: boolean
  proposalDate?: Date | string | null
  plannedDate?: Date | string | null
  checklist?: string | null
  createdAt: Date | string
  client: { id: string; name: string; phone: string; email?: string | null; companyName?: string | null }
  assignedTo?: { id: string; name: string } | null
  installments: Installment[]
}

type ChecklistItem = { stageId: string; label: string; done: boolean; doneAt: string | null }

function parseChecklist(raw?: string | null): ChecklistItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface Props {
  project: Project
  onClose: () => void
  onUpdated: (project: Project) => void
  onInstallmentPaid: (projectId: string, installmentId: string) => void
  onDeleted?: (projectId: string) => void
}

const STATUS_OPTIONS = ['ENTRY', 'IN_PROGRESS', 'CLOSED', 'PAID', 'CANCELLED']

function EditInstallmentModal({
  installment,
  onSave,
  onClose,
}: {
  installment: Installment
  onSave: (params: { amount: number; dueDate: string }) => Promise<void>
  onClose: () => void
}) {
  const [amount, setAmount] = useState(String(installment.amount))
  const [dueDate, setDueDate] = useState(new Date(installment.dueDate).toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Editar Parcela {installment.number}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Valor (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Vencimento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
            Cancelar
          </button>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              await onSave({ amount: parseFloat(amount), dueDate })
              setLoading(false)
            }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PayInstallmentModal({
  installment,
  onPay,
  onClose,
}: {
  installment: Installment
  onPay: (params: { paidAmount: number; paymentMethod: string }) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState(String(installment.amount))
  const [method, setMethod] = useState('PIX')
  const [loading, setLoading] = useState(false)

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Confirmar Pagamento — Parcela {installment.number}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Valor pago (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Forma de pagamento</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PROJECT_PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Cancelar
          </button>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              await onPay({ paidAmount: parseFloat(amount), paymentMethod: method })
              setLoading(false)
            }}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Confirmando...' : 'Confirmar Pagamento ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-xs text-neutral-400 hover:text-blue-500 transition-colors ml-2"
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

function ActivateModal({
  project,
  onActivate,
  onClose,
}: {
  project: Project
  onActivate: (params: { startDate: string; installmentCount: number }) => Promise<void>
  onClose: () => void
}) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [installmentCount, setInstallmentCount] = useState(1)
  const [loading, setLoading] = useState(false)

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Iniciar projeto</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          A proposta vira um projeto ativo e as parcelas são provisionadas no mês da data escolhida.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Data de início (competência)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Nº de parcelas</label>
            <input
              type="number"
              min="1"
              max="60"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 1)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {installmentCount > 1 && (
              <p className="text-xs text-neutral-400 mt-1">≈ {formatCurrency(project.totalValue / installmentCount)} por parcela</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">Cancelar</button>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              await onActivate({ startDate, installmentCount })
              setLoading(false)
            }}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Iniciando...' : 'Iniciar projeto ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProjectDetail({ project, onClose, onUpdated, onInstallmentPaid, onDeleted }: Props) {
  const isProposal = project.status === 'PROPOSAL'
  const [activeTab, setActiveTab] = useState<'checklist' | 'parcelas' | 'credenciais' | 'detalhes'>(isProposal ? 'checklist' : 'parcelas')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(parseChecklist(project.checklist))
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [showActivate, setShowActivate] = useState(false)
  const [activateError, setActivateError] = useState('')
  const [editStatus, setEditStatus] = useState(project.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(null)
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null)
  const [unpayingId, setUnpayingId] = useState<string | null>(null)
  const [payError, setPayError] = useState('')
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [credentialsLoaded, setCredentialsLoaded] = useState(false)

  // Edição do total do projeto (interligado com as parcelas)
  const [editingTotal, setEditingTotal] = useState(false)
  const [totalInput, setTotalInput] = useState(String(project.totalValue))
  const [savingTotal, setSavingTotal] = useState(false)
  const [totalError, setTotalError] = useState('')

  // Deletar projeto
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteProject = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (res.ok) {
        if (onDeleted) onDeleted(project.id)
        onClose()
      } else {
        alert('Erro ao excluir projeto')
      }
    } catch {
      alert('Erro de conexão ao excluir projeto')
    }
    setDeleting(false)
  }

  const loadCredentials = async () => {
    if (credentialsLoaded) return
    const res = await fetch(`/api/projects/${project.id}/credentials`)
    const data = await res.json()
    setCredentials(data)
    setCredentialsLoaded(true)
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab === 'credenciais') loadCredentials()
  }

  const handleStatusChange = async (newStatus: string) => {
    setEditStatus(newStatus)
    setSavingStatus(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) onUpdated({ ...project, status: newStatus })
    } catch {}
    setSavingStatus(false)
  }

  const handlePayInstallment = async (params: { paidAmount: number; paymentMethod: string }) => {
    if (!payingInstallment) return
    setPayError('')
    try {
      const res = await fetch(`/api/projects/${project.id}/installments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentId: payingInstallment.id,
          paidAmount: params.paidAmount,
          paymentMethod: params.paymentMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar pagamento')

      onInstallmentPaid(project.id, payingInstallment.id)
      setPayingInstallment(null)
    } catch (err: any) {
      setPayError(err.message)
    }
  }

  const handleEditInstallment = async (params: { amount: number; dueDate: string }) => {
    if (!editingInstallment) return
    setPayError('')
    try {
      const res = await fetch(`/api/projects/${project.id}/installments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId: editingInstallment.id, action: 'edit', ...params }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao editar parcela')
      onUpdated({
        ...project,
        totalValue: data.projectTotalValue ?? project.totalValue,
        installments: project.installments.map((i) =>
          i.id === editingInstallment.id ? { ...i, amount: params.amount, dueDate: params.dueDate } : i
        ),
      })
      setEditingInstallment(null)
    } catch (err: any) {
      setPayError(err.message)
    }
  }

  const handleSaveTotal = async () => {
    const val = parseFloat(totalInput.replace(',', '.'))
    if (!Number.isFinite(val) || val < 0) {
      setTotalError('Informe um valor válido.')
      return
    }
    setSavingTotal(true)
    setTotalError('')
    try {
      const res = await fetch(`/api/projects/${project.id}/installments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_total', totalValue: val }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar o total')
      const byId = new Map<string, any>((data.installments ?? []).map((i: any) => [i.id, i]))
      onUpdated({
        ...project,
        totalValue: data.totalValue ?? val,
        installments: project.installments.map((i) => {
          const u = byId.get(i.id)
          return u ? { ...i, amount: u.amount } : i
        }),
      })
      setEditingTotal(false)
    } catch (err: any) {
      setTotalError(err.message)
    } finally {
      setSavingTotal(false)
    }
  }

  const handleUnpay = async (installmentId: string) => {
    setUnpayingId(installmentId)
    setPayError('')
    try {
      const res = await fetch(`/api/projects/${project.id}/installments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId, action: 'unpay' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao desfazer pagamento')
      onUpdated({
        ...project,
        status: data.projectReverted ? 'IN_PROGRESS' : project.status,
        installments: project.installments.map((i) =>
          i.id === installmentId ? { ...i, paid: false, paidAt: null, paidAmount: null, paymentMethod: null } : i
        ),
      })
    } catch (err: any) {
      setPayError(err.message)
    } finally {
      setUnpayingId(null)
    }
  }

  const toggleChecklist = async (index: number) => {
    const next = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toISOString() : null } : item
    )
    setChecklist(next)
    setSavingChecklist(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: next }),
      })
      if (res.ok) onUpdated({ ...project, checklist: JSON.stringify(next) })
    } catch {
      // reverte em caso de erro
      setChecklist(checklist)
    } finally {
      setSavingChecklist(false)
    }
  }

  const handleActivate = async ({ startDate, installmentCount }: { startDate: string; installmentCount: number }) => {
    setActivateError('')
    try {
      const res = await fetch(`/api/projects/${project.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, installmentCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar projeto')
      onUpdated(data)
      setShowActivate(false)
      setEditStatus('IN_PROGRESS')
    } catch (err: any) {
      setActivateError(err.message)
    }
  }

  const now = new Date()
  const checklistDone = checklist.filter((c) => c.done).length
  const meta = PROJECT_STATUS_META[editStatus]
  const paidInstallments = project.installments.filter((i) => i.paid)
  const totalPaid = paidInstallments.reduce((s, i) => s + (i.paidAmount ?? i.amount), 0)
  const totalPending = project.totalValue - totalPaid

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">{project.name}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${meta?.bg ?? ''} ${meta?.text ?? ''}`}>
                  {meta?.label ?? editStatus}
                </span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {project.client.name}
                {project.client.companyName ? ` — ${project.client.companyName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 transition-colors flex items-center gap-1"
                title="Excluir Projeto"
              >
                <span>🗑️</span> Excluir
              </button>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xl leading-none p-1"
              >
                ×
              </button>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-700 px-6 py-4 flex-shrink-0">
            <div className="pr-4">
              <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">Total do Projeto</div>
              {editingTotal ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={totalInput}
                    onChange={(e) => setTotalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTotal()
                      if (e.key === 'Escape') { setEditingTotal(false); setTotalError('') }
                    }}
                    className="w-24 border border-neutral-300 dark:border-neutral-600 rounded px-1.5 py-0.5 text-sm font-bold bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                  <button onClick={handleSaveTotal} disabled={savingTotal} className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50" title="Salvar">✓</button>
                  <button onClick={() => { setEditingTotal(false); setTotalError(''); setTotalInput(String(project.totalValue)) }} className="text-sm text-neutral-400 hover:text-neutral-600" title="Cancelar">×</button>
                </div>
              ) : (
                <button
                  onClick={() => { setTotalInput(String(project.totalValue)); setTotalError(''); setEditingTotal(true) }}
                  className="group flex items-center gap-1 text-base font-bold text-neutral-900 dark:text-neutral-100 hover:opacity-80 transition-opacity"
                  title="Clique para editar — redistribui as parcelas em aberto"
                >
                  {formatCurrency(project.totalValue)}
                  <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">✏️</span>
                </button>
              )}
              {totalError && <div className="text-[11px] text-red-500 mt-1">{totalError}</div>}
            </div>
            <div className="px-4">
              <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">Recebido</div>
              <div className="text-base font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</div>
            </div>
            <div className="pl-4">
              <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">A Receber</div>
              <div className={`text-base font-bold ${totalPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
                {formatCurrency(totalPending)}
              </div>
            </div>
          </div>

          {/* Mudar Status / Iniciar proposta */}
          <div className="px-6 pb-3 flex-shrink-0 flex items-center justify-between gap-2 flex-wrap">
            {isProposal ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">Proposta em negociação</span>
              </div>
            ) : (
              <div>
                <label className="text-xs text-neutral-400 dark:text-neutral-500 mr-2">Status:</label>
                <select
                  value={editStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={savingStatus}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{PROJECT_STATUS_META[s]?.label ?? s}</option>
                  ))}
                </select>
              </div>
            )}
            {isProposal && (
              <button
                onClick={() => setShowActivate(true)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ▶ Iniciar projeto
              </button>
            )}
          </div>
          {activateError && (
            <div className="px-6 pb-2 flex-shrink-0">
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 text-sm">{activateError}</div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-6 flex-shrink-0 overflow-x-auto">
            {(['checklist', 'parcelas', 'credenciais', 'detalhes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {tab === 'parcelas'
                  ? `Parcelas (${project.installments.length})`
                  : tab === 'checklist'
                  ? `Checklist${checklist.length ? ` (${checklistDone}/${checklist.length})` : ''}`
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Conteúdo das tabs */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* TAB: Checklist */}
            {activeTab === 'checklist' && (
              <div className="space-y-2">
                {checklist.length === 0 ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">
                    Nenhuma etapa configurada. Use "⚙️ Etapas" na tela de projetos para configurar.
                  </p>
                ) : (
                  checklist.map((item, i) => (
                    <label
                      key={item.stageId || i}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        item.done
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                          : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={savingChecklist}
                        onChange={() => toggleChecklist(i)}
                        className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 accent-green-600"
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${item.done ? 'text-green-700 dark:text-green-400 line-through' : 'text-neutral-900 dark:text-neutral-100'}`}>
                          {item.label}
                        </div>
                        {item.done && item.doneAt && (
                          <div className="text-xs text-neutral-400">Concluído em {new Date(item.doneAt).toLocaleDateString('pt-BR')}</div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}

            {/* TAB: Parcelas */}
            {activeTab === 'parcelas' && (
              <div className="space-y-2">
                {payError && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 text-sm mb-3">
                    {payError}
                  </div>
                )}
                {project.installments.length === 0 ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">Nenhuma parcela cadastrada.</p>
                ) : (
                  project.installments.map((inst) => {
                    const isOverdue = !inst.paid && new Date(inst.dueDate) < now
                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          inst.paid
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : isOverdue
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            inst.paid
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : isOverdue
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                          }`}>
                            {inst.paid ? '✓' : inst.number}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              Parcela {inst.number} — {formatCurrency(inst.paidAmount ?? inst.amount)}
                            </div>
                            <div className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-neutral-400 dark:text-neutral-500'}`}>
                              {inst.paid
                                ? `Pago em ${new Date(inst.paidAt!).toLocaleDateString('pt-BR')}`
                                : `Vence ${new Date(inst.dueDate).toLocaleDateString('pt-BR')}${isOverdue ? ' — VENCIDA' : ''}`}
                              {inst.paymentMethod && ` • ${inst.paymentMethod}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {inst.paid ? (
                            <button
                              onClick={() => handleUnpay(inst.id)}
                              disabled={unpayingId === inst.id}
                              title="Desfazer pagamento"
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-neutral-200 dark:border-neutral-700 disabled:opacity-50"
                            >
                              {unpayingId === inst.id ? '...' : '↩ Desfazer'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingInstallment(inst)}
                                title="Editar parcela"
                                className="text-xs px-2 py-1.5 rounded-lg text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-neutral-200 dark:border-neutral-700 transition-colors"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setPayingInstallment(inst)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                  isOverdue
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                Pagar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* TAB: Credenciais */}
            {activeTab === 'credenciais' && (
              <div className="space-y-3">
                {!credentialsLoaded ? (
                  <p className="text-sm text-neutral-400 text-center py-4">Carregando credenciais...</p>
                ) : credentials.length === 0 ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
                    Nenhuma credencial cadastrada para este projeto.
                  </p>
                ) : (
                  credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{cred.label}</span>
                      </div>
                      <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                        {cred.url && (
                          <div className="flex items-center">
                            <span className="w-20 text-neutral-400">URL:</span>
                            <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">
                              {cred.url}
                            </a>
                            <CopyButton value={cred.url} />
                          </div>
                        )}
                        {cred.username && (
                          <div className="flex items-center">
                            <span className="w-20 text-neutral-400">Usuário:</span>
                            <span>{cred.username}</span>
                            <CopyButton value={cred.username} />
                          </div>
                        )}
                        {cred.email && (
                          <div className="flex items-center">
                            <span className="w-20 text-neutral-400">Email:</span>
                            <span>{cred.email}</span>
                            <CopyButton value={cred.email} />
                          </div>
                        )}
                        {cred.password && (
                          <div className="flex items-center">
                            <span className="w-20 text-neutral-400">Senha:</span>
                            <span className="font-mono">
                              {showPassword[cred.id] ? cred.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => setShowPassword((p) => ({ ...p, [cred.id]: !p[cred.id] }))}
                              className="ml-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
                            >
                              {showPassword[cred.id] ? 'ocultar' : 'mostrar'}
                            </button>
                            <CopyButton value={cred.password} />
                          </div>
                        )}
                        {cred.notes && (
                          <div className="text-neutral-400 mt-1 italic">{cred.notes}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Detalhes */}
            {activeTab === 'detalhes' && (
              <div className="space-y-4 text-sm">
                {project.description && (
                  <div>
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Descrição</div>
                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{project.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-neutral-400 dark:text-neutral-500">Início</div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {formatCompetenceDate(project.startDate)}
                    </div>
                  </div>
                  {project.deadline && (
                    <div>
                      <div className="text-xs text-neutral-400 dark:text-neutral-500">Prazo</div>
                      <div className={`font-medium ${new Date(project.deadline) < now ? 'text-red-500' : 'text-neutral-900 dark:text-neutral-100'}`}>
                        {formatCompetenceDate(project.deadline)}
                      </div>
                    </div>
                  )}
                  {project.projectLink && (
                    <div className="col-span-2">
                      <div className="text-xs text-neutral-400 dark:text-neutral-500">Link do Projeto</div>
                      <a
                        href={project.projectLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        {project.projectLink}
                      </a>
                    </div>
                  )}
                  {project.assignedTo && (
                    <div>
                      <div className="text-xs text-neutral-400 dark:text-neutral-500">Responsável</div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{project.assignedTo.name}</div>
                    </div>
                  )}
                </div>

                {project.referralName && (
                  <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Indicação</div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-300">
                      {project.referralName}
                      {project.referralValue && project.referralModel && (
                        <span className="text-amber-600 dark:text-amber-400 ml-2">
                          — Comissão: {project.referralModel === 'PERCENTAGE'
                            ? `${project.referralValue}%`
                            : formatCurrency(project.referralValue)}
                          {project.referralPaid ? ' ✅ Paga' : ' ⏳ Pendente'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {payingInstallment && (
        <PayInstallmentModal
          installment={payingInstallment}
          onPay={handlePayInstallment}
          onClose={() => setPayingInstallment(null)}
        />
      )}

      {editingInstallment && (
        <EditInstallmentModal
          installment={editingInstallment}
          onSave={handleEditInstallment}
          onClose={() => setEditingInstallment(null)}
        />
      )}

      {showActivate && (
        <ActivateModal
          project={project}
          onActivate={handleActivate}
          onClose={() => setShowActivate(false)}
        />
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 text-xl">
              ⚠️
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Excluir Projeto
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              Tem certeza que deseja excluir o projeto <strong className="text-neutral-700 dark:text-neutral-300">"{project.name}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteProject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
