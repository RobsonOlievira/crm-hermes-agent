import type { McpTool } from '../tools'
import {
  listWaTemplates,
  createWaTemplate,
  listWaBroadcasts,
  createWaBroadcast,
  executeWaBroadcast,
} from '@/lib/whatsapp-broadcast'

// Ferramentas MCP de WhatsApp avançado: templates oficiais (Meta) e disparos em
// massa. tenantId vem sempre do token.
export const whatsappMcpTools: McpTool[] = [
  {
    name: 'listar_templates_wa',
    description: 'Lista os templates oficiais de WhatsApp (Meta) do tenant, com corpo, idioma, categoria e nº de variáveis.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (tenantId) => {
      const templates = await listWaTemplates(tenantId)
      return {
        total: templates.length,
        templates: templates.map((t) => ({
          id: t.id,
          nome: t.name,
          idioma: t.language,
          categoria: t.category,
          variaveis: t.variablesCount,
          corpo: t.bodyText,
          status: t.status,
        })),
      }
    },
  },
  {
    name: 'criar_template_wa',
    description:
      'Cria um template de WhatsApp (Meta). Use {{1}}, {{2}}... no corpo para variáveis. O nome é normalizado (minúsculas, sem espaços).',
    inputSchema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome do template.' },
        corpo: { type: 'string', description: 'Texto do corpo (use {{1}}, {{2}}... para variáveis).' },
        idioma: { type: 'string', description: 'Código do idioma (padrão pt_BR).' },
        categoria: { type: 'string', description: 'MARKETING, UTILITY ou AUTHENTICATION (padrão MARKETING).' },
        cabecalho: { type: 'string', description: 'Texto do cabeçalho (opcional).' },
        rodape: { type: 'string', description: 'Texto do rodapé (opcional).' },
      },
      required: ['nome', 'corpo'],
    },
    handler: async (tenantId, args) => {
      const t = await createWaTemplate(tenantId, {
        name: String(args.nome),
        bodyText: String(args.corpo),
        language: args.idioma ? String(args.idioma) : undefined,
        category: args.categoria ? String(args.categoria) : undefined,
        headerType: args.cabecalho ? 'TEXT' : undefined,
        headerText: args.cabecalho ? String(args.cabecalho) : undefined,
        footerText: args.rodape ? String(args.rodape) : undefined,
      })
      return { ok: true, templateId: t.id, nome: t.name, variaveis: t.variablesCount }
    },
  },
  {
    name: 'listar_disparos',
    description: 'Lista os disparos em massa de WhatsApp do tenant, com template, status e totais enviados/falhos.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (tenantId) => {
      const broadcasts = await listWaBroadcasts(tenantId)
      return {
        total: broadcasts.length,
        disparos: broadcasts.map((b) => ({
          id: b.id,
          titulo: b.title,
          template: b.template?.name ?? null,
          status: b.status,
          destinatarios: b.totalRecipients,
          enviados: b.totalSent,
          falhas: b.totalFailed,
          criadoEm: b.createdAt.toISOString(),
        })),
      }
    },
  },
  {
    name: 'criar_disparo',
    description:
      'Cria um disparo em massa (PENDENTE) a partir de um template, mirando leads por filtros. Não envia ainda — use executar_disparo depois. mapeamentoVariaveis liga {{1}},{{2}}... a campos (name, phone, status) ou texto fixo.',
    inputSchema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Título do disparo.' },
        templateId: { type: 'string', description: 'ID do template de WhatsApp.' },
        filtroStatus: { type: 'string', description: 'Status da jornada para filtrar leads (opcional).' },
        filtroTipoLeadId: { type: 'string', description: 'ID do tipo de lead para filtrar (opcional).' },
        periodo: { type: 'string', description: 'Período relativo (ex.: 7d, 30d) — opcional.' },
        mapeamentoVariaveis: { type: 'object', description: 'Ex.: { "1": "name", "2": "status" }.' },
      },
      required: ['titulo', 'templateId'],
    },
    handler: async (tenantId, args) => {
      const { broadcast, recipientCount } = await createWaBroadcast(tenantId, {
        title: String(args.titulo),
        templateId: String(args.templateId),
        targetFilters: {
          status: args.filtroStatus ? String(args.filtroStatus) : undefined,
          leadTypeId: args.filtroTipoLeadId ? String(args.filtroTipoLeadId) : undefined,
          period: args.periodo ? String(args.periodo) : undefined,
        },
        variableMapping: (args.mapeamentoVariaveis && typeof args.mapeamentoVariaveis === 'object')
          ? (args.mapeamentoVariaveis as Record<string, string>)
          : undefined,
      })
      return { ok: true, disparoId: broadcast.id, destinatarios: recipientCount, status: broadcast.status }
    },
  },
  {
    name: 'executar_disparo',
    description:
      'Executa um disparo em massa pendente: envia o template para todos os leads do público, via webhook do Hermes/Meta. Retorna totais enviados e falhos.',
    inputSchema: {
      type: 'object',
      properties: { disparoId: { type: 'string' } },
      required: ['disparoId'],
    },
    handler: async (tenantId, args) => {
      const r = await executeWaBroadcast(tenantId, String(args.disparoId))
      return { ok: true, disparoId: r.broadcastId, enviados: r.totalSent, falhas: r.totalFailed }
    },
  },
]
