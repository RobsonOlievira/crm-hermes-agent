'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EMAIL_ACCOUNT_PROVIDERS, EMAIL_ACCOUNT_STATUS_META, IMAP_PRESETS } from '@/lib/crm-constants'
import { Mail, Server, Trash2, CheckCircle2, AlertCircle, Plus, RefreshCw, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function EmailAccountsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('gmail')

  // Form IMAP/SMTP
  const [formData, setFormData] = useState({
    emailAddress: '',
    displayName: '',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: true,
    authUser: '',
    authPass: '',
  })

  useEffect(() => {
    fetchAccounts()
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success) {
      toast.success(`Conta ${success === 'google' ? 'Google' : 'Microsoft'} conectada com sucesso!`)
      router.replace('/settings/email-accounts')
    }
    if (error) {
      toast.error(`Erro ao conectar conta: ${error}`)
      router.replace('/settings/email-accounts')
    }
  }, [])

  async function fetchAccounts() {
    setLoading(true)
    try {
      const res = await fetch('/api/email-accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handlePresetChange(presetKey: string) {
    setSelectedPreset(presetKey)
    const preset = IMAP_PRESETS[presetKey]
    if (preset) {
      setFormData(prev => ({
        ...prev,
        smtpHost: preset.smtpHost,
        smtpPort: preset.smtpPort,
        imapHost: preset.imapHost,
        imapPort: preset.imapPort,
      }))
    }
  }

  async function handleSaveImap(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast.success('Conta de email cadastrada com sucesso!')
        setFormData({
          emailAddress: '',
          displayName: '',
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpSecure: true,
          authUser: '',
          authPass: '',
        })
        fetchAccounts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erro ao cadastrar conta')
      }
    } catch (err) {
      toast.error('Erro de conexão ao salvar conta')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm('Deseja realmente desconectar esta conta de email?')) return
    try {
      const res = await fetch(`/api/email-accounts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Conta desconectada')
        fetchAccounts()
      } else {
        toast.error('Erro ao desconectar conta')
      }
    } catch (err) {
      toast.error('Erro na requisição')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Contas de Email 1:1 e Agenda</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Conecte sua caixa de email e agenda para conversar com leads e permitir que o Bot Hermes gerencie agendamentos sem choque de horários.
        </p>
      </div>

      {/* Opções de Conexão Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">Google / Gmail</CardTitle>
                <CardDescription className="text-xs">OAuth 2.0 seguro</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Conecte seu Gmail ou Google Workspace para e-mails e Google Calendar.
            </p>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs gap-2"
              onClick={() => router.push('/api/oauth/google/start')}
            >
              <Plus className="w-4 h-4" /> Conectar com Google
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">Microsoft Outlook</CardTitle>
                <CardDescription className="text-xs">Microsoft Graph API</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Conecte sua conta Outlook, Hotmail ou Microsoft 365.
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs gap-2"
              onClick={() => router.push('/api/oauth/microsoft/start')}
            >
              <Plus className="w-4 h-4" /> Conectar com Microsoft
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">Outro Provedor</CardTitle>
                <CardDescription className="text-xs">IMAP / SMTP genérico</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Zoho, Hostinger, cPanel, Titan ou servidor de e-mail próprio.
            </p>
            <Button
              variant="outline"
              className="w-full text-xs gap-2"
              onClick={() => {
                const el = document.getElementById('imap-form-section')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Configurar Manualmente
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Contas Conectadas */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Contas Registradas ({accounts.length})</CardTitle>
              <CardDescription className="text-xs">Contas ativas disponíveis para disparo de e-mails e consulta de agenda</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchAccounts} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Carregando contas...</div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Nenhuma conta de e-mail conectada ainda. Escolha um dos provedores acima.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {accounts.map(acc => {
                const providerMeta = EMAIL_ACCOUNT_PROVIDERS[acc.provider] || EMAIL_ACCOUNT_PROVIDERS.imap
                const statusMeta = EMAIL_ACCOUNT_STATUS_META[acc.status] || EMAIL_ACCOUNT_STATUS_META.active

                return (
                  <div key={acc.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                        <Mail className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{acc.displayName || acc.emailAddress}</span>
                          <Badge className={`${statusMeta.bg} ${statusMeta.text} border-0 text-[10px]`}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {acc.emailAddress} • Provedor: {providerMeta.label}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => handleDeleteAccount(acc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário IMAP/SMTP Manual */}
      <Card id="imap-form-section" className="border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Cadastrar Conta IMAP / SMTP</CardTitle>
          <CardDescription className="text-xs">Preencha as credenciais da sua caixa de e-mail (utilize uma Senha de App por segurança)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveImap} className="space-y-4">
            <div className="flex gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 self-center">Presets rápidos:</span>
              {Object.keys(IMAP_PRESETS).map(key => (
                <Button
                  key={key}
                  type="button"
                  variant={selectedPreset === key ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs capitalize"
                  onClick={() => handlePresetChange(key)}
                >
                  {key}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Endereço de E-mail *</Label>
                <Input
                  type="email"
                  required
                  placeholder="voce@dominio.com"
                  value={formData.emailAddress}
                  onChange={e => setFormData({ ...formData, emailAddress: e.target.value, authUser: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">Nome de Exibição</Label>
                <Input
                  placeholder="Ex: Carlos - Comercial"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">Host SMTP *</Label>
                <Input
                  required
                  placeholder="smtp.provedor.com"
                  value={formData.smtpHost}
                  onChange={e => setFormData({ ...formData, smtpHost: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">Porta SMTP</Label>
                <Input
                  type="number"
                  placeholder="587 ou 465"
                  value={formData.smtpPort}
                  onChange={e => setFormData({ ...formData, smtpPort: parseInt(e.target.value, 10) })}
                />
              </div>

              <div>
                <Label className="text-xs">Usuário de Autenticação *</Label>
                <Input
                  required
                  placeholder="voce@dominio.com"
                  value={formData.authUser}
                  onChange={e => setFormData({ ...formData, authUser: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1">
                  Senha de Aplicativo * <Lock className="w-3 h-3 text-amber-500" />
                </Label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.authPass}
                  onChange={e => setFormData({ ...formData, authPass: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="text-xs gap-2">
              {saving ? 'Validando e Salvando...' : 'Salvar Conta de E-mail'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
