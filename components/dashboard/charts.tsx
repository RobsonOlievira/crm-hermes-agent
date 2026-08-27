'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'

const PALETTE = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#80D8C3', '#A19AD3', '#72BF78', '#FF6363']

function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}

function Loader() {
  return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Carregando gráfico...</div>
}

export function LeadsLineChart({ data }: { data: { label: string; leads: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return <Loader />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 10 }} axisLine={false} />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} axisLine={false} width={32} />
        <Tooltip wrapperStyle={{ fontSize: 11 }} contentStyle={{ borderRadius: 8 }} />
        <Line type="monotone" dataKey="leads" name="Leads" stroke="var(--brand-primary)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RevenueBarChart({ data }: { data: { label: string; receita: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return <Loader />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 10 }} axisLine={false} />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} axisLine={false} width={40} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip wrapperStyle={{ fontSize: 11 }} contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Receita']} />
        <Bar dataKey="receita" name="Receita" fill="var(--brand-secondary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SourcePieChart({ data }: { data: { name: string; value: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return <Loader />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>} />
        <Tooltip wrapperStyle={{ fontSize: 11 }} contentStyle={{ borderRadius: 8 }} />
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="55%" innerRadius={45} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
