'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PageHeading } from '@/components/layout/page-heading'
import { Icon } from '@/components/layout/icon'
import { FadeIn } from '@/components/ui/animate'
import { EVENT_TYPE_META, EVENT_STATUS_META } from '@/lib/crm-constants'
import { toast } from 'sonner'
import {
  Plus, ChevronLeft, ChevronRight, Loader2, CalendarDays, Clock, MapPin, Video, User as UserIcon,
  Link2, Trash2, Pencil, CheckCircle2, X, CalendarCheck,
} from 'lucide-react'

export interface CalendarEventRow {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  startsAt: string
  endsAt: string
  allDay: boolean
  location: string | null
  meetingUrl: string | null
  leadId: string | null
  leadName: string | null
  assignedToId: string | null
  assignedToName: string | null
}
export interface LeadOption { id: string; name: string }
export interface MemberOption { id: string; name: string }

type ViewMode = 'month' | 'week' | 'day' | 'list'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// ---- date helpers (local time) ----
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() + n); return x }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function startOfWeek(d: Date) { const x = startOfDay(d); return addDays(x, -x.getDay()) }
function fmtTime(d: Date) { return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function toDateInput(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
function toTimeInput(d: Date) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
function combine(dateStr: string, timeStr: string) { const [y, m, d] = dateStr.split('-').map(Number); const [hh, mm] = timeStr.split(':').map(Number); return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0) }

type EventDraft = {
  id?: string
  title: string
  description: string
  type: string
  status: string
  date: string
  startTime: string
  endTime: string
  location: string
  meetingUrl: string
  leadId: string
  assignedToId: string
}

function EventForm({
  open, onOpenChange, initial, defaultDate, leads, members, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: CalendarEventRow | null
  defaultDate?: Date | null
  leads: LeadOption[]
  members: MemberOption[]
  onSaved: () => void
}) {
  const empty = (): EventDraft => {
    const base = defaultDate ? new Date(defaultDate) : new Date()
    if (!defaultDate) base.setMinutes(0, 0, 0)
    const start = defaultDate ? new Date(new Date(defaultDate).setHours(9, 0, 0, 0)) : base
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    return { title: '', description: '', type: 'MEETING', status: 'SCHEDULED', date: toDateInput(start), startTime: toTimeInput(start), endTime: toTimeInput(end), location: '', meetingUrl: '', leadId: '', assignedToId: '' }
  }
  const fromInitial = (e: CalendarEventRow): EventDraft => {
    const s = new Date(e.startsAt); const en = new Date(e.endsAt)
    return { id: e.id, title: e.title, description: e.description ?? '', type: e.type, status: e.status, date: toDateInput(s), startTime: toTimeInput(s), endTime: toTimeInput(en), location: e.location ?? '', meetingUrl: e.meetingUrl ?? '', leadId: e.leadId ?? '', assignedToId: e.assignedToId ?? '' }
  }
  const [draft, setDraft] = useState<EventDraft>(empty())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDraft(initial ? fromInitial(initial) : empty())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultDate])

  const set = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    if (!draft.title.trim()) { toast.error('Informe um título para o evento.'); return }
    const startsAt = combine(draft.date, draft.startTime)
    let endsAt = combine(draft.date, draft.endTime)
    if (endsAt <= startsAt) endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000)
    setSaving(true)
    try {
      const payload = {
        title: draft.title.trim(), description: draft.description.trim() || null, type: draft.type, status: draft.status,
        startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), location: draft.location.trim() || null,
        meetingUrl: draft.meetingUrl.trim() || null, leadId: draft.leadId || null, assignedToId: draft.assignedToId || null,
      }
      const res = draft.id
        ? await fetch(`/api/calendar-events/${draft.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/calendar-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      toast.success(draft.id ? 'Evento atualizado.' : 'Evento criado.')
      onOpenChange(false)
      onSaved()
    } catch { toast.error('Erro ao salvar o evento.') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          <DialogDescription>Preencha os detalhes do compromisso. Você poderá sincronizar com o Google Agenda futuramente.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ev-title">Título</Label>
            <Input id="ev-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Reunião de fechamento" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={draft.type} onValueChange={(v) => set({ type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_STATUS_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-date">Data</Label>
              <Input id="ev-date" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-start">Início</Label>
              <Input id="ev-start" type="time" value={draft.startTime} onChange={(e) => set({ startTime: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-end">Fim</Label>
              <Input id="ev-end" type="time" value={draft.endTime} onChange={(e) => set({ endTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Lead vinculado</Label>
              <Select value={draft.leadId || 'none'} onValueChange={(v) => set({ leadId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Responsável</Label>
              <Select value={draft.assignedToId || 'none'} onValueChange={(v) => set({ assignedToId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Ninguém" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguém</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-loc">Local</Label>
              <Input id="ev-loc" value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="Ex.: Sala de reuniões" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-url">Link da reunião</Label>
              <Input id="ev-url" value={draft.meetingUrl} onChange={(e) => set({ meetingUrl: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-desc">Descrição</Label>
            <Textarea id="ev-desc" value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Anotações e pauta do compromisso" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{draft.id ? 'Salvar alterações' : 'Criar evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EventChip({ ev, onClick }: { ev: CalendarEventRow; onClick: () => void }) {
  const meta = EVENT_TYPE_META[ev.type] ?? EVENT_TYPE_META.OTHER
  const done = ev.status === 'DONE'
  const canceled = ev.status === 'CANCELED'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:opacity-90 ${canceled ? 'line-through opacity-50' : ''}`}
      style={{ backgroundColor: meta.color + '1a', color: meta.color }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
      {!ev.allDay && <span className="shrink-0 tabular-nums opacity-80">{fmtTime(new Date(ev.startsAt))}</span>}
      <span className="truncate">{ev.title}</span>
      {done && <CheckCircle2 className="ml-auto h-3 w-3 shrink-0" />}
    </button>
  )
}

export function CalendarBoard({ initial, leads, members, canManage }: { initial: CalendarEventRow[]; leads: LeadOption[]; members: MemberOption[]; canManage: boolean }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [view, setView] = useState<ViewMode>('month')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEventRow | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | null>(null)
  const [detail, setDetail] = useState<CalendarEventRow | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => setMounted(true), [])

  const events = initial
  const refresh = () => router.refresh()

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>()
    for (const e of events) {
      const key = toDateInput(new Date(e.startsAt))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    for (const arr of map.values()) arr.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    return map
  }, [events])

  const openNew = (d?: Date) => { setEditing(null); setDefaultDate(d ?? cursor); setFormOpen(true) }
  const openEdit = (e: CalendarEventRow) => { setDetail(null); setEditing(e); setDefaultDate(null); setFormOpen(true) }

  const setStatus = async (e: CalendarEventRow, status: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/calendar-events/${e.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error()
      toast.success(status === 'DONE' ? 'Evento concluído.' : status === 'CANCELED' ? 'Evento cancelado.' : 'Evento atualizado.')
      setDetail(null); refresh()
    } catch { toast.error('Erro ao atualizar.') } finally { setBusy(false) }
  }
  const remove = async (e: CalendarEventRow) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/calendar-events/${e.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Evento excluído.')
      setDetail(null); refresh()
    } catch { toast.error('Erro ao excluir.') } finally { setBusy(false) }
  }

  const goPrev = () => setCursor((c) => view === 'month' ? addMonths(c, -1) : view === 'week' ? addDays(c, -7) : addDays(c, -1))
  const goNext = () => setCursor((c) => view === 'month' ? addMonths(c, 1) : view === 'week' ? addDays(c, 7) : addDays(c, 1))
  const goToday = () => setCursor(new Date())

  const rangeLabel = useMemo(() => {
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`
    if (view === 'week') { const s = startOfWeek(cursor); const e = addDays(s, 6); return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}` }
    if (view === 'day') return `${WEEKDAYS[cursor.getDay()]}, ${cursor.getDate()} de ${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`
    return 'Próximos eventos'
  }, [cursor, view])

  const upcomingCount = useMemo(() => events.filter((e) => new Date(e.startsAt) >= startOfDay(new Date()) && e.status !== 'CANCELED').length, [events])

  if (!mounted) {
    return (
      <div>
        <PageHeading title="Agenda" description="Organize reuniões e follow-ups sincronizados com o pipeline." />
        <Card className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Card>
      </div>
    )
  }
  const today = new Date()

  return (
    <div>
      <PageHeading
        title="Agenda"
        description="Organize reuniões, ligações e follow-ups sincronizados com o pipeline."
        actions={canManage ? (
          <Button className="gap-2" onClick={() => openNew()}><Plus className="h-4 w-4" /> Novo evento</Button>
        ) : null}
      />

      {/* Banner de integração com o Google Agenda (preparado para o futuro) */}
      <FadeIn>
        <Card className="mb-5 flex flex-col gap-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">Sincronização com o Google Agenda</p>
              <p className="text-muted-foreground">Conecte sua conta Google para espelhar automaticamente reuniões e follow-ups nos dois sentidos. A estrutura já está pronta — basta ativar a integração.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Em breve</Badge>
            <GoogleConnectButton />
          </div>
        </Card>
      </FadeIn>

      {/* Barra de controles */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
          <div className="flex items-center rounded-lg border">
            <Button variant="ghost" size="icon-sm" onClick={goPrev} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" onClick={goNext} aria-label="Próximo"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <h2 className="font-display text-lg font-semibold capitalize">{rangeLabel}</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {([['month', 'Mês'], ['week', 'Semana'], ['day', 'Dia'], ['list', 'Lista']] as [ViewMode, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && <MonthView cursor={cursor} today={today} eventsByDay={eventsByDay} onDay={(d) => canManage && openNew(d)} onEvent={(e) => setDetail(e)} />}
      {view === 'week' && <WeekView cursor={cursor} today={today} eventsByDay={eventsByDay} onDay={(d) => canManage && openNew(d)} onEvent={(e) => setDetail(e)} />}
      {view === 'day' && <DayView cursor={cursor} eventsByDay={eventsByDay} onEvent={(e) => setDetail(e)} onNew={() => canManage && openNew(cursor)} canManage={canManage} />}
      {view === 'list' && <ListView events={events} onEvent={(e) => setDetail(e)} />}

      {/* Legenda de tipos */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Legenda:</span>
        {Object.entries(EVENT_TYPE_META).map(([k, m]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} /> {m.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{upcomingCount} evento(s) futuro(s)</span>
      </div>

      {/* Form de criação/edição */}
      <EventForm open={formOpen} onOpenChange={setFormOpen} initial={editing} defaultDate={defaultDate} leads={leads} members={members} onSaved={refresh} />

      {/* Detalhe do evento */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {detail && (() => {
            const meta = EVENT_TYPE_META[detail.type] ?? EVENT_TYPE_META.OTHER
            const st = EVENT_STATUS_META[detail.status] ?? EVENT_STATUS_META.SCHEDULED
            const s = new Date(detail.startsAt); const e = new Date(detail.endsAt)
            return (
              <>
                <DialogHeader>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color + '1a', color: meta.color }}>
                      <Icon name={meta.icon} className="h-4 w-4" />
                    </span>
                    <Badge variant="secondary" className="text-[11px]">{meta.label}</Badge>
                    <Badge className={`text-[11px] ${st.bg} ${st.text} border-0`}>{st.label}</Badge>
                  </div>
                  <DialogTitle>{detail.title}</DialogTitle>
                  {detail.description && <DialogDescription>{detail.description}</DialogDescription>}
                </DialogHeader>
                <div className="grid gap-2.5 text-sm">
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span className="capitalize">{s.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>{fmtTime(s)} – {fmtTime(e)}</span></div>
                  {detail.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{detail.location}</span></div>}
                  {detail.meetingUrl && <div className="flex items-center gap-2"><Video className="h-4 w-4 text-muted-foreground" /><a href={detail.meetingUrl} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{detail.meetingUrl}</a></div>}
                  {detail.assignedToName && <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /><span>{detail.assignedToName}</span></div>}
                  {detail.leadId && detail.leadName && <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-muted-foreground" /><Link href={`/leads/${detail.leadId}`} className="text-primary hover:underline">{detail.leadName}</Link></div>}
                </div>
                {canManage && (
                  <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                    <div className="flex items-center gap-1">
                      {detail.status !== 'DONE' && <Button variant="outline" size="sm" className="gap-1" disabled={busy} onClick={() => setStatus(detail, 'DONE')}><CheckCircle2 className="h-4 w-4" /> Concluir</Button>}
                      {detail.status !== 'CANCELED' && <Button variant="outline" size="sm" className="gap-1" disabled={busy} onClick={() => setStatus(detail, 'CANCELED')}><X className="h-4 w-4" /> Cancelar</Button>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(detail)}><Pencil className="h-4 w-4" /> Editar</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir "{detail.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(detail)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </DialogFooter>
                )}
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GoogleConnectButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Icon name="CalendarDays" className="h-4 w-4" /> Conectar Google Agenda
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarCheck className="h-5 w-5" /></div>
            <DialogTitle>Integração com o Google Agenda</DialogTitle>
            <DialogDescription>
              Esta agenda já foi construída de forma modular para receber a sincronização com o Google Agenda. Quando a integração for ativada, seus eventos serão espelhados automaticamente nos dois sentidos, com autenticação segura via conta Google.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MonthView({ cursor, today, eventsByDay, onDay, onEvent }: { cursor: Date; today: Date; eventsByDay: Map<string, CalendarEventRow[]>; onDay: (d: Date) => void; onEvent: (e: CalendarEventRow) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const weeks: Date[][] = []
  for (let w = 0; w < 6; w++) { const row: Date[] = []; for (let d = 0; d < 7; d++) row.push(addDays(gridStart, w * 7 + d)); weeks.push(row) }
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day, i) => {
          const key = toDateInput(day)
          const dayEvents = eventsByDay.get(key) ?? []
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = isSameDay(day, today)
          return (
            <div key={i} onClick={() => onDay(day)}
              className={`group min-h-[104px] cursor-pointer border-b border-r p-1.5 transition hover:bg-muted/30 ${(i + 1) % 7 === 0 ? 'border-r-0' : ''} ${inMonth ? '' : 'bg-muted/20'}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground'}`}>{day.getDate()}</span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e) => <EventChip key={e.id} ev={e} onClick={() => onEvent(e)} />)}
                {dayEvents.length > 3 && <p className="px-1 text-[10px] font-medium text-muted-foreground">+{dayEvents.length - 3} mais</p>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function WeekView({ cursor, today, eventsByDay, onDay, onEvent }: { cursor: Date; today: Date; eventsByDay: Map<string, CalendarEventRow[]>; onDay: (d: Date) => void; onEvent: (e: CalendarEventRow) => void }) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const key = toDateInput(day)
          const dayEvents = eventsByDay.get(key) ?? []
          const isToday = isSameDay(day, today)
          return (
            <div key={i} className={`min-h-[380px] border-r last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
              <button onClick={() => onDay(day)} className="flex w-full flex-col items-center gap-0.5 border-b py-2 transition hover:bg-muted/40">
                <span className="text-xs font-medium text-muted-foreground">{WEEKDAYS[day.getDay()]}</span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>{day.getDate()}</span>
              </button>
              <div className="space-y-1 p-1.5">
                {dayEvents.length === 0 && <p className="px-1 py-2 text-center text-[10px] text-muted-foreground">—</p>}
                {dayEvents.map((e) => <EventChip key={e.id} ev={e} onClick={() => onEvent(e)} />)}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function DayView({ cursor, eventsByDay, onEvent, onNew, canManage }: { cursor: Date; eventsByDay: Map<string, CalendarEventRow[]>; onEvent: (e: CalendarEventRow) => void; onNew: () => void; canManage: boolean }) {
  const key = toDateInput(cursor)
  const dayEvents = eventsByDay.get(key) ?? []
  return (
    <Card className="p-4">
      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Nenhum evento neste dia</p>
          <p className="max-w-sm text-sm text-muted-foreground">Que tal agendar uma reunião ou follow-up?</p>
          {canManage && <Button className="mt-2 gap-2" size="sm" onClick={onNew}><Plus className="h-4 w-4" /> Novo evento</Button>}
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((e) => <EventListItem key={e.id} ev={e} onClick={() => onEvent(e)} />)}
        </div>
      )}
    </Card>
  )
}

function ListView({ events, onEvent }: { events: CalendarEventRow[]; onEvent: (e: CalendarEventRow) => void }) {
  const upcoming = useMemo(() => {
    const start = startOfDay(new Date())
    return [...events].filter((e) => new Date(e.startsAt) >= start).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
  }, [events])
  const groups = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>()
    for (const e of upcoming) { const k = toDateInput(new Date(e.startsAt)); if (!map.has(k)) map.set(k, []); map.get(k)!.push(e) }
    return Array.from(map.entries())
  }, [upcoming])
  if (groups.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-16 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
        <p className="font-semibold">Nenhum evento futuro</p>
        <p className="max-w-sm text-sm text-muted-foreground">Sua agenda está livre daqui pra frente.</p>
      </Card>
    )
  }
  return (
    <div className="space-y-4">
      {groups.map(([k, evs]) => {
        const d = new Date(evs[0].startsAt)
        return (
          <div key={k}>
            <p className="mb-2 text-sm font-semibold capitalize text-muted-foreground">{d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
            <Card className="divide-y p-0">
              {evs.map((e) => <div key={e.id} className="p-3"><EventListItem ev={e} onClick={() => onEvent(e)} /></div>)}
            </Card>
          </div>
        )
      })}
    </div>
  )
}

function EventListItem({ ev, onClick }: { ev: CalendarEventRow; onClick: () => void }) {
  const meta = EVENT_TYPE_META[ev.type] ?? EVENT_TYPE_META.OTHER
  const st = EVENT_STATUS_META[ev.status] ?? EVENT_STATUS_META.SCHEDULED
  const s = new Date(ev.startsAt); const e = new Date(ev.endsAt)
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-muted/50">
      <div className="flex w-16 shrink-0 flex-col items-center rounded-lg py-1.5" style={{ backgroundColor: meta.color + '14', color: meta.color }}>
        <span className="text-sm font-bold tabular-nums">{fmtTime(s)}</span>
        <span className="text-[10px] opacity-70 tabular-nums">{fmtTime(e)}</span>
      </div>
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate font-medium ${ev.status === 'CANCELED' ? 'line-through text-muted-foreground' : ''}`}>{ev.title}</p>
          <Badge className={`shrink-0 text-[10px] ${st.bg} ${st.text} border-0`}>{st.label}</Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Icon name={meta.icon} className="h-3 w-3" /> {meta.label}</span>
          {ev.leadName && <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> {ev.leadName}</span>}
          {ev.assignedToName && <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> {ev.assignedToName}</span>}
          {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</span>}
        </div>
      </div>
    </button>
  )
}
