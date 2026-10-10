'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Mail, Search, Send, User, Paperclip, RefreshCw, Inbox as InboxIcon } from 'lucide-react'
import { toast } from 'sonner'

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)

  // Formulário de resposta / novo email
  const [replyData, setReplyData] = useState({
    to: '',
    subject: '',
    html: '',
    leadId: '',
    clientId: '',
  })

  useEffect(() => {
    fetchMessages()
  }, [search])

  async function fetchMessages() {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (search) query.set('search', search)
      const res = await fetch(`/api/inbox?${query.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        if (data.length > 0 && !selectedMessage) {
          setSelectedMessage(data[0])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenReply(msg?: any) {
    if (msg) {
      setReplyData({
        to: msg.direction === 'inbound' ? msg.fromAddress : msg.toAddresses[0] || '',
        subject: msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject || ''}`,
        html: '',
        leadId: msg.leadId || '',
        clientId: msg.clientId || '',
      })
    } else {
      setReplyData({
        to: '',
        subject: '',
        html: '',
        leadId: '',
        clientId: '',
      })
    }
    setReplyDialogOpen(true)
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replyData),
      })
      if (res.ok) {
        toast.success('E-mail enviado com sucesso!')
        setReplyDialogOpen(false)
        fetchMessages()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erro ao enviar e-mail')
      }
    } catch (err) {
      toast.error('Falha de conexão')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <InboxIcon className="w-6 h-6 text-blue-500" /> Caixa Unificada de E-mails
          </h1>
          <p className="text-xs text-slate-500">Histórico de conversas 1:1 enviadas e recebidas pelas suas contas de e-mail</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => handleOpenReply()} className="gap-2 text-xs">
            <Send className="w-4 h-4" /> Escrever E-mail
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMessages} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* Painel da Esquerda — Lista de E-mails */}
        <Card className="md:col-span-4 flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por e-mail ou assunto..."
                className="pl-8 text-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Carregando e-mails...</div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Nenhum e-mail encontrado.</div>
            ) : (
              messages.map(msg => {
                const isSelected = selectedMessage?.id === msg.id
                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-3 cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {msg.direction === 'outbound' ? `Para: ${msg.toAddresses?.[0] || 'Destinatário'}` : msg.fromAddress}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="font-medium text-slate-700 dark:text-slate-300 truncate mb-1">
                      {msg.subject || '(sem assunto)'}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px]">
                      {msg.snippet}
                    </div>
                    {msg.lead && (
                      <Badge variant="outline" className="mt-2 text-[9px] gap-1">
                        <User className="w-2.5 h-2.5" /> Lead: {msg.lead.name}
                      </Badge>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Painel da Direita — Visualização da Mensagem */}
        <Card className="md:col-span-8 flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
          {selectedMessage ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedMessage.subject || '(Sem assunto)'}</h2>
                  <p className="text-xs text-slate-500">
                    De: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedMessage.fromAddress}</span> • Para: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedMessage.toAddresses?.join(', ')}</span>
                  </p>
                </div>
                <Button size="sm" onClick={() => handleOpenReply(selectedMessage)} className="gap-2 text-xs">
                  <Send className="w-3.5 h-3.5" /> Responder
                </Button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto prose dark:prose-invert max-w-none text-sm">
                {selectedMessage.bodyHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }} />
                ) : (
                  <p className="whitespace-pre-wrap">{selectedMessage.bodyText || selectedMessage.snippet}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Mail className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
              <p className="text-sm">Selecione uma conversa para visualizar os detalhes</p>
            </div>
          )}
        </Card>
      </div>

      {/* Modal de Envio / Resposta */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Novo E-mail 1:1</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Para (E-mail do Destinatário) *</label>
              <Input
                type="email"
                required
                placeholder="cliente@empresa.com"
                value={replyData.to}
                onChange={e => setReplyData({ ...replyData, to: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Assunto *</label>
              <Input
                required
                placeholder="Assunto da mensagem"
                value={replyData.subject}
                onChange={e => setReplyData({ ...replyData, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Mensagem (HTML ou Texto) *</label>
              <Textarea
                rows={6}
                required
                placeholder="Escreva sua mensagem aqui..."
                value={replyData.html}
                onChange={e => setReplyData({ ...replyData, html: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setReplyDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={sending} className="gap-2">
                <Send className="w-3.5 h-3.5" /> {sending ? 'Enviando...' : 'Enviar E-mail'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
