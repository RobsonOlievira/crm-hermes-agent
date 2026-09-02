'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { STUDENT_STATUS_META } from '@/lib/crm-constants'
import { formatCurrency, initials } from '@/lib/format'
import { Search, GraduationCap, Loader2 } from 'lucide-react'

export interface StudentRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  product: string | null
  plan: string | null
  status: string
  progress: number
  amountPaid: number
  enrolledAt: string | null
  expiresAt: string | null
  lastAccessAt: string | null
  avatarUrl: string | null
}

const INITIAL_COUNT = 20
const LOAD_MORE = 20

function StudentStatusBadge({ status }: { status: string }) {
  const meta = STUDENT_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        meta?.bg,
        meta?.text,
      )}
    >
      {meta?.label ?? status}
    </span>
  )
}

function fmtDate(v: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const filtered = useMemo(() => {
    let list = students ?? []
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q) ||
          (s.product ?? '').toLowerCase().includes(q),
      )
    }
    if (status !== 'all') list = list.filter((s) => s.status === status)
    return list
  }, [students, search, status])

  const totalPaid = useMemo(() => (filtered ?? []).reduce((s, x) => s + (x.amountPaid ?? 0), 0), [filtered])

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

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(INITIAL_COUNT) }}
            placeholder="Buscar por nome, e-mail ou produto..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => { setStatus(v); setVisibleCount(INITIAL_COUNT) }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STUDENT_STATUS_META).map(([key, meta]) => (
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
              <TableHead>Aluno</TableHead>
              <TableHead>Produto / Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Progresso</TableHead>
              <TableHead className="text-right">Valor pago</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Expira</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/40">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} />}
                      <AvatarFallback className="text-[10px]">{initials(s.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    {s.product ?? '—'}
                  </div>
                  {s.plan && <div className="text-xs text-muted-foreground">{s.plan}</div>}
                </TableCell>
                <TableCell>
                  <StudentStatusBadge status={s.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-full max-w-[90px] overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(Math.max(s.progress ?? 0, 0), 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.min(Math.max(s.progress ?? 0, 0), 100)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(s.amountPaid)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {mounted ? fmtDate(s.enrolledAt) : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {mounted ? fmtDate(s.expiresAt) : '—'}
                </TableCell>
              </TableRow>
            ))}
            {hasMore && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div ref={sentinelRef} className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mais...
                  </div>
                </TableCell>
              </TableRow>
            )}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t p-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length} aluno(s) · Total recebido{' '}
          <span className="font-semibold text-foreground">{formatCurrency(totalPaid)}</span>
        </p>
      </div>
    </Card>
  )
}
