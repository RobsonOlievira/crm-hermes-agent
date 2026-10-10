'use me'
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Users,
  Calendar,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899']

export function PaymentsDashboard() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [period])

  async function fetchDashboard() {
    try {
      setLoading(true)
      const res = await fetch(`/api/payments/dashboard?period=${period}`)
      const json = await res.json()
      if (json.kpis) setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-muted-foreground">Carregando métricas financeiras...</div>
  }

  const kpis = data.kpis
  const charts = data.charts

  return (
    <div className="space-y-6">
      {/* Controles de Período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Visão Geral de Receita</h2>
          <p className="text-sm text-muted-foreground">Acompanhe faturamento, cobranças e projeção MRR</p>
        </div>
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={period === 'today' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('today')}
          >
            Hoje
          </Button>
          <Button
            variant={period === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('week')}
          >
            7 Dias
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            Este Mês
          </Button>
          <Button
            variant={period === 'year' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('year')}
          >
            Este Ano
          </Button>
        </div>
      </div>

      {/* Cards KPI Topo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Receita no Período
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              {kpis.deltaReceita >= 0 ? `+${kpis.deltaReceita}%` : `${kpis.deltaReceita}%`} vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cobranças Confirmadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCobrancas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ticket Médio: {kpis.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR (Receita Recorrente)</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ARR Projetado: {kpis.arr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>

        <Card className={kpis.inadimplentes > 0 ? 'border-red-500/30 bg-red-500/5' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas & Alertas</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center justify-between">
              <span>{kpis.assinaturasAtivas} Ativas</span>
              {kpis.inadimplentes > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {kpis.inadimplentes} atrasadas
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de assinaturas cadastradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Evolução da Receita
            </CardTitle>
            <CardDescription>Receita confirmada ao longo do período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {charts.receitaPorPeriodo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.receitaPorPeriodo}>
                    <defs>
                      <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        'Receita',
                      ]}
                    />
                    <Area type="monotone" dataKey="valor" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#receitaGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem dados de pagamentos no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Métodos de Pagamento
            </CardTitle>
            <CardDescription>Distribuição de receita por meio de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {charts.receitaPorMetodo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.receitaPorMetodo}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="method"
                    >
                      {charts.receitaPorMetodo.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [
                        Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        'Valor',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Nenhum método registrado no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
