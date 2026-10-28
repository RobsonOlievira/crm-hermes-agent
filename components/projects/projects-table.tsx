'use client'

import { useState, useMemo } from 'react'
import { PROJECT_STATUS_META, PROJECT_PAYMENT_METHOD_OPTIONS, MONTH_NAMES_PT } from '@/lib/crm-constants'
import { formatCurrency } from '@/lib/format'
import { ProjectForm } from './project-form'
import { ProposalForm } from './proposal-form'
import { ProjectDetail } from './project-detail'
import { ChecklistStagesModal } from './checklist-stages-modal'
import { CompetenceModal } from './competence-modal'
import {
  currentCompetence,
  competenceYearMonth,
  formatCompetenceDate,
  defaultDateForCompetence,
} from '@/lib/date-utils'

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
      <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{done}/{items.length}</span>
    </div>
  )
}

const STATUS_ORDER = ['ENTRY', 'IN_PROGRESS', 'CLOSED', 'PAID', 'CANCELLED']

function InstallmentProgress({ installments }: { installments: Installment[] }) {
  const total = installments.length
  const paid = installments.filter((i) => i.paid).length
  const now = new Date()
  const overdue = installments.filter((i) => !i.paid && new Date(i.dueDate) < now).length

  if (total === 0) return <span className="text-neutral-400 text-xs">—</span>

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${(paid / total) * 100}%` }}
        />
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${overdue > 0 ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
        {paid}/{total}{overdue > 0 ? ` ⚠️` : ''}
      </span>
    </div>
  )
}

type ProjectSortKey = 'client' | 'name' | 'value' | 'status' | 'startDate' | 'createdAt'
type ProposalSortKey = 'name' | 'client' | 'entry' | 'value'
type SortState<T extends string> = { key: T; direction: 'asc' | 'desc' }

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: ProjectSortKey
  sort: SortState<ProjectSortKey>
  onSort: (key: ProjectSortKey) => void
  align?: 'left' | 'right' | 'center'
}) {
  const active = sort.key === sortKey
  return (
    <th className={`px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 select-none transition-colors ${active ? 'text-purple-600 dark:text-purple-400' : 'hover:text-neutral-800 dark:hover:text-neutral-200'}`}
      >
        {label}
        <span className="text-[10px] opacity-70">{active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
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

  const [projectSort, setProjectSort] = useState<SortState<ProjectSortKey>>({ key: 'startDate', direction: 'asc' })
  const [proposalSort, setProposalSort] = useState<SortState<ProposalSortKey>>({ key: 'entry', direction: 'desc' })

  const [showForm, setShowForm] = useState(false)
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [showStagesModal, setShowStagesModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Alterar mês (projeto ou proposta)
  const [moving, setMoving] = useState<{ project: Project; isProposal: boolean } | null>(null)

  /** Competência de um item: propostas pela data de entrada, projetos pela data de início. */
  const itemCompetence = (p: Project) =>
    competenceYearMonth(p.status === 'PROPOSAL' ? (p.proposalDate ?? p.createdAt) : p.startDate)

  // Propostas em negociação do mês selecionado (cada mês tem as suas)
  const monthProposals = useMemo(
    () => projects.filter((p) => p.status === 'PROPOSAL' && itemCompetence(p).year === year && itemCompetence(p).month === month),
    [projects, year, month]
  )

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

  const sortedProjects = useMemo(() => {
    const dir = projectSort.direction === 'asc' ? 1 : -1
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (projectSort.key) {
        case 'client':
          cmp = a.client.name.localeCompare(b.client.name, 'pt-BR')
          break
        case 'name':
          cmp = a.name.localeCompare(b.name, 'pt-BR')
          break
        case 'value':
          cmp = a.totalValue - b.totalValue
          break
        case 'status':
          cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
          break
        case 'startDate':
          cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          break
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      if (cmp === 0) cmp = a.client.name.localeCompare(b.client.name, 'pt-BR')
      return cmp * dir
    })
    return list
  }, [filtered, projectSort])

  const sortedProposals = useMemo(() => {
    const dir = proposalSort.direction === 'asc' ? 1 : -1
    const entryDate = (p: Project) => new Date(p.proposalDate ?? p.createdAt).getTime()
    const list = [...monthProposals]
    list.sort((a, b) => {
      let cmp = 0
      switch (proposalSort.key) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'pt-BR')
          break
        case 'client':
          cmp = a.client.name.localeCompare(b.client.name, 'pt-BR')
          break
        case 'value':
          cmp = a.totalValue - b.totalValue
          break
        case 'entry':
          cmp = entryDate(a) - entryDate(b)
          break
      }
      if (cmp === 0) cmp = a.client.name.localeCompare(b.client.name, 'pt-BR')
      return cmp * dir
    })
    return list
  }, [monthProposals, proposalSort])

  // Quantidade de propostas por mês (para indicar nas abas)
  const proposalCountByMonth = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0)
    for (const p of projects) {
      if (p.status !== 'PROPOSAL') continue
      const c = competenceYearMonth(p.proposalDate ?? p.createdAt)
      if (c.year === year) counts[c.month]++
    }
    return counts
  }, [projects, year])

  const toggleProjectSort = (key: ProjectSortKey) => {
    setProjectSort((prev) => prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  }
  const toggleProposalSort = (key: ProposalSortKey) => {
    setProposalSort((prev) => prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  }

  const handleCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev])
    setShowForm(false)
  }

  const handleUpdated = (updated: Project) => {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    setSelectedProject(updated)
    // Acompanha o item quando ele muda de mês
    const c = itemCompetence(updated)
    setYear(c.year)
    setMonth(c.month)
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

  /** Move o item para outro mês preservando o dia (ajustado ao fim do mês). */
  const handleMoveCompetence = async (targetYear: number, targetMonth: number) => {
    if (!moving) return
    const { project, isProposal } = moving
    const basis = isProposal ? (project.proposalDate ?? project.createdAt) : project.startDate
    const day = new Date(basis).getUTCDate()
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
    const iso = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`

    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isProposal
          ? { proposalDate: iso }
          : { startDate: iso, shiftInstallments: true }
      ),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar o mês')

    setProjects((prev) => prev.map((p) => (p.id === data.id ? data : p)))
    setSelectedProject((prev) => (prev && prev.id === data.id ? data : prev))
    setMoving(null)
    setYear(targetYear)
    setMonth(targetMonth)
  }

  const totalValue = filtered.reduce((s, p) => s + p.totalValue, 0)
  const totalReceived = filtered.reduce(
    (s, p) => s + p.installments.filter((i) => i.paid).reduce((ss, i) => ss + (i.paidAmount ?? i.amount), 0),
    0
  )

  const createDefaultDate = defaultDateForCompetence(year, month)

  return (
    <div className="space-y-4">
      {/* Header com Ano e Novo Projeto */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 hidden sm:block">Projetos</h1>
          <div className="flex items-center bg-neutral-900 dark:bg-neutral-900 rounded-lg text-neutral-300 overflow-hidden border border-neutral-700">
            <button 
              onClick={() => setYear(y => y - 1)}
              className="px-3 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
            >
              ‹
            </button>
            <div className="px-2 py-1.5 flex items-center gap-2 font-medium text-sm border-x border-neutral-700">
              <span className="opacity-70">📅</span> {year}
            </div>
            <button 
              onClick={() => setYear(y => y + 1)}
              className="px-3 py-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStagesModal(true)}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400 px-2 py-2 transition-colors"
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

      {/* Propostas em negociação do mês */}
      {monthProposals.length > 0 && (
        <div className="bg-purple-50/60 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-100 dark:border-purple-900/30 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              <h3 className="font-semibold text-sm text-purple-800 dark:text-purple-300">
                Propostas em negociação — {MONTH_NAMES_PT[month]}/{year} ({monthProposals.length})
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-700/80 dark:text-purple-300/80">
              <span>Ordenar:</span>
              <select
                value={proposalSort.key}
                onChange={(e) => toggleProposalSort(e.target.value as ProposalSortKey)}
                className="border border-purple-200 dark:border-purple-900/50 rounded-md px-2 py-1 text-xs bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 focus:outline-none"
              >
                <option value="entry">Data de entrada</option>
                <option value="name">Nome</option>
                <option value="client">Cliente</option>
                <option value="value">Valor</option>
              </select>
              <button
                onClick={() => setProposalSort((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                className="px-2 py-1 rounded-md border border-purple-200 dark:border-purple-900/50 hover:bg-purple-100/60 dark:hover:bg-purple-900/30"
                title={proposalSort.direction === 'asc' ? 'Crescente' : 'Decrescente'}
              >
                {proposalSort.direction === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>
          <div className="divide-y divide-purple-100/70 dark:divide-purple-900/20">
            {sortedProposals.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-purple-100/40 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{p.name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {p.client.name}
                    <> · entrada {formatCompetenceDate(p.proposalDate ?? p.createdAt)}</>
                    {p.plannedDate && <> · planejado {formatCompetenceDate(p.plannedDate)}</>}
                  </div>
                </div>
                <ChecklistProgress raw={p.checklist} />
                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 sm:w-28 sm:text-right">
                  {formatCurrency(p.totalValue)}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setMoving({ project: p, isProposal: true }) }}
                  title="Alterar mês da proposta"
                  className="text-xs font-medium px-2 py-1 rounded-md border border-purple-200 dark:border-purple-900/50 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                >
                  📅 Mês
                </button>
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
      <div className="flex bg-neutral-900 dark:bg-[#1a1a1a] rounded-lg p-1 overflow-x-auto scrollbar-none border border-neutral-800">
        {MONTH_NAMES_PT.map((mName, idx) => {
          const isSelected = month === idx
          const proposalCount = proposalCountByMonth[idx]
          return (
            <button
              key={idx}
              onClick={() => setMonth(idx)}
              className={`flex-1 min-w-[80px] px-3 py-2 text-sm font-medium transition-all rounded-md ${
                isSelected 
                  ? 'bg-neutral-800 dark:bg-[#2d2d2d] text-purple-400 border-b-2 border-purple-500 rounded-b-none' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                {mName}
                {proposalCount > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-purple-500/90 text-[10px] font-bold text-white"
                    title={`${proposalCount} proposta${proposalCount > 1 ? 's' : ''} em negociação`}
                  >
                    {proposalCount}
                  </span>
                )}
              </span>
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
            className="border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
          >
            <option value="">Todos os status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS_META[s]?.label ?? s}</option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
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
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
              }`}
            >
              <div className={`text-2xl font-bold ${statusFilter === s ? meta.text : 'text-neutral-900 dark:text-neutral-100'}`}>
                {count}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{meta.label}</div>
            </button>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                <SortHeader label="Cliente" sortKey="client" sort={projectSort} onSort={toggleProjectSort} />
                <SortHeader label="Projeto" sortKey="name" sort={projectSort} onSort={toggleProjectSort} />
                <SortHeader label="Valor" sortKey="value" sort={projectSort} onSort={toggleProjectSort} align="right" />
                <th className="text-center px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Parcelas</th>
                <SortHeader label="Status" sortKey="status" sort={projectSort} onSort={toggleProjectSort} align="center" />
                <SortHeader label="Início" sortKey="startDate" sort={projectSort} onSort={toggleProjectSort} />
                <th className="text-center px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-400 dark:text-neutral-500">
                    {search || statusFilter || clientFilter
                      ? 'Nenhum projeto encontrado com os filtros aplicados.'
                      : `Nenhum projeto em ${MONTH_NAMES_PT[month]}/${year}. Clique em "+ Novo Projeto" para começar.`}
                  </td>
                </tr>
              ) : (
                sortedProjects.map((project) => {
                  const meta = PROJECT_STATUS_META[project.status]
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedProject(project)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{project.client.name}</div>
                        <div className="text-xs text-neutral-400">{project.client.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-neutral-400 truncate max-w-[200px]">{project.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
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
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                        {formatCompetenceDate(project.startDate)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setMoving({ project, isProposal: false })}
                            title="Alterar mês do projeto (move também as parcelas em aberto)"
                            className="text-xs font-medium px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                          >
                            📅 Mês
                          </button>
                          <button
                            onClick={() => setSelectedProject(project)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {sortedProjects.length > 0 && (
              <tfoot>
                <tr className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                  <td colSpan={2} className="px-4 py-3 text-sm font-medium text-neutral-500">
                    {sortedProjects.length} projeto{sortedProjects.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
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
          defaultDate={createDefaultDate}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Modal Nova Proposta */}
      {showProposalForm && (
        <ProposalForm
          clients={clients}
          defaultDate={createDefaultDate}
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

      {/* Modal Alterar Mês */}
      {moving && (
        <CompetenceModal
          title={moving.isProposal ? 'Mover proposta de mês' : 'Mover projeto de mês'}
          description={
            moving.isProposal
              ? `"${moving.project.name}" passa a aparecer na aba do mês escolhido.`
              : `"${moving.project.name}" passa a contar como projeto do mês escolhido.`
          }
          note={moving.isProposal ? undefined : 'As parcelas em aberto serão deslocadas pelo mesmo número de meses. As já pagas ficam no histórico.'}
          initialYear={itemCompetence(moving.project).year}
          initialMonth={itemCompetence(moving.project).month}
          confirmLabel="Mover"
          onSave={handleMoveCompetence}
          onClose={() => setMoving(null)}
        />
      )}

      {/* Painel Detalhe do Projeto */}
      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          members={members}
          competence={{ year, month }}
          onClose={() => setSelectedProject(null)}
          onUpdated={handleUpdated}
          onInstallmentPaid={handleInstallmentPaid}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
