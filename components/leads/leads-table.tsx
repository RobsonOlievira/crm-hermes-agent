'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LeadStatusBadge } from '@/components/status-badge'
import { Icon } from '@/components/layout/icon'
import { LEAD_STATUS_META, LEAD_SOURCE_META } from '@/lib/crm-constants'
import { formatCurrency, formatDate, initials } from '@/lib/format'
import { Search, Filter, Loader2 } from 'lucide-react'
import { useViewRole } from '@/components/providers/view-role-provider'
import { SortState, SortableHeader, toggleSort } from '@/components/ui/sortable-header'

export interface LeadRow {
  id: string
  name: string
  email: string | null
  phone: string
  companyName: string | null
  status: string
  source: string
  dealValue: number | null
  leadTypeIds: string[]
  leadTypeLabels: string[]
  leadTypeColors: string[]
  leadTypeIcons: string[]
  assignedToId: string | null
  assignedToName: string | null
  assignedToAvatar: string | null
  createdAt: string
}

const INITIAL_COUNT = 20
const LOAD_MORE = 20

type SortKey = 'name' | 'company' | 'status' | 'type' | 'source' | 'value' | 'assignedTo' | 'date'

export function LeadsTable({ leads, members, currentUserId }: { leads: LeadRow[]; members: { id: string; name: string }[]; currentUserId: string }) {
  const router = useRouter()
  const { viewRole } = useViewRole()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [leadType, setLeadType] = useState('all')
  const [assignee, setAssignee] = useState('all')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'date', direction: 'desc' })
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const leadTypeOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of leads ?? []) (l.leadTypeIds ?? []).forEach((id, idx) => { if (id && l.leadTypeLabels[idx]) map.set(id, l.leadTypeLabels[idx]) })
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [leads])

  const filtered = useMemo(() => {
    let list = leads ?? []
    if (viewRole === 'MEMBER') list = list.filter((l) => l.assignedToId === currentUserId)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((l) => l.name.toLowerCase().includes(q) || (l.email ?? '').toLowerCase().includes(q) || (l.companyName ?? '').toLowerCase().includes(q))
    }
    if (status !== 'all') list = list.filter((l) => l.status === status)
    if (source !== 'all') list = list.filter((l) => l.source === source)
    if (leadType !== 'all') list = list.filter((l) => (l.leadTypeIds ?? []).includes(leadType))
    if (assignee !== 'all') list = list.filter((l) => l.assignedToId === assignee)

    const getters: Record<SortKey, (l: LeadRow) => string | number | null | undefined> = {
      name: (l) => l.name,
      company: (l) => l.companyName,
      status: (l) => l.status,
      type: (l) => (l.leadTypeLabels ?? []).join(' '),
      source: (l) => l.source,
      value: (l) => l.dealValue,
      assignedTo: (l) => l.assignedToName,
      date: (l) => l.createdAt,
    }
    const getter = getters[sort.key]
    const dir = sort.direction
    list = [...list].sort((a, b) => {
      const av = getter(a)
      const bv = getter(b)
      const bothNull = (av == null || av === '') && (bv == null || bv === '')
      if (bothNull) return 0
      if (av == null || av === '') return 1
      if (bv == null || bv === '') return -1
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base' })
      return dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [leads, search, status, source, leadType, assignee, viewRole, currentUserId, sort])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const loadMore = useCallback(() => setVisibleCount((p) => p + LOAD_MORE), [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const obs = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore() }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadMore])

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setSource('all')
    setLeadType('all')
    setAssignee('all')
    setVisibleCount(INITIAL_COUNT)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              <span className="font-medium text-foreground">{filtered.length}</span> {filtered.length === 1 ? 'lead' : 'leads'} · Valor total{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(useMemo(() => (filtered ?? []).reduce((s, l) => s + (l.dealValue ?? 0), 0), [filtered]))}
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center flex-1 lg:max-w-4xl">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(INITIAL_COUNT) }} placeholder="Buscar por nome, email ou empresa..." className="pl-10" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={status} onValueChange={(v) => { setStatus(v); setVisibleCount(INITIAL_COUNT) }}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(LEAD_STATUS_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={(v) => { setSource(v); setVisibleCount(INITIAL_COUNT) }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas origens</SelectItem>
                  {Object.entries(LEAD_SOURCE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {leadTypeOptions.length > 0 && (
                <Select value={leadType} onValueChange={(v) => { setLeadType(v); setVisibleCount(INITIAL_COUNT) }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {leadTypeOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {viewRole !== 'MEMBER' && (
                <Select value={assignee} onValueChange={(v) => { setAssignee(v); setVisibleCount(INITIAL_COUNT) }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos responsáveis</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <SortableHeader active={sort.key === 'name'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'name')); setVisibleCount(INITIAL_COUNT) }}>Lead</SortableHeader>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <SortableHeader active={sort.key === 'date'} direction={sort.direction} className="hidden sm:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'date')); setVisibleCount(INITIAL_COUNT) }}>Data</SortableHeader>
                <SortableHeader active={sort.key === 'status'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'status')); setVisibleCount(INITIAL_COUNT) }}>Status</SortableHeader>
                <SortableHeader active={sort.key === 'type'} direction={sort.direction} className="hidden md:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'type')); setVisibleCount(INITIAL_COUNT) }}>Tipo</SortableHeader>
                <SortableHeader active={sort.key === 'source'} direction={sort.direction} className="hidden md:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'source')); setVisibleCount(INITIAL_COUNT) }}>Origem</SortableHeader>
                <SortableHeader active={sort.key === 'value'} direction={sort.direction} className="hidden lg:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'value')); setVisibleCount(INITIAL_COUNT) }}>Valor</SortableHeader>
                <SortableHeader active={sort.key === 'company'} direction={sort.direction} className="hidden lg:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'company')); setVisibleCount(INITIAL_COUNT) }}>Empresa</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => router.push(`/leads/${l.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(l.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.email ?? '—'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs font-mono">{l.phone}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatDate(l.createdAt)}</TableCell>
                  <TableCell><LeadStatusBadge status={l.status} /></TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(l.leadTypeLabels?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {l.leadTypeLabels.map((label, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: (l.leadTypeColors[idx] ?? '#6B7280') + '1a', color: l.leadTypeColors[idx] ?? '#6B7280' }}>
                            {l.leadTypeIcons[idx] && <Icon name={l.leadTypeIcons[idx]} className="h-3 w-3" />} {label}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{LEAD_SOURCE_META[l.source]?.label ?? l.source}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm font-medium">{formatCurrency(l.dealValue)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{l.companyName ?? '—'}</TableCell>
                </TableRow>
              ))}
              {hasMore && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div ref={sentinelRef} className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mais...
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Filter className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    Nenhum lead encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
