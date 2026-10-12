'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

const PAGE_SIZE = 50

type SortKey = 'name' | 'company' | 'status' | 'type' | 'source' | 'value' | 'date'

interface LeadsPage { rows: LeadRow[]; total: number; totalValue: number }

export function LeadsTable({ initial, members, leadTypeOptions }: { initial: LeadsPage; members: { id: string; name: string }[]; leadTypeOptions: { id: string; label: string }[] }) {
  const router = useRouter()
  const { viewRole } = useViewRole()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [leadType, setLeadType] = useState('all')
  const [assignee, setAssignee] = useState('all')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'date', direction: 'desc' })
  const [rows, setRows] = useState<LeadRow[]>(initial.rows)
  const [total, setTotal] = useState(initial.total)
  const [totalValue, setTotalValue] = useState(initial.totalValue)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)
  const skipFirstFetch = useRef(viewRole !== 'MEMBER')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const buildUrl = useCallback((offset: number) => {
    const sp = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE), sort: sort.key, dir: sort.direction })
    if (debouncedSearch.trim()) sp.set('search', debouncedSearch.trim())
    if (status !== 'all') sp.set('status', status)
    if (source !== 'all') sp.set('source', source)
    if (leadType !== 'all') sp.set('leadType', leadType)
    if (viewRole === 'MEMBER') sp.set('mine', '1')
    else if (assignee !== 'all') sp.set('assignee', assignee)
    return `/api/leads?${sp.toString()}`
  }, [debouncedSearch, status, source, leadType, assignee, viewRole, sort])

  // Busca uma página no servidor; offset 0 substitui a lista, os demais acrescentam.
  const fetchPage = useCallback(async (offset: number) => {
    const id = ++requestId.current
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch(buildUrl(offset))
      if (!res.ok) throw new Error('Falha ao carregar leads')
      const data: LeadsPage = await res.json()
      if (id !== requestId.current) return
      setRows((prev) => {
        if (offset === 0) return data.rows
        const seen = new Set(prev.map((l) => l.id))
        return [...prev, ...data.rows.filter((l) => !seen.has(l.id))]
      })
      setTotal(data.total)
      setTotalValue(data.totalValue)
    } catch {
      if (id === requestId.current) setLoadError(true)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [buildUrl])

  // Filtros, busca ou ordenação mudaram: recomeça da primeira página.
  useEffect(() => {
    if (skipFirstFetch.current) { skipFirstFetch.current = false; return }
    fetchPage(0)
  }, [fetchPage])

  const hasMore = rows.length < total

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loading || loadError) return
    const obs = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) fetchPage(rows.length) }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, loadError, rows.length, fetchPage])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              <span className="font-medium text-foreground">{total}</span> {total === 1 ? 'lead' : 'leads'} · Valor total{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(totalValue)}
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center flex-1 lg:max-w-4xl">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, email ou empresa..." className="pl-10" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={status} onValueChange={(v) => { setStatus(v) }}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(LEAD_STATUS_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={(v) => { setSource(v) }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas origens</SelectItem>
                  {Object.entries(LEAD_SOURCE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {leadTypeOptions.length > 0 && (
                <Select value={leadType} onValueChange={(v) => { setLeadType(v) }}>
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
                <Select value={assignee} onValueChange={(v) => { setAssignee(v) }}>
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
                <SortableHeader active={sort.key === 'name'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'name')) }}>Lead</SortableHeader>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <SortableHeader active={sort.key === 'date'} direction={sort.direction} className="hidden sm:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'date')) }}>Data</SortableHeader>
                <SortableHeader active={sort.key === 'status'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'status')) }}>Status</SortableHeader>
                <SortableHeader active={sort.key === 'type'} direction={sort.direction} className="hidden md:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'type')) }}>Tipo</SortableHeader>
                <SortableHeader active={sort.key === 'source'} direction={sort.direction} className="hidden md:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'source')) }}>Origem</SortableHeader>
                <SortableHeader active={sort.key === 'value'} direction={sort.direction} className="hidden lg:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'value')) }}>Valor</SortableHeader>
                <SortableHeader active={sort.key === 'company'} direction={sort.direction} className="hidden lg:table-cell" onClick={() => { setSort((s) => toggleSort(s, 'company')) }}>Empresa</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
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
                      {loadError ? (
                        <button type="button" className="underline" onClick={() => fetchPage(rows.length)}>Não foi possível carregar. Tentar novamente</button>
                      ) : (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mais...</>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {rows.length === 0 && !loading && (
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
