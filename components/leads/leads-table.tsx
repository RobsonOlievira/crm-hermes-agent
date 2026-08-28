'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LeadStatusBadge } from '@/components/status-badge'
import { Icon } from '@/components/layout/icon'
import { LEAD_STATUS_META, LEAD_SOURCE_META } from '@/lib/crm-constants'
import { formatCurrency, formatDate, initials } from '@/lib/format'
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { useViewRole } from '@/components/providers/view-role-provider'

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

const PAGE_SIZE = 8

export function LeadsTable({ leads, members, currentUserId }: { leads: LeadRow[]; members: { id: string; name: string }[]; currentUserId: string }) {
  const router = useRouter()
  const { viewRole } = useViewRole()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [leadType, setLeadType] = useState('all')
  const [assignee, setAssignee] = useState('all')
  const [page, setPage] = useState(1)

  const leadTypeOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of leads ?? []) (l.leadTypeIds ?? []).forEach((id, idx) => { if (id && l.leadTypeLabels[idx]) map.set(id, l.leadTypeLabels[idx]) })
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [leads])

  const filtered = useMemo(() => {
    let list = leads ?? []
    // RBAC: MEMBER only sees own leads
    if (viewRole === 'MEMBER') list = list.filter((l) => l.assignedToId === currentUserId)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((l) => l.name.toLowerCase().includes(q) || (l.email ?? '').toLowerCase().includes(q) || (l.companyName ?? '').toLowerCase().includes(q))
    }
    if (status !== 'all') list = list.filter((l) => l.status === status)
    if (source !== 'all') list = list.filter((l) => l.source === source)
    if (leadType !== 'all') list = list.filter((l) => (l.leadTypeIds ?? []).includes(leadType))
    if (assignee !== 'all') list = list.filter((l) => l.assignedToId === assignee)
    return list
  }, [leads, search, status, source, leadType, assignee, viewRole, currentUserId])

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1) }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} placeholder="Buscar por nome, email ou empresa..." className="pl-10" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={resetPage(setStatus)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(LEAD_STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={resetPage(setSource)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                {Object.entries(LEAD_SOURCE_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leadTypeOptions.length > 0 && (
              <Select value={leadType} onValueChange={resetPage(setLeadType)}>
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
              <Select value={assignee} onValueChange={resetPage(setAssignee)}>
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
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Lead</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">Origem</TableHead>
                <TableHead className="hidden xl:table-cell">Valor</TableHead>
                <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((l) => (
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
                  <TableCell className="hidden md:table-cell text-sm">{l.companyName ?? '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm font-mono text-xs">{l.phone}</TableCell>
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
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{LEAD_SOURCE_META[l.source]?.label ?? l.source}</TableCell>
                  <TableCell className="hidden xl:table-cell text-sm font-medium">{formatCurrency(l.dealValue)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {l.assignedToAvatar && <AvatarImage src={l.assignedToAvatar} alt={l.assignedToName ?? ''} />}
                        <AvatarFallback className="text-[10px]">{initials(l.assignedToName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{l.assignedToName?.split(' ')[0] ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
                </TableRow>
              ))}
              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Filter className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    Nenhum lead encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'lead' : 'leads'} · Página {safePage} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon-sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
