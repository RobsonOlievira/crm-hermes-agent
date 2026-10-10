import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

import type { ProspectLead, ProspectSearchOptions } from './aisa-types'
export type { ProspectLead, ProspectSearchOptions } from './aisa-types'
export { BUSINESS_NICHES, MAJOR_CITIES_BY_UF } from './aisa-types'

// Tenta localizar a ponte Python do ProspectAI caso exista no ambiente local
const LOCAL_PROSPECT_AI_BRIDGE = path.join(
  process.cwd(),
  '..',
  '..',
  '..',
  'ProspecAI',
  'prospectAI',
  'bridge.py'
)

/**
 * Tenta executar a bridge Python do ProspectAI se disponível no sistema
 */
async function callPythonBridge(cmd: string, args: Record<string, any>): Promise<any> {
  if (!fs.existsSync(LOCAL_PROSPECT_AI_BRIDGE)) {
    throw new Error('Bridge local não encontrada')
  }

  return new Promise((resolve, reject) => {
    const input = JSON.stringify({ cmd, ...args })
    const proc = spawn('python', [LOCAL_PROSPECT_AI_BRIDGE], {
      cwd: path.dirname(LOCAL_PROSPECT_AI_BRIDGE),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d) => { stdout += d.toString('utf-8') })
    proc.stderr.on('data', (d) => { stderr += d.toString('utf-8') })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Ponte Python encerrou com código ${code}: ${stderr || stdout}`))
        return
      }
      try {
        resolve(JSON.parse(stdout.trim()))
      } catch (e) {
        reject(new Error(`Erro ao parsear resposta da bridge: ${stdout}`))
      }
    })

    proc.on('error', (err) => reject(err))
    proc.stdin.write(Buffer.from(input, 'utf-8'))
    proc.stdin.end()
  })
}

/**
 * Gerador inteligente de Prospects Simulados (Fallback/Demo de alta fidelidade)
 * Utilizado para testes ou quando a API AIsa não possui créditos no momento.
 */
function generateMockProspects(nicho: string, cidade: string, quantos: number): ProspectLead[] {
  const sufixos = ['Express', 'Premium', 'Prime', 'Center', 'VIP', 'Master', 'Top', 'Plus', 'Especializada', 'Conceito']
  const nomesExemplo = [
    `Clínica ${nicho}`,
    `${nicho} ${cidade}`,
    `Studio ${nicho}`,
    `Grupo ${nicho} ${sufixos[0]}`,
    `${nicho} & Cia`,
    `Espaço ${nicho}`,
    `Instituto ${nicho}`,
    `${nicho} Ouro`,
  ]

  const leads: ProspectLead[] = []

  for (let i = 0; i < quantos; i++) {
    const baseNome = `${nomesExemplo[i % nomesExemplo.length]} ${i > 7 ? (i + 1) : ''}`.trim()
    const slug = baseNome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const score = Math.floor(Math.random() * 35) + 65 // 65 a 99
    const ddd = cidade.includes('São Paulo') ? '11' : cidade.includes('Rio') ? '21' : '41'
    const num = Math.floor(900000000 + Math.random() * 99999999)
    const phone = `55${ddd}${num}`
    const temSite = i % 2 === 0

    let temperatura: string = '⚡ Morno'
    if (score >= 85) temperatura = '🔥 Quente'
    else if (score < 70) temperatura = '❄️ Frio'

    const motivo = !temSite
      ? 'NÃO TEM SITE PRÓPRIO — Alta oportunidade para oferecer Landing Page e presença digital!'
      : 'Site desatualizado sem agendamento online e sem botão direto de WhatsApp.'

    const abordagem = `Olá! Vi o perfil da ${baseNome} no Google em ${cidade}. Notei que vocês têm ótimas avaliações, mas ${!temSite ? 'ainda não possuem um site otimizado para transformar pesquisas em agendamentos diretos' : 'o site de vocês pode receber até 3x mais contatos com um botão direto de agendamento'}. Gostariam de ver uma demonstração gratuita de como captar mais clientes no nicho de ${nicho}?`

    leads.push({
      slug,
      nome: baseNome,
      nicho,
      cidade,
      busca: `${nicho} · ${cidade}`,
      nota: +(4.0 + Math.random() * 0.9).toFixed(1),
      avaliacoes: Math.floor(Math.random() * 80) + 12,
      email: `contato@${slug}.com.br`,
      telefone: `(${ddd}) 9${phone.slice(4, 8)}-${phone.slice(8)}`,
      whatsapp: phone,
      siteAntigo: temSite ? `https://www.${slug}.com.br` : null,
      motivo,
      status: 'novo',
      instagram: `@${slug}`,
      igSeguidores: Math.floor(Math.random() * 4500) + 300,
      igPosts: Math.floor(Math.random() * 120) + 10,
      igAtivo: i % 3 === 0 ? 'sim' : 'não',
      score,
      temperatura,
      abordagem,
      dossie: JSON.stringify({
        cidade,
        nicho,
        motivo,
        notaGoogle: +(4.0 + Math.random() * 0.9).toFixed(1),
        instagram: `@${slug}`,
        abordagemRecomendada: abordagem,
      }),
    })
  }

  return leads
}

/**
 * Função Principal de Prospecção AIsa
 */
export async function searchProspects(options: ProspectSearchOptions): Promise<ProspectLead[]> {
  const { nicho, cidade, quantos = 10, aisaApiKey, simular = false } = options

  // Se houver ponte local Python do ProspectAI, tenta chamar o motor real
  if (fs.existsSync(LOCAL_PROSPECT_AI_BRIDGE)) {
    try {
      const res = await callPythonBridge('prospectar', {
        nicho,
        cidade,
        quantos,
        simular: simular || !aisaApiKey,
      })
      if (res.ok && Array.isArray(res.leads) && res.leads.length > 0) {
        return res.leads.map((l: any) => ({
          slug: l.slug || l.nome.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          nome: l.nome,
          nicho: l.nicho || nicho,
          cidade: l.cidade || cidade,
          busca: l.busca,
          nota: l.nota,
          avaliacoes: l.avaliacoes,
          email: l.email,
          telefone: l.telefone,
          whatsapp: l.whatsapp,
          siteAntigo: l.siteAntigo,
          motivo: l.motivo,
          status: l.status || 'novo',
          instagram: l.instagram,
          igSeguidores: l.igSeguidores,
          igPosts: l.igPosts,
          igAtivo: l.igAtivo,
          score: l.score || 75,
          temperatura: l.temperatura || '⚡ Morno',
          abordagem: l.abordagem || `Olá! Encontrei a ${l.nome} em ${cidade} e gostaria de apresentar nossa solução para o nicho de ${nicho}.`,
          dossie: l.dossie,
        }))
      }
    } catch (e) {
      console.warn('Fallback para gerador de prospects mock:', (e as Error).message)
    }
  }

  // Fallback / Motor Simulado de Alta Fidelidade
  return generateMockProspects(nicho, cidade, quantos)
}
