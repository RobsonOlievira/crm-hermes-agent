'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { PageHeading } from '@/components/layout/page-heading'
import { useViewRole } from '@/components/providers/view-role-provider'
import { toast } from 'sonner'
import {
  ShieldAlert, Bot, KeyRound, Copy, Check, Eye, EyeOff, RefreshCw, Loader2,
  Link2, Power, Trash2, Terminal, ShieldCheck, Sparkles,
} from 'lucide-react'

interface ToolInfo { nome: string; descricao: string }

interface Props {
  endpoint: string
  initialEnabled: boolean
  initialToken: string | null
  tokenSetAt: string | null
  tools: ToolInfo[]
}

export function McpSettings({ endpoint, initialEnabled, initialToken, tokenSetAt, tools }: Props) {
  const { can } = useViewRole()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [token, setToken] = useState<string | null>(initialToken)
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  if (!can('settings:modules')) {
    return (
      <div>
        <PageHeading title="Integração IA (MCP)" description="Conecte uma inteligência externa ao seu CRM." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="max-w-sm text-sm text-muted-foreground">Apenas administradores podem gerenciar a integração de IA. Altere o perfil de visualização para Administrador no menu superior.</p>
        </Card>
      </div>
    )
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success('Copiado para a área de transferência.')
    setTimeout(() => setCopied(null), 1500)
  }

  const generate = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/mcp/token', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar token.')
      setToken(data.mcpToken)
      setEnabled(true)
      setReveal(true)
      toast.success('Token de conexão gerado. Copie e guarde em local seguro.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleEnabled = async (value: boolean) => {
    setEnabled(value)
    try {
      const res = await fetch('/api/mcp/token', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: value }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar.')
      toast.success(value ? 'Integração ativada.' : 'Integração pausada.')
    } catch (e: any) {
      setEnabled(!value)
      toast.error(e.message)
    }
  }

  const revoke = async () => {
    if (!confirm('Revogar o token vai desconectar imediatamente qualquer agente que o esteja usando. Continuar?')) return
    setBusy(true)
    try {
      const res = await fetch('/api/mcp/token', { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao revogar.')
      setToken(null)
      setEnabled(false)
      toast.success('Token revogado.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const maskedToken = token ? (reveal ? token : `${token.slice(0, 8)}${'•'.repeat(24)}`) : ''

  const configJson = token
    ? JSON.stringify(
        { mcpServers: { nexuscrm: { url: endpoint, headers: { Authorization: `Bearer ${reveal ? token : 'SEU_TOKEN_AQUI'}` } } } },
        null,
        2,
      )
    : ''

  return (
    <div>
      <PageHeading
        title="Integração IA (MCP)"
        description="Exponha o seu CRM como um servidor MCP para que uma inteligência externa — como o Hermes Agent — comande leads, funil, agenda e automações de forma autônoma."
      />

      {/* Banner Hermes */}
      <Card className="mb-6 overflow-hidden border-none bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Servidor MCP pronto para o Hermes Agent</h3>
              <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Model Context Protocol</Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              O CRM publica um conjunto de ferramentas seguras (criar e mover leads, registrar interações e compras,
              agendar eventos, consultar automações e o funil). Basta o Hermes se conectar ao endpoint abaixo usando
              o token de conexão. Todas as ações ficam automaticamente restritas à sua conta.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Token */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Token de conexão</h3>
            </div>

            {token ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 font-mono text-sm">
                  <span className="flex-1 break-all">{maskedToken}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setReveal((v) => !v)} title={reveal ? 'Ocultar' : 'Revelar'}>
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => copy(token, 'token')} title="Copiar">
                    {copied === 'token' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Guarde este token com cuidado — ele dá acesso de escrita ao seu CRM. Só é possível vê-lo por completo agora;
                  se perder, gere um novo (o anterior deixa de funcionar).
                  {tokenSetAt && <> Criado em {new Date(tokenSetAt).toLocaleDateString('pt-BR')}.</>}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={generate} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Regenerar token
                  </Button>
                  <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={revoke} disabled={busy}>
                    <Trash2 className="mr-2 h-4 w-4" /> Revogar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">Nenhum token gerado ainda. Gere um para permitir que o Hermes se conecte ao CRM.</p>
                <Button onClick={generate} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Gerar token de conexão
                </Button>
              </div>
            )}
          </Card>

          {/* Endpoint */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Endpoint do servidor MCP</h3>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 font-mono text-sm">
              <span className="flex-1 break-all">{endpoint}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => copy(endpoint, 'endpoint')} title="Copiar">
                {copied === 'endpoint' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Transporte HTTP (JSON-RPC 2.0). O agente deve enviar o token no cabeçalho <span className="font-mono">Authorization: Bearer &lt;token&gt;</span>.</p>
          </Card>

          {/* Instruções de conexão */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Como conectar o Hermes</h3>
            </div>
            <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Gere o token de conexão acima e mantenha a integração ativada.</li>
              <li>No Hermes Agent, adicione um servidor MCP apontando para o endpoint, com o token no cabeçalho de autorização.</li>
              <li>O Hermes vai descobrir as ferramentas automaticamente e passar a operar o CRM.</li>
            </ol>
            {token ? (
              <div className="relative rounded-lg border bg-muted/40 p-3">
                <pre className="overflow-x-auto text-xs leading-relaxed"><code>{configJson}</code></pre>
                <Button variant="ghost" size="icon-sm" className="absolute right-2 top-2" onClick={() => copy(configJson, 'config')} title="Copiar">
                  {copied === 'config' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Gere o token para ver o exemplo de configuração pronto para colar.</p>
            )}
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Status */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Power className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Status da integração</h3>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{enabled ? 'Ativada' : 'Pausada'}</p>
                <p className="text-xs text-muted-foreground">{enabled ? 'O agente pode se conectar.' : 'Conexões estão bloqueadas.'}</p>
              </div>
              <Switch checked={enabled} onCheckedChange={toggleEnabled} disabled={!token} />
            </div>
            {!token && <p className="mt-2 text-xs text-muted-foreground">Gere um token para ativar.</p>}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Cada ação executada pelo agente é registrada no histórico do lead e fica restrita exclusivamente aos seus dados.</span>
            </div>
          </Card>

          {/* Ferramentas */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Ferramentas expostas</h3>
              <Badge variant="secondary">{tools.length}</Badge>
            </div>
            <ul className="space-y-3">
              {tools.map((t) => (
                <li key={t.nome} className="space-y-0.5">
                  <p className="font-mono text-xs font-semibold text-primary">{t.nome}</p>
                  <p className="text-xs leading-snug text-muted-foreground">{t.descricao}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
