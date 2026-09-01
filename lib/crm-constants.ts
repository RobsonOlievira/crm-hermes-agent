import { LeadStatus, LeadSource, ClientStatus, InteractionType } from '@prisma/client'

export const LEAD_STATUS_META: Record<string, { label: string; color: string; bg: string; text: string }> = {
  PRIMEIRO_CONTATO: { label: 'Primeiro Contato', color: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-700' },
  CONVERSA_ATIVA: { label: 'Conversa Ativa', color: '#8B5CF6', bg: 'bg-violet-100', text: 'text-violet-700' },
  FOLLOW_UP: { label: 'Follow-up', color: '#F59E0B', bg: 'bg-amber-100', text: 'text-amber-700' },
  BANCO_7_DIAS: { label: 'Banco de 7 dias', color: '#EF4444', bg: 'bg-red-100', text: 'text-red-700' },
  NOVAS_MENSAGENS: { label: 'Novas Mensagens', color: '#06B6D4', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  REUNIAO_AGENDADA: { label: 'Reunião Agendada', color: '#F59E0B', bg: 'bg-amber-100', text: 'text-amber-700' },
  PROPOSTA_ENVIADA: { label: 'Proposta Enviada', color: '#EC4899', bg: 'bg-pink-100', text: 'text-pink-700' },
  SERVICO_FECHADO: { label: 'Serviço Fechado', color: '#10B981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PAGAMENTO_CONFIRMADO: { label: 'Pagamento Confirmado', color: '#059669', bg: 'bg-green-100', text: 'text-green-700' },
  INATIVO: { label: 'Inativo', color: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-600' },
  SEM_RESPOSTA: { label: 'Sem Resposta', color: '#EF4444', bg: 'bg-red-100', text: 'text-red-700' },
}

export const LEAD_SOURCE_META: Record<string, { label: string }> = {
  WHATSAPP: { label: 'WhatsApp' },
  LANDING_PAGE: { label: 'Landing Page' },
  META_ADS: { label: 'Meta Ads' },
  GOOGLE_ADS: { label: 'Google Ads' },
  MANUAL: { label: 'Manual' },
  IMPORT: { label: 'Importação' },
  INDICACAO: { label: 'Indicação' },
  ORGANICO: { label: 'Orgânico' },
}

export const CLIENT_STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  ATIVO: { label: 'Ativo', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  INATIVO: { label: 'Inativo', bg: 'bg-gray-100', text: 'text-gray-600' },
  INADIMPLENTE: { label: 'Inadimplente', bg: 'bg-red-100', text: 'text-red-700' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-orange-100', text: 'text-orange-700' },
  PROSPECTADO: { label: 'Prospectado', bg: 'bg-blue-100', text: 'text-blue-700' },
}

export const STUDENT_STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  ATIVO: { label: 'Ativo', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  CONCLUIDO: { label: 'Concluído', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  INATIVO: { label: 'Inativo', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
}

export const INTERACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  WHATSAPP_SENT: { label: 'WhatsApp enviado', icon: 'MessageCircle', color: '#10B981' },
  WHATSAPP_RECEIVED: { label: 'WhatsApp recebido', icon: 'MessageCircle', color: '#059669' },
  EMAIL_SENT: { label: 'Email enviado', icon: 'Mail', color: '#3B82F6' },
  PHONE_CALL: { label: 'Ligação', icon: 'Phone', color: '#8B5CF6' },
  MEETING: { label: 'Reunião', icon: 'CalendarClock', color: '#F59E0B' },
  PAYMENT_RECEIVED: { label: 'Pagamento', icon: 'CreditCard', color: '#059669' },
  STATUS_CHANGE: { label: 'Mudança de status', icon: 'ArrowRightLeft', color: '#6B7280' },
  NOTE: { label: 'Nota interna', icon: 'StickyNote', color: '#EAB308' },
  CONTRACT_SENT: { label: 'Contrato enviado', icon: 'FileText', color: '#EC4899' },
  CONTRACT_SIGNED: { label: 'Contrato assinado', icon: 'FileCheck', color: '#10B981' },
  TASK_CREATED: { label: 'Tarefa criada', icon: 'CheckSquare', color: '#3B82F6' },
  SYSTEM_EVENT: { label: 'Evento do sistema', icon: 'Zap', color: '#6B7280' },
}

export const ROLE_META: Record<string, { label: string; description: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', description: 'Dono da plataforma' },
  ADMIN: { label: 'Administrador', description: 'Dono da empresa' },
  MANAGER: { label: 'Gestor', description: 'Gerente de equipe' },
  MEMBER: { label: 'Colaborador', description: 'Operador / vendedor' },
}

// Tipos de lead padrão do sistema — o tenant pode adicionar tipos customizados
export const DEFAULT_LEAD_TYPES: { key: string; label: string; color: string; icon: string; description: string }[] = [
  { key: 'aluno', label: 'Aluno', color: '#3B82F6', icon: 'GraduationCap', description: 'Interessado em cursos, mentorias ou treinamentos.' },
  { key: 'cliente', label: 'Cliente', color: '#10B981', icon: 'UserCheck', description: 'Compra ou já contratou produtos e serviços.' },
  { key: 'outra_empresa', label: 'Outra Empresa', color: '#8B5CF6', icon: 'Building2', description: 'Empresa interessada em soluções B2B.' },
  { key: 'parceiro', label: 'Parceiro', color: '#F59E0B', icon: 'Handshake', description: 'Parceria comercial, indicação ou co-marketing.' },
  { key: 'fornecedor', label: 'Fornecedor', color: '#06B6D4', icon: 'Truck', description: 'Oferece produtos ou serviços para a sua empresa.' },
  { key: 'colaborador', label: 'Colaborador', color: '#EC4899', icon: 'Users', description: 'Candidato ou membro da equipe interna.' },
  { key: 'outro', label: 'Outro', color: '#6B7280', icon: 'CircleHelp', description: 'Contato que não se encaixa nas categorias acima.' },
]

export const CATALOG_KIND_META: Record<string, { label: string; icon: string; color: string; bg: string; text: string }> = {
  PRODUTO: { label: 'Produto', icon: 'Package', color: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-700' },
  SERVICO: { label: 'Serviço', icon: 'Wrench', color: '#8B5CF6', bg: 'bg-violet-100', text: 'text-violet-700' },
}

export const MATCH_TYPE_META: Record<string, { label: string; description: string }> = {
  any: { label: 'Qualquer palavra', description: 'A regra dispara se a mensagem contiver qualquer uma das palavras-chave.' },
  all: { label: 'Todas as palavras', description: 'A regra dispara apenas se a mensagem contiver todas as palavras-chave.' },
}

// Etapas da jornada de compra (colunas do pipeline). O status é o LeadStatus correspondente.
export const JOURNEY_STAGES: { key: string; label: string; color: string; status: string; description: string }[] = [
  { key: 'stage-1', label: 'Primeiro Contato', color: '#3B82F6', status: 'PRIMEIRO_CONTATO', description: 'Todo novo lead entra aqui na primeira mensagem recebida.' },
  { key: 'stage-2', label: 'Conversa Ativa', color: '#8B5CF6', status: 'CONVERSA_ATIVA', description: 'O sistema respondeu e o lead retornou. Mantém a tag do canal de origem enquanto conversa com o Hermes Agent.' },
  { key: 'stage-3', label: 'Follow-up', color: '#F59E0B', status: 'FOLLOW_UP', description: 'Sem resposta por 2 dias. Aciona o cron-job que avalia a conversa e reativa o lead com pergunta, atualização ou oferta.' },
  { key: 'stage-4', label: 'Banco de 7 dias', color: '#EF4444', status: 'BANCO_7_DIAS', description: 'Lead esfriou. Após 7 dias dispara um follow-up mais agressivo. Se responder, volta para Conversa Ativa.' },
  { key: 'stage-5', label: 'Serviço Fechado', color: '#10B981', status: 'SERVICO_FECHADO', description: 'Compra ou serviço fechado. As compras são empilhadas para somar o total gasto pelo lead.' },
  { key: 'stage-6', label: 'Novas Mensagens', color: '#06B6D4', status: 'NOVAS_MENSAGENS', description: 'Leads que já estavam no banco e voltaram a chamar após 7+ dias. Já são clientes (ativos ou inativos).' },
]

export const TRIGGER_TYPE_META: Record<string, { label: string; description: string }> = {
  no_reply: { label: 'Sem resposta', description: 'Dispara quando o lead fica um período sem responder.' },
  reply: { label: 'Lead respondeu', description: 'Dispara quando o lead envia uma nova resposta.' },
  inbound_message: { label: 'Nova mensagem recebida', description: 'Dispara quando chega uma mensagem de um lead antigo.' },
  purchase: { label: 'Compra fechada', description: 'Dispara quando uma compra ou serviço é fechado (via webhook).' },
}

export const AUTOMATION_ACTION_META: Record<string, { label: string; icon: string }> = {
  move_stage: { label: 'Mover de etapa', icon: 'ArrowRightLeft' },
  run_cronjob: { label: 'Acionar cron-job (Hermes)', icon: 'Bot' },
  send_message: { label: 'Enviar mensagem', icon: 'MessageCircle' },
  register_purchase: { label: 'Registrar compra', icon: 'DollarSign' },
}

export const EVENT_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  MEETING: { label: 'Reunião', color: '#3B82F6', icon: 'CalendarClock' },
  CALL: { label: 'Ligação', color: '#8B5CF6', icon: 'PhoneCall' },
  FOLLOWUP: { label: 'Follow-up', color: '#F59E0B', icon: 'ArrowRightLeft' },
  TASK: { label: 'Tarefa', color: '#10B981', icon: 'CheckSquare' },
  DEADLINE: { label: 'Prazo', color: '#EF4444', icon: 'Flame' },
  OTHER: { label: 'Outro', color: '#6B7280', icon: 'CalendarDays' },
}

export const EVENT_STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  SCHEDULED: { label: 'Agendado', bg: 'bg-blue-100', text: 'text-blue-700' },
  DONE: { label: 'Concluído', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELED: { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-600' },
}

export const MODULE_CATEGORY_META: Record<string, { label: string }> = {
  core: { label: 'Essenciais' },
  sales: { label: 'Vendas' },
  marketing: { label: 'Marketing' },
  finance: { label: 'Financeiro' },
  communication: { label: 'Comunicação' },
}

export const EMAIL_CATEGORIES: Record<string, { label: string; color: string }> = {
  broadcast: { label: 'Broadcast Geral', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  novidade: { label: 'Novidade / Lançamento', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  lembrete: { label: 'Lembrete', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  reativacao: { label: 'Reativação', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  venda: { label: 'Promoção / Venda', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  nurturing: { label: 'Nutrição', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
}

export const EMAIL_CAMPAIGN_STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SCHEDULED: { label: 'Agendada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  SENDING: { label: 'Enviando', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  SENT: { label: 'Enviada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  PAUSED: { label: 'Pausada', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

export const EMAIL_RECIPIENT_STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  OPENED: { label: 'Aberto', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CLICKED: { label: 'Clicado', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  BOUNCED: { label: 'Rejeitado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  FAILED: { label: 'Falhou', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  UNSUBSCRIBED: { label: 'Descadastrado', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
}

export function leadStatusLabel(s: LeadStatus | string) {
  return LEAD_STATUS_META[s]?.label ?? String(s)
}
