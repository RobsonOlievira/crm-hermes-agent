'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { PageHeading } from '@/components/layout/page-heading'
import { useViewRole } from '@/components/providers/view-role-provider'
import { toast } from 'sonner'
import {
  ShieldAlert, Mail, KeyRound, Eye, EyeOff, Check, Loader2, Power, Trash2, Send, ExternalLink,
} from 'lucide-react'

interface Props {
  initialEnabled: boolean
  initialKeySet: boolean
  initialKeyMasked: string
  initialFrom: string | null
  initialReplyTo: string | null
  setAt: string | null
}

export function EmailSettings({ initialEnabled, initialKeySet, initialKeyMasked, initialFrom, initialReplyTo, setAt }: Props) {
  const { can } = useViewRole()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [keySet, setKeySet] = useState(initialKeySet)
  const [keyMasked, setKeyMasked] = useState(initialKeyMasked)
  const [from, setFrom] = useState(initialFrom || '')
  const [replyTo, setReplyTo] = useState(initialReplyTo || '')
  const [apiKey, setApiKey] = useState('')
  const [reveal, setReveal] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!can('settings:modules')) {
    return (
      <div>
        <PageHeading title="Configuração de Email" description="Configure o envio transacional e em massa de email do seu CRM." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="max-w-sm text-sm text-muted-foreground">Apenas administradores podem gerenciar a configuração de email. Altere o perfil de visualização para Administrador no menu superior.</p>
        </Card>
      </div>
    )
  }

  const maskLive = (k: string) => (k.length <= 10 ? '•'.repeat(k.length) : `${k.slice(0, 6)}${'•'.repeat(20)}${k.slice(-4)}`)

  const save = async () => {
    if (!from.trim()) { toast.error('Informe o remetente (ex: Nome <contato@dominio.com>).'); return }
    setSaving(true)
    try {
      const body: any = { from: from.trim(), replyTo: replyTo.trim() || null }
      if (apiKey.trim()) body.apiKey = apiKey.trim()
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.')
      setApiKey('')
      setKeySet(true)
      setKeyMasked(data.keyMasked || maskLive(body.apiKey || ''))
      setEnabled(data.enabled)
      toast.success('Configuração de email salva.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (value: boolean) => {
    setEnabled(value)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: value }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar.')
      toast.success(value ? 'Envio de email ativado.' : 'Envio de email pausado.')
    } catch (e: any) {
      setEnabled(!value)
      toast.error(e.message)
    }
  }

  const revoke = async () => {
    if (!confirm('Remover a chave da API vai desativar o envio de email. Continuar?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/email', { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao revogar.')
      setKeySet(false)
      setKeyMasked('')
      setEnabled(false)
      setApiKey('')
      toast.success('Chave removida.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const testSend = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/email/test', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha no teste.')
      toast.success(`Email de teste enviado para ${data.to}.`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeading
        title="Configuração de Email"
        description="Configure o provedor de envio (Resend) usado nas campanhas de Email Marketing. A chave é salva por empresa (tenant) e nunca é exibida por completo."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Chave da API (Resend)</h3>
              <Badge variant="secondary" className="ml-auto">{keySet ? 'Configurada' : 'Não configurada'}</Badge>
            </div>

            {keySet ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 font-mono text-sm">
                  <span className="flex-1 break-all">{reveal ? '••••••••••••••••••••••••••••' : keyMasked}</span>
                  <span className="text-xs text-muted-foreground">Chave armazenada • {setAt ? `atualizada em ${new Date(setAt).toLocaleDateString('pt-BR')}` : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setReveal(!reveal)}>
                    {reveal ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {reveal ? 'Ocultar' : 'Revelar mascarada'}
                  </Button>
                  <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={revoke} disabled={saving}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remover chave
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">A chave fica guardada com segurança no seu banco de dados e só é usada no momento do envio.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma chave configurada ainda. Preencha abaixo para ativar o envio de email.</p>
            )}

            <div className="mt-5 space-y-3 border-t pt-5 dark:border-gray-700">
              <div>
                <label className="text-sm font-medium mb-1 block">Nova chave da API (preencha para trocar)</label>
                <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="re_••••••••••••" autoComplete="off" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Remetente (from) *</label>
                <Input value={from} onChange={e => setFrom(e.target.value)} placeholder="Ex: NexusCRM <contato@seudominio.com>" />
                <p className="text-xs text-muted-foreground mt-1">Domínio verificado no Resend. O formato deve ser <span className="font-mono">Nome &lt;email@dominio.com&gt;</span>.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Responder para (reply-to)</label>
                <Input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="contato@seudominio.com" />
              </div>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Salvar configuração
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Testar envio</h3>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">Envie um email de teste para você mesmo para confirmar que a configuração está funcionando.</p>
            <Button variant="outline" onClick={testSend} disabled={saving || !keySet}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar email de teste
            </Button>
          </Card>

          <Card className="p-6">
            <div className="mb-2 flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Criar chave no Resend</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Acesse o <a className="text-primary underline" href="https://resend.com/api-keys" target="_blank" rel="noreferrer">painel do Resend</a>,
              adicione e verifique um domínio e crie uma API Key. Depois cole-a no campo acima.
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Power className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Status do envio</h3>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{enabled ? 'Ativado' : 'Pausado'}</p>
                <p className="text-xs text-muted-foreground">{enabled ? 'Campanhas podem ser disparadas.' : 'Disparo bloqueado.'}</p>
              </div>
              <Switch checked={enabled} onCheckedChange={toggleEnabled} disabled={!keySet} />
            </div>
            {!keySet && <p className="mt-2 text-xs text-muted-foreground">Configure a chave para ativar o envio.</p>}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Cada empresa (tenant) configura a própria chave e remetente, mantendo domínios e cotas separados.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
