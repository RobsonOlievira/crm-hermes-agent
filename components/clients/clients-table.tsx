'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClientStatusBadge } from '@/components/status-badge'
import { CLIENT_STATUS_META } from '@/lib/crm-constants'
import { formatCurrency, initials } from '@/lib/format'
import { Search, Building2, Loader2 } from 'lucide-react'
import { SortState, SortableHeader, toggleSort } from '@/components/ui/sortable-header'

export interface ClientRow {
  id: string
  name: string
  companyName: string | null
  cnpj: string | null
  email: string | null
  phone?: string | null
  status: string
  lifetimeValue: number
  segment: string | null
  assignedToName: string | null
  assignedToAvatar: string | null
  leadTypeIds?: string[]
  leadTypeLabels?: string[]
  leadTypeColors?: string[]
}

export interface LeadTypeOption {
  id: string
  label: string
  color: string
}

const INITIAL_COUNT = 20
const LOAD_MORE = 20

type SortKey = 'name' | 'company' | 'status' | 'lifetimeValue' | 'assignedTo'

const SORTERS: Record<SortKey, (c: ClientRow) => string | number | null | undefined> = {
  name: (c) => c.name,
  company: (c) => c.companyName,
  status: (c) => c.status,
  lifetimeValue: (c) => c.lifetimeValue,
  assignedTo: (c) => c.assignedToName,
}

export function ClientsTable({
  clients,
  leadTypesOptions,
  members,
}: {
  clients: ClientRow[]
  leadTypesOptions?: LeadTypeOption[]
  members?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedLeadTypeId, setSelectedLeadTypeId] = useState('all')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'name', direction: 'asc' })
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let list = clients ?? []
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.companyName ?? '').toLowerCase().includes(q) ||
          (c.cnpj ?? '').toLowerCase().includes(q)
      )
    }
    if (status !== 'all') list = list.filter((c) => c.status === status)
    if (selectedLeadTypeId !== 'all') {
      list = list.filter((c) => (c.leadTypeIds ?? []).includes(selectedLeadTypeId))
    }

    const getter = SORTERS[sort.key]
    const dir = sort.direction
    return [...list].sort((a, b) => {
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
  }, [clients, search, status, selectedLeadTypeId, sort])

  const totalLifetime = useMemo(() => (filtered ?? []).reduce((s, c) => s + (c.lifetimeValue ?? 0), 0), [filtered])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + LOAD_MORE)
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadMore])

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            <span className="font-medium text-foreground">{filtered.length}</span> cliente(s) · Valor total{' '}
            <span className="font-semibold text-foreground">{formatCurrency(totalLifetime)}</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setVisibleCount(INITIAL_COUNT)
              }}
              placeholder="Buscar por nome, empresa ou CNPJ..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedLeadTypeId}
              onValueChange={(v) => {
                setSelectedLeadTypeId(v)
                setVisibleCount(INITIAL_COUNT)
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo de Lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {(leadTypesOptions ?? []).map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setVisibleCount(INITIAL_COUNT)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(CLIENT_STATUS_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader active={sort.key === 'name'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'name')); setVisibleCount(INITIAL_COUNT) }}>Nome</SortableHeader>
              <SortableHeader active={sort.key === 'company'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'company')); setVisibleCount(INITIAL_COUNT) }}>Empresa</SortableHeader>
              <TableHead>CNPJ</TableHead>
              <SortableHeader active={sort.key === 'status'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'status')); setVisibleCount(INITIAL_COUNT) }}>Status</SortableHeader>
              <SortableHeader align="right" active={sort.key === 'lifetimeValue'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'lifetimeValue')); setVisibleCount(INITIAL_COUNT) }}>Valor Lifetime</SortableHeader>
              <SortableHeader active={sort.key === 'assignedTo'} direction={sort.direction} onClick={() => { setSort((s) => toggleSort(s, 'assignedTo')); setVisibleCount(INITIAL_COUNT) }}>Responsável</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/clients/${c.id}`)}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                  {c.leadTypeLabels && c.leadTypeLabels.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.leadTypeLabels.map((lbl, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
                          style={{
                            borderColor: c.leadTypeColors?.[idx] || '#e5e7eb',
                            color: c.leadTypeColors?.[idx] || '#6b7280',
                            backgroundColor: `${c.leadTypeColors?.[idx] || '#6b7280'}15`,
                          }}
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.companyName ?? '—'}
                  </div>
                  {c.segment && <div className="text-xs text-muted-foreground">{c.segment}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.cnpj ?? '—'}</TableCell>
                <TableCell>
                  <ClientStatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(c.lifetimeValue)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {c.assignedToAvatar && <AvatarImage src={c.assignedToAvatar} alt={c.assignedToName ?? ''} />}
                      <AvatarFallback className="text-[10px]">{initials(c.assignedToName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{c.assignedToName ?? '—'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {hasMore && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div ref={sentinelRef} className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mais...
                  </div>
                </TableCell>
              </TableRow>
            )}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
