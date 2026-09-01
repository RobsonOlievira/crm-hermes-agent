'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClientStatusBadge } from '@/components/status-badge'
import { CLIENT_STATUS_META } from '@/lib/crm-constants'
import { formatCurrency, initials } from '@/lib/format'
import { Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'

export interface ClientRow {
  id: string
  name: string
  companyName: string | null
  cnpj: string | null
  email: string | null
  status: string
  lifetimeValue: number
  segment: string | null
  assignedToName: string | null
  assignedToAvatar: string | null
}

const PAGE_SIZE = 8

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

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
    return list
  }, [clients, search, status])

  const totalLifetime = useMemo(() => (filtered ?? []).reduce((s, c) => s + (c.lifetimeValue ?? 0), 0), [filtered])

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nome, empresa ou CNPJ..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[170px]">
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor Lifetime</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pageItems ?? []).map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/clients/${c.id}`)}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
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
            {(pageItems?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} cliente(s) · Valor total{' '}
          <span className="font-semibold text-foreground">{formatCurrency(totalLifetime)}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
