'use client'

import { useState, useMemo } from 'react'
import { PROJECT_STATUS_META, PROJECT_PAYMENT_METHOD_OPTIONS, MONTH_NAMES_PT } from '@/lib/crm-constants'
import { formatCurrency } from '@/lib/format'
import { ProjectForm } from './project-form'
import { ProposalForm } from './proposal-form'
import { ProjectDetail } from './project-detail'
import { ChecklistStagesModal } from './checklist-stages-modal'
import { currentCompetence, formatCompetenceDate } from '@/lib/date-utils'

type Client = { id: string; name: string; phone: string; email?: string | null }
type Member = { id: string; name: string; avatarUrl?: string | null }
type ChecklistStage = { id?: string; label: string; sortOrder: number; isActive: boolean; isSystem?: boolean }
type ChecklistItem = { stageId: string; label: string; done: boolean; doneAt: string | null }

type Installment = {
  id: string
  number: number
  amount: number
  dueDate: Date | string
  paid: boolean
  paidAt?: Date | string | null
  paidAmount?: number | null
  paymentMethod?: string | null
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
  catalogItemId?: string | null
  proposalDate?: Date | string | null
  plannedDate?: Date | string | null
  checklist?: string | null
  createdAt: Date | string
  client: Client
  assignedTo?: Member | null
  installments: Installment[]
}

interface Props {
  projects: Project[]
  clients: Client[]
  members: Member[]
  checklistStages: ChecklistStage[]
}

function parseChecklist(raw?: string | null): ChecklistItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function ChecklistProgress({ raw }: { raw?: string | null }) {
  const items = parseChecklist(raw)
  if (items.length === 0) return null
  const done = items.filter((i) => i.done).length
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{done}/{items.length}</span>
    </div>
  )
}

const STATUS_ORDER = ['ENTRY', 'IN_PROGRESS', 'CLOSED', 'PAID', 'CANCELLED']

function InstallmentProgress({ installments }: { installments: Installment[] }) {
  const total = installments.length
  const paid = installments.filter((i) => i.paid).length
  const now = new Date()
  const overdue = installments.filter((i) => !i.paid && new Date(i.dueDate) < now).length

  if (total === 0) return <span className="text-gray-400 text-xs">—</span>

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${(paid / total) * 100}%` }}
        />
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${overdue > 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
        {paid}/{total}{overdue > 0 ? ` ⚠️` : ''}
      </span>
    </div>
  )
}

export function ProjectsTable({ projects: initialProjects, clients, members, checklistStages: initialStages }: Props) {
  const [projects, setProjects] = useState(initialProjects)
  const [checklistStages, setChecklistStages] = useState<ChecklistStage[]>(initialStages)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  // Date filters (competência armazenada em UTC — usar getters UTC)
  const initialCompetence = currentCompetence()
  const [year, setYear] = useState(initialCompetence.year)
  const [month, setMonth] = useState(initialCompetence.month)

  const [showForm, setShowForm] = useState(false)
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [showStagesModal, setShowStagesModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Propostas em negociação (separadas da tabela mensal)
  const proposals = useMemo(() => projects.filter((p) => p.status === 'PROPOSAL'), [projects])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (p.status === 'PROPOSAL') return false // propostas têm seção própria

      // Filtro estrito pelo mês e ano de início do projeto (mês de competência)
      const pDate = new Date(p.startDate)
      if (pDate.getUTCFullYear() !== year || pDate.getUTCMonth() !== month) {
        return false
      }

      if (statusFilter && p.status !== statusFilter) return false
      if (clientFilter && p.client.id !== clientFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.client.name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [projects, search, statusFilter, clientFilter, year, month])

  const handleCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev])
    setShowForm(false)
  }

  const handleUpdated = (updated: Project) => {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    setSelectedProject(updated)
  }

  const handleInstallmentPaid = (projectId: string, installmentId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        const newInstallments = p.installments.map((i) =>
          i.id === installmentId ? { ...i, paid: true, paidAt: new Date().toISOString() } : i
        )
        const allPaid = newInstallments.every((i) => i.paid)
        return { ...p, installments: newInstallments, status: allPaid ? 'PAID' : p.status }
      })
    )
  }

  const handleDeleted = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    setSelectedProject(null)
  }

  const totalValue = filtered.reduce((s, p) => s + p.totalValue, 0)
  const totalReceived = filtered.reduce(
    (s, p) => s + p.installments.filter((i) => i.paid).reduce((ss, i) => ss + (i.paidAmount ?? i.amount), 0),
    0
  )

  return (
    <div className="space-y-4">
      {/* Header com Ano e Novo Projeto */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 hidden sm:block">Projetos</h1>
          <div className="flex items-center bg-gray-900 dark:bg-gray-900 rounded-lg text-gray-300 overflow-hidden border border-gray-700">
            <button 
              onClick={() => setYear(y => y - 1)}
              className="px-3 py-1.5 hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              ‹
            </button>
            <div className="px-2 py-1.5 flex items-center gap-2 font-medium text-sm border-x border-gray-700">
              <span className="opacity-70">📅</span> {year}
            </div>
            <button 
              onClick={() => setYear(y => y + 1)}
              className="px-3 py-1.5 hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStagesModal(true)}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 px-2 py-2 transition-colors"
            title="Configurar etapas do checklist"
          >
            ⚙️ Etapas
          </button>
          <button
            onClick={() => setShowProposalForm(true)}
            className="flex items-center gap-2 border border-[#8b5cf6] text-[#8b5cf6] hover:bg-[#8b5cf6]/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            + Proposta
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-sm"
          >
            + Novo Projeto
          </button>
        </div>
      </div>

      {/* Propostas em negociação */}
      {proposals.length > 0 && (
        <div className="bg-purple-50/60 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-100 dark:border-purple-900/30 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <h3 className="font-semibold text-sm text-purple-800 dark:text-purple-300">
              Propostas em negociação ({proposals.length})
            </h3>
          </div>
          <div className="divide-y divide-purple-100/70 dark:divide-purple-900/20">
            {proposals.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-purple-100/40 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {p.client.name}
                    {p.plannedDate && <> · planejado {formatCompetenceDate(p.plannedDate)}</>}
                  </div>
                </div>
                <ChecklistProgress raw={p.checklist} />
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 sm:w-28 sm:text-right">
                  {formatCurrency(p.totalValue)}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedProject(p) }}
                  className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline sm:w-20 sm:text-right"
                >
                  Abrir →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meses (Estilo Abas) */}
      <div className="flex bg-gray-900 dark:bg-[#1a1a1a] rounded-lg p-1 overflow-x-auto scrollbar-none border border-gray-800">
        {MONTH_NAMES_PT.map((mName, idx) => {
          const isSelected = month === idx
          return (
            <button
              key={idx}
              onClick={() => setMonth(idx)}
              className={`flex-1 min-w-[80px] px-3 py-2 text-sm font-medium transition-all rounded-md ${
                isSelected 
                  ? 'bg-gray-800 dark:bg-[#2d2d2d] text-purple-400 border-b-2 border-purple-500 rounded-b-none' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {mName}
            </button>
          )
        })}
      </div>

      {/* Barra de controles de filtro secundários */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-2">
        <div className="flex flex-wrap gap-2 flex-1">
          <input
            type="text"
            placeholder="Buscar projeto ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
          >
            <option value="">Todos os status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS_META[s]?.label ?? s}</option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
          >
            <option value="">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_ORDER.slice(0, 4).map((s) => {
          const count = filtered.filter((p) => p.status === s).length
          const meta = PROJECT_STATUS_META[s]
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`p-3 rounded-xl border text-left transition-all ${
                statusFilter === s
                  ? `${meta.bg} border-current`
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className={`text-2xl font-bold ${statusFilter === s ? meta.text : 'text-gray-900 dark:text-gray-100'}`}>
                {count}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{meta.label}</div>
            </button>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Projeto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Valor</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Parcelas</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Início</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    {search || statusFilter || clientFilter
                      ? 'Nenhum projeto encontrado com os filtros aplicados.'
                      : 'Nenhum projeto ainda. Clique em "+ Novo Projeto" para começar.'}
                  </td>
                </tr>
              ) : (
                filtered.map((project) => {
                  const meta = PROJECT_STATUS_META[project.status]
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedProject(project)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{project.client.name}</div>
                        <div className="text-xs text-gray-400">{project.client.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{project.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(project.totalValue)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <InstallmentProgress installments={project.installments} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta?.bg ?? ''} ${meta?.text ?? ''}`}>
                          {meta?.label ?? project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {formatCompetenceDate(project.startDate)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedProject(project)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-500">
                    {filtered.length} projeto{filtered.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(totalReceived)} recebido
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Novo Projeto */}
      {showForm && (
        <ProjectForm
          clients={clients}
          members={members}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Modal Nova Proposta */}
      {showProposalForm && (
        <ProposalForm
          clients={clients}
          onClose={() => setShowProposalForm(false)}
          onCreated={(p) => { handleCreated(p); setShowProposalForm(false) }}
        />
      )}

      {/* Modal Configurar Etapas do Checklist */}
      {showStagesModal && (
        <ChecklistStagesModal
          stages={checklistStages}
          onClose={() => setShowStagesModal(false)}
          onSaved={(stages) => { setChecklistStages(stages); setShowStagesModal(false) }}
        />
      )}

      {/* Painel Detalhe do Projeto */}
      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdated={handleUpdated}
          onInstallmentPaid={handleInstallmentPaid}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
