import { PrismaClient, Role, LeadStatus, LeadSource, ClientStatus, InteractionType, CatalogKind } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TENANT_ID = 'tenant-vortex'

const MODULES = [
  { key: 'dashboard', displayName: 'Dashboard', description: 'Painel de métricas e acompanhamento do negócio', category: 'core', isCore: true, isActive: true, sortOrder: 1 },
  { key: 'leads', displayName: 'Gestão de Leads', description: 'Captura, cadastro e qualificação de leads', category: 'sales', isCore: true, isActive: true, sortOrder: 2 },
  { key: 'kanban', displayName: 'Kanban Pipeline', description: 'Board visual de movimentação dos negócios', category: 'sales', isCore: true, isActive: true, sortOrder: 3 },
  { key: 'clients', displayName: 'Clientes', description: 'Base de clientes convertidos com CNPJ', category: 'core', isCore: true, isActive: true, sortOrder: 4 },
  { key: 'interactions', displayName: 'Interações', description: 'Timeline de tudo que aconteceu com o lead', category: 'sales', isCore: true, isActive: true, sortOrder: 5 },
  { key: 'team', displayName: 'Equipe', description: 'Usuários, papéis e permissões', category: 'core', isCore: true, isActive: true, sortOrder: 6 },
  { key: 'notifications', displayName: 'Notificações', description: 'Notificações in-app, email e push', category: 'core', isCore: true, isActive: true, sortOrder: 7 },
  { key: 'whatsapp', displayName: 'WhatsApp Bot', description: 'Chatbot integrado 24/7 via Meta API', category: 'communication', isCore: false, isActive: true, sortOrder: 8 },
  { key: 'calendar', displayName: 'Agenda / Calendário', description: 'Agendamento de reuniões e follow-ups', category: 'sales', isCore: false, isActive: true, sortOrder: 9 },
  { key: 'payments', displayName: 'Pagamentos', description: 'Stripe, Mercado Pago e Asaas — cobranças', category: 'finance', isCore: false, isActive: false, sortOrder: 10 },
  { key: 'contracts', displayName: 'Gerador de Contratos', description: 'Templates de contrato com variáveis dinâmicas', category: 'sales', isCore: false, isActive: false, sortOrder: 11 },
  { key: 'ads_tracker', displayName: 'Tráfego Pago', description: 'Meta e Google Ads, custos, CPL e ROI', category: 'marketing', isCore: false, isActive: false, sortOrder: 12 },
  { key: 'automations', displayName: 'Automações', description: 'Fluxos da jornada de compra que conversam com o Hermes Agent', category: 'sales', isCore: false, isActive: true, sortOrder: 13 },
  { key: 'catalog', displayName: 'Catálogo de Produtos', description: 'Produtos e serviços vinculados a tipos de lead e objetivos', category: 'sales', isCore: false, isActive: true, sortOrder: 14 },
  { key: 'email_marketing', displayName: 'Email Marketing', description: 'Criação e envio de campanhas de email em massa', category: 'marketing', isCore: false, isActive: true, sortOrder: 15 },
  { key: 'prospecting', displayName: 'Prospecção AI', description: 'Busca ativa de prospects B2B por nicho e cidade com inteligência AIsa', category: 'sales', isCore: false, isActive: true, sortOrder: 16 },
]

const LEAD_TYPES = [
  { key: 'aluno', label: 'Aluno', color: '#3B82F6', icon: 'GraduationCap', description: 'Interessado em cursos, mentorias ou treinamentos.' },
  { key: 'cliente', label: 'Cliente', color: '#10B981', icon: 'UserCheck', description: 'Compra ou já contratou produtos e serviços.' },
  { key: 'outra_empresa', label: 'Outra Empresa', color: '#8B5CF6', icon: 'Building2', description: 'Empresa interessada em soluções B2B.' },
  { key: 'parceiro', label: 'Parceiro', color: '#F59E0B', icon: 'Handshake', description: 'Parceria comercial, indicação ou co-marketing.' },
  { key: 'fornecedor', label: 'Fornecedor', color: '#06B6D4', icon: 'Truck', description: 'Oferece produtos ou serviços para a sua empresa.' },
  { key: 'colaborador', label: 'Colaborador', color: '#EC4899', icon: 'Users', description: 'Candidato ou membro da equipe interna.' },
  { key: 'outro', label: 'Outro', color: '#6B7280', icon: 'CircleHelp', description: 'Contato que não se encaixa nas categorias acima.' },
]

const EMAIL_TEMPLATES = [
  {
    id: 'etpl-1',
    name: 'Boas-vindas',
    subject: 'Bem-vindo(a) à {{empresa}}!',
    category: 'broadcast',
    variables: ['primeiro_nome', 'nome', 'email', 'empresa'],
    htmlBody: '<p>Olá <strong>{{primeiro_nome}}</strong>,</p><p>Seja muito bem-vindo(a) à <strong>{{empresa}}</strong>! Queremos te apoiar em cada etapa da sua jornada.</p><p>Qualquer dúvida, é só responder este email.</p><p>Um abraço,<br/>Equipe</p>',
  },
  {
    id: 'etpl-2',
    name: 'Lançamento de produto',
    subject: '🚀 Novidade: {{produto}} já está disponível!',
    category: 'novidade',
    variables: ['primeiro_nome', 'nome', 'email', 'produto', 'link'],
    htmlBody: '<p>Oi <strong>{{primeiro_nome}}</strong>!</p><p>Acabamos de lançar o <strong>{{produto}}</strong> e queremos que você conheça em primeira mão.</p><p>Confira todos os detalhes: <a href="{{link}}">{{link}}</a></p><p>Nos vemos lá!</p>',
  },
  {
    id: 'etpl-3',
    name: 'Reativação de lead',
    subject: 'Sentimos sua falta, {{primeiro_nome}}!',
    category: 'reativacao',
    variables: ['primeiro_nome', 'nome', 'email'],
    htmlBody: '<p>Olá <strong>{{primeiro_nome}}</strong>,</p><p>Faz um tempo que não falamos e sentimos sua falta. Preparamos uma condição especial para você.</p><p>Que tal retomarmos a conversa?</p>',
  },
]

const EMAIL_CAMPAIGNS = [
  {
    id: 'ecmp-1',
    name: 'Boas-vindas novos leads',
    subject: 'Bem-vindo(a) à {{empresa}}!',
    htmlBody: EMAIL_TEMPLATES[0].htmlBody,
    category: 'broadcast',
    segmentType: 'ALL',
    templateId: 'etpl-1',
    status: 'DRAFT',
    senderName: 'Equipe Vortex',
    senderEmail: 'contato@vortex.com.br',
  },
  {
    id: 'ecmp-2',
    name: 'Lançamento Curso Marketing Digital',
    subject: '🚀 Novidade: Curso de Marketing Digital já está disponível!',
    htmlBody: EMAIL_TEMPLATES[1].htmlBody
      .replace('{{produto}}', 'Curso de Marketing Digital')
      .replace('{{link}}', 'https://vortex.com.br/curso'),
    category: 'novidade',
    segmentType: 'STATUS',
    segmentValue: 'CONVERSA_ATIVA',
    templateId: 'etpl-2',
    status: 'SENT',
    senderName: 'Equipe Vortex',
    senderEmail: 'contato@vortex.com.br',
    totalRecipients: 45,
    totalSent: 43,
    totalOpened: 28,
    totalClicked: 12,
    totalBounced: 2,
    totalFailed: 0,
    sentAt: 3,
    createdAt: 8,
  },
]

const CATALOG_ITEMS = [
  { id: 'catalog-1', name: 'Curso de Marketing Digital', kind: CatalogKind.PRODUTO, price: 1997, leadTypeKey: 'aluno', extraLeadTypeKeys: ['cliente'], objective: 'Comprar o curso de Marketing Digital', description: 'Formação completa em marketing digital com certificado.', sortOrder: 1 },
  { id: 'catalog-2', name: 'Mentoria Individual', kind: CatalogKind.SERVICO, price: 2500, leadTypeKey: 'aluno', extraLeadTypeKeys: ['cliente'], objective: 'Contratar mentoria individual', description: 'Acompanhamento 1:1 por 3 meses.', sortOrder: 2 },
  { id: 'catalog-3', name: 'Gestão de Tráfego Pago', kind: CatalogKind.SERVICO, price: 3500, leadTypeKey: 'cliente', extraLeadTypeKeys: ['outra_empresa'], objective: 'Contratar gestão de tráfego pago', description: 'Gestão mensal de campanhas Meta e Google Ads.', sortOrder: 3 },
  { id: 'catalog-4', name: 'Consultoria B2B', kind: CatalogKind.SERVICO, price: 8000, leadTypeKey: 'outra_empresa', extraLeadTypeKeys: ['cliente'], objective: 'Fechar projeto de consultoria B2B', description: 'Diagnóstico e plano de crescimento para empresas.', sortOrder: 4 },
  { id: 'catalog-5', name: 'Plano Anual de Assessoria', kind: CatalogKind.PRODUTO, price: 12000, leadTypeKey: 'cliente', extraLeadTypeKeys: ['aluno'], objective: 'Assinar o plano anual de assessoria', description: 'Assessoria de marketing recorrente por 12 meses.', sortOrder: 5 },
  { id: 'catalog-6', name: 'Programa de Parcerias', kind: CatalogKind.SERVICO, price: null as number | null, leadTypeKey: 'parceiro', extraLeadTypeKeys: ['outra_empresa'], objective: 'Ingressar no programa de parcerias', description: 'Comissionamento por indicação de novos clientes.', sortOrder: 6 },
]

const CLASSIFICATION_RULES = [
  { id: 'rule-1', name: 'Interesse em curso', keywords: ['curso', 'aula', 'aprender', 'matrícula', 'turma'], matchType: 'any', source: 'WHATSAPP', leadTypeKey: 'aluno', catalogItemIds: ['catalog-1'], autoMessages: ['Olá! Percebi seu interesse no curso. Posso confirmar quais turmas estão abertas para você?', 'Oi! Vi que você chamou sobre as turmas. Quer que eu te mande os detalhes do curso?'], autoReply: 'Que ótimo! Temos turmas abrindo em breve. Posso te enviar todos os detalhes do curso?', priority: 1 },
  { id: 'rule-2', name: 'Empresa / B2B', keywords: ['empresa', 'cnpj', 'corporativo', 'equipe', 'b2b'], matchType: 'any', source: null as string | null, leadTypeKey: 'outra_empresa', catalogItemIds: ['catalog-4'], autoMessages: ['Fala! É uma empresa, certo? Quer que eu te apresente nossas soluções corporativas?'], autoReply: 'Perfeito! Trabalhamos com soluções corporativas. Vou te encaminhar para nosso time B2B.', priority: 2 },
  { id: 'rule-3', name: 'Tráfego pago', keywords: ['tráfego', 'anúncio', 'ads', 'campanha', 'gestor de tráfego'], matchType: 'any', source: null as string | null, leadTypeKey: 'cliente', catalogItemIds: ['catalog-3', 'catalog-5'], autoMessages: ['Fala! Vi que vocês estão investindo em anúncios. Quer que eu analise quais campanhas valem a pena escalar?'], autoReply: 'Ótimo! Podemos cuidar das suas campanhas. Qual seu investimento mensal atual?', priority: 3 },
  { id: 'rule-4', name: 'Proposta de parceria', keywords: ['parceria', 'parceiro', 'indicação', 'comissão'], matchType: 'any', source: null as string | null, leadTypeKey: 'parceiro', catalogItemIds: ['catalog-6'], autoMessages: [] as string[], autoReply: 'Adoramos parcerias! Vou te apresentar nosso programa de parceiros.', priority: 4 },
  { id: 'rule-5', name: 'Fornecedor', keywords: ['fornecedor', 'vender para vocês', 'orçamento para vocês'], matchType: 'all', source: null as string | null, leadTypeKey: 'fornecedor', catalogItemIds: [] as string[], autoMessages: [] as string[], autoReply: 'Obrigado pelo contato! Encaminhamos sua proposta para o setor de compras.', priority: 5 },
]

const SOCIAL_HANDLES = ['@joaosilva', 'instagram.com/mariasantos', '@pedro.oliveira', 'linkedin.com/in/juliana', '@lucas.ferreira', null, 'instagram.com/camila', null]

const STAGES = [
  { id: 'stage-1', name: 'Primeiro Contato', color: '#3B82F6', position: 0, status: 'PRIMEIRO_CONTATO' },
  { id: 'stage-2', name: 'Conversa Ativa', color: '#10B981', position: 1, status: 'CONVERSA_ATIVA' },
  { id: 'stage-3', name: 'Follow-up', color: '#F59E0B', position: 2, status: 'FOLLOW_UP' },
  { id: 'stage-4', name: 'Banco de 7 dias', color: '#8B5CF6', position: 3, status: 'BANCO_7_DIAS' },
  { id: 'stage-5', name: 'Novas Mensagens', color: '#06B6D4', position: 4, status: 'NOVAS_MENSAGENS' },
  { id: 'stage-6', name: 'Reunião Agendada', color: '#EC4899', position: 5, status: 'REUNIAO_AGENDADA' },
  { id: 'stage-7', name: 'Proposta Enviada', color: '#F97316', position: 6, status: 'PROPOSTA_ENVIADA' },
  { id: 'stage-8', name: 'Serviço Fechado', color: '#22C55E', position: 7, status: 'SERVICO_FECHADO' },
  { id: 'stage-9', name: 'Pagamento Confirmado', color: '#16A34A', position: 8, status: 'PAGAMENTO_CONFIRMADO' },
  { id: 'stage-10', name: 'Inativo', color: '#6B7280', position: 9, status: 'INATIVO' },
  { id: 'stage-11', name: 'Sem Resposta', color: '#EF4444', position: 10, status: 'SEM_RESPOSTA' },
  { id: 'stage-12', name: 'Conversas em Off', color: '#6B7280', position: 11, status: 'CONVERSAS_OFF' },
]

// Fluxos de automação da jornada de compra (conversam com o Hermes Agent)
const JOURNEY_AUTOMATIONS = [
  { id: 'journey-1', name: 'Primeiro Contato → Conversa Ativa', description: 'Quando o sistema responde e o lead envia uma tréplica, ele entra em Conversa Ativa mantendo a tag do canal de origem.', fromStatus: 'PRIMEIRO_CONTATO', toStatus: 'CONVERSA_ATIVA', triggerType: 'reply', delayHours: 0, action: 'move_stage', message: null as string | null, keepChannelTag: true, connectHermes: true, sortOrder: 1 },
  { id: 'journey-2', name: 'Follow-up 24h genérico (Conversa Ativa → Follow-up)', description: 'Lead classificado como interessado em curso sem responder há 24h: envia mensagem utilitária e move para Follow-up.', fromStatus: 'CONVERSA_ATIVA', toStatus: 'FOLLOW_UP', triggerType: 'no_reply', delayHours: 24, action: 'run_cronjob', message: 'E aí, {{nome}}, beleza? Você ainda ficou com dúvidas sobre o curso?\n\nVocê viu que a gente só tem até hoje 23h59 pra finalizar antes das vagas encerrarem, né?', keepChannelTag: true, connectHermes: true, sortOrder: 2 },
  { id: 'journey-3', name: 'Follow-up → Conversa Ativa (respondeu)', description: 'Se o lead responder ao follow-up, ele volta para Conversa Ativa.', fromStatus: 'FOLLOW_UP', toStatus: 'CONVERSA_ATIVA', triggerType: 'reply', delayHours: 0, action: 'move_stage', message: null as string | null, keepChannelTag: true, connectHermes: true, sortOrder: 3 },
  { id: 'journey-4', name: 'Follow-up 168h genérico (Follow-up → Banco de 7 dias)', description: 'Lead em Follow-up sem responder há 7 dias: envia mensagem utilitária e move para Banco de 7 dias.', fromStatus: 'FOLLOW_UP', toStatus: 'BANCO_7_DIAS', triggerType: 'no_reply', delayHours: 168, action: 'move_stage', message: 'Então, {{nome}}, eu achei que você quizesse garantir sua vaga para faturar mais de 10 mil por mês, do conforto de casa.\n\nVou precisar passar sua vaga pra outra pessoa.\n\nAinda tem interesse em prosseguir? Melhor aproveitar e entrar agora no curso!', keepChannelTag: true, connectHermes: true, sortOrder: 4 },
  { id: 'journey-5', name: 'Banco de 7 dias → Conversas em Off (follow-up agressivo)', description: 'Após 7 dias sem resposta, um follow-up agressivo é disparado e o lead estaciona em Conversas em Off (etapa terminal). Se responder, volta para Conversa Ativa pela regra "Conversas em Off → Conversa Ativa".', fromStatus: 'BANCO_7_DIAS', toStatus: 'CONVERSAS_OFF', triggerType: 'no_reply', delayHours: 168, action: 'run_cronjob', message: 'Última chamada! Estamos com uma condição especial que pode ser exatamente o que você precisa. Quer que eu te mostre agora?', keepChannelTag: true, connectHermes: true, sortOrder: 5 },
  { id: 'journey-6', name: 'Banco de 7 dias → Conversa Ativa (respondeu)', description: 'Se o lead do banco responder ao follow-up agressivo, volta para Conversa Ativa.', fromStatus: 'BANCO_7_DIAS', toStatus: 'CONVERSA_ATIVA', triggerType: 'reply', delayHours: 0, action: 'move_stage', message: null as string | null, keepChannelTag: true, connectHermes: true, sortOrder: 6 },
  { id: 'journey-off-1', name: 'Conversas em Off → Conversa Ativa (respondeu)', description: 'Se o lead estacionado em Conversas em Off responder a qualquer mensagem, volta para Conversa Ativa e o fluxo reinicia normalmente.', fromStatus: 'CONVERSAS_OFF', toStatus: 'CONVERSA_ATIVA', triggerType: 'reply', delayHours: 0, action: 'move_stage', message: null as string | null, keepChannelTag: true, connectHermes: true, sortOrder: 7 },
  { id: 'journey-7', name: 'Compra fechada → Serviço Fechado', description: 'Quando o webhook detecta uma compra ou serviço fechado, o lead vai para Serviço Fechado e o valor é registrado e empilhado no total gasto do cliente.', fromStatus: null as string | null, toStatus: 'SERVICO_FECHADO', triggerType: 'purchase', delayHours: 0, action: 'register_purchase', message: null as string | null, keepChannelTag: true, connectHermes: true, sortOrder: 8 },
  { id: 'journey-8', name: 'Cliente antigo chamou → Novas Mensagens', description: 'Leads antigos (qualquer status) que mandam mensagem espontanea entram em Novas Mensagens. PRECEDENCIA: nao captura lead em BANCO_7_DIAS respondendo ao follow-up agressivo nem lead em CONVERSAS_OFF — esses casos sao resolvidos antes pelas regras de reply (sortOrder 6 e 7).', fromStatus: null as string | null, toStatus: 'NOVAS_MENSAGENS', triggerType: 'inbound_message', delayHours: 0, action: 'move_stage', message: null as string | null, keepChannelTag: true, connectHermes: true, sortOrder: 9 },
  { id: 'journey-9', name: 'Entrada no Banco de 7 dias (24h sem resposta)', description: 'O lead já foi reativado uma vez através de follow up, a mensagem foi reativada, porém ele não respondeu novamente por mais 24h e agora entra no nosso banco de 7 dias', fromStatus: 'CONVERSA_ATIVA', toStatus: 'BANCO_7_DIAS', triggerType: 'no_reply', delayHours: 24, action: 'run_cronjob', message: null as string | null, keepChannelTag: true, connectHermes: true, sortOrder: 10 },
]

const USERS = [
  { id: 'user-demo-admin', email: 'admin@vortex.com.br', password: 'demo1234', name: 'Ricardo Almeida', role: Role.ADMIN, jobTitle: 'CEO', avatarUrl: 'https://i.pravatar.cc/150?img=13' },
  { id: 'user-manager', email: 'ana.souza@vortex.com.br', password: 'demo1234', name: 'Ana Beatriz Souza', role: Role.MANAGER, jobTitle: 'Gerente Comercial', avatarUrl: 'https://i.pravatar.cc/150?img=47' },
  { id: 'user-member-1', email: 'carlos.lima@vortex.com.br', password: 'demo1234', name: 'Carlos Eduardo Lima', role: Role.MEMBER, jobTitle: 'Consultor de Vendas', avatarUrl: 'https://i.pravatar.cc/150?img=33' },
  { id: 'user-member-2', email: 'fernanda.oliveira@vortex.com.br', password: 'demo1234', name: 'Fernanda Oliveira', role: Role.MEMBER, jobTitle: 'Consultora de Vendas', avatarUrl: 'https://i.pravatar.cc/150?img=45' },
  { id: 'user-member-3', email: 'rafael.mendes@vortex.com.br', password: 'demo1234', name: 'Rafael Mendes', role: Role.MEMBER, jobTitle: 'SDR', avatarUrl: 'https://i.pravatar.cc/150?img=53' },
]

const MEMBER_IDS = ['user-manager', 'user-member-1', 'user-member-2', 'user-member-3']

const COMPANIES = [
  'Padaria Pão Dourado', 'Clínica Vida Plena', 'Advocacia Menezes & Costa', 'TechNova Sistemas', 'Academia Corpo em Forma',
  'Restaurante Sabor Mineiro', 'Imobiliária Lar Ideal', 'Auto Peças Veloz', 'Estúdio Bella Fotografia', 'Contabilidade Precisa',
  'Pet Shop Amigo Fiel', 'Escola Saber Mais', 'Ótica Visão Clara', 'Construtora Alicerce', 'Salão Beleza Pura',
  'Farmácia Saúde Total', 'Marcenaria Nobre Madeira', 'Consultoria RH Talentos', 'Loja Moda Urbana', 'Distribuidora Central',
]
const FIRST_NAMES = ['João','Maria','Pedro','Juliana','Lucas','Camila','Bruno','Patrícia','Gustavo','Larissa','Marcelo','Beatriz','Rodrigo','Amanda','Felipe','Tatiane','Vinícius','Renata','Diego','Priscila']
const LAST_NAMES = ['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Rocha','Barbosa','Araújo','Nunes','Cardoso','Teixeira']
const CITIES_DDD = ['11','21','31','41','51','61','71','81','85']
const SOURCES = [LeadSource.WHATSAPP, LeadSource.META_ADS, LeadSource.GOOGLE_ADS, LeadSource.LANDING_PAGE, LeadSource.ORGANICO, LeadSource.INDICACAO, LeadSource.MANUAL]
const SEGMENTS = ['Alimentação', 'Saúde', 'Jurídico', 'Tecnologia', 'Fitness', 'Imobiliário', 'Varejo', 'Educação', 'Serviços']

function cnpj(i: number) {
  const base = (10000000 + i * 137).toString().padStart(8, '0')
  return `${base.slice(0,2)}.${base.slice(2,5)}.${base.slice(5,8)}/0001-${((i * 7) % 90 + 10)}`
}
function phone(i: number) {
  const ddd = CITIES_DDD[i % CITIES_DDD.length]
  const n = (900000000 + i * 12345).toString().slice(0, 9)
  return `(${ddd}) ${n.slice(0,5)}-${n.slice(5,9)}`
}
function daysAgo(d: number) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000)
}

async function main() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: 'Agência Vortex', slug: 'vortex', primaryColor: '#3B82F6', secondaryColor: '#10B981' },
  })

  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, jobTitle: u.jobTitle, avatarUrl: u.avatarUrl, tenantId: TENANT_ID },
      create: { id: u.id, email: u.email, password: hashed, name: u.name, role: u.role, jobTitle: u.jobTitle, avatarUrl: u.avatarUrl, tenantId: TENANT_ID },
    })
  }

  for (const m of MODULES) {
    await prisma.module.upsert({
      where: { tenantId_key: { tenantId: TENANT_ID, key: m.key } },
      update: { displayName: m.displayName, description: m.description, category: m.category, isCore: m.isCore, isActive: m.isActive, sortOrder: m.sortOrder },
      create: { tenantId: TENANT_ID, ...m },
    })
  }

  // Email Marketing — templates
  for (const t of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { id: t.id },
      update: { name: t.name, subject: t.subject, htmlBody: t.htmlBody, category: t.category, variables: t.variables, tenantId: TENANT_ID },
      create: { id: t.id, tenantId: TENANT_ID, name: t.name, subject: t.subject, htmlBody: t.htmlBody, category: t.category, variables: t.variables },
    })
  }

  // Email Marketing — campanhas demo
  for (const c of EMAIL_CAMPAIGNS) {
    const createdDays = typeof c.createdAt === 'number' ? c.createdAt : 0
    const data: any = {
      tenantId: TENANT_ID,
      name: c.name,
      subject: c.subject,
      htmlBody: c.htmlBody,
      category: c.category,
      status: c.status,
      templateId: c.templateId,
      segmentType: c.segmentType,
      segmentValue: c.segmentValue ?? null,
      senderName: c.senderName ?? null,
      senderEmail: c.senderEmail ?? null,
      totalRecipients: c.totalRecipients ?? 0,
      totalSent: c.totalSent ?? 0,
      totalOpened: c.totalOpened ?? 0,
      totalClicked: c.totalClicked ?? 0,
      totalBounced: c.totalBounced ?? 0,
      totalFailed: c.totalFailed ?? 0,
      createdById: 'user-demo-admin',
      createdAt: daysAgo(createdDays),
    }
    if (c.sentAt) data.sentAt = daysAgo(c.sentAt)
    await prisma.emailCampaign.upsert({
      where: { id: c.id },
      update: data,
      create: { id: c.id, ...data },
    })
  }

  await prisma.pipeline.upsert({
    where: { id: 'pipeline-1' },
    update: {},
    create: { id: 'pipeline-1', tenantId: TENANT_ID, name: 'Funil de Vendas', isDefault: true },
  })
  for (const s of STAGES) {
    await prisma.stage.upsert({
      where: { id: s.id },
      update: { name: s.name, color: s.color, position: s.position },
      create: { id: s.id, pipelineId: 'pipeline-1', name: s.name, color: s.color, position: s.position },
    })
  }

  // Lead Types
  for (let i = 0; i < LEAD_TYPES.length; i++) {
    const t = LEAD_TYPES[i]
    await prisma.leadType.upsert({
      where: { tenantId_key: { tenantId: TENANT_ID, key: t.key } },
      update: { label: t.label, color: t.color, icon: t.icon, description: t.description, isSystem: true, sortOrder: i + 1 },
      create: { id: `ltype-${t.key}`, tenantId: TENANT_ID, key: t.key, label: t.label, color: t.color, icon: t.icon, description: t.description, isSystem: true, isActive: true, sortOrder: i + 1 },
    })
  }

  // Catalog Items
  for (const c of CATALOG_ITEMS) {
    const leadTypeKeys = [c.leadTypeKey, ...(c.extraLeadTypeKeys ?? [])]
    const leadTypeConnections = leadTypeKeys.map((k) => ({ leadType: { connect: { id: `ltype-${k}` } } }))
    await prisma.catalogItem.upsert({
      where: { id: c.id },
      update: { name: c.name, kind: c.kind, price: c.price, objective: c.objective, description: c.description, leadTypes: { deleteMany: {}, create: leadTypeConnections }, sortOrder: c.sortOrder, isActive: true },
      create: { id: c.id, tenantId: TENANT_ID, name: c.name, kind: c.kind, price: c.price, objective: c.objective, description: c.description, leadTypes: { create: leadTypeConnections }, sortOrder: c.sortOrder, isActive: true },
    })
  }

  // Classification Rules
  for (const r of CLASSIFICATION_RULES) {
    const ruleLeadTypes = [{ leadType: { connect: { id: `ltype-${r.leadTypeKey}` } } }]
    const ruleCatalogItems = r.catalogItemIds.map((cid) => ({ catalogItem: { connect: { id: cid } } }))
    await prisma.classificationRule.upsert({
      where: { id: r.id },
      update: { name: r.name, keywords: r.keywords, matchType: r.matchType, source: r.source, leadTypes: { deleteMany: {}, create: ruleLeadTypes }, catalogItems: { deleteMany: {}, create: ruleCatalogItems }, autoMessages: r.autoMessages, autoReply: r.autoReply, priority: r.priority, isActive: true },
      create: { id: r.id, tenantId: TENANT_ID, name: r.name, keywords: r.keywords, matchType: r.matchType, source: r.source, leadTypes: { create: ruleLeadTypes }, catalogItems: { create: ruleCatalogItems }, autoMessages: r.autoMessages, autoReply: r.autoReply, priority: r.priority, isActive: true },
    })
  }

  // Leads distribuídos pelas 6 etapas da jornada de compra
  const leadStatuses = STAGES.map((s) => s.status as LeadStatus)
  const purchaseSeeds: { id: string; leadId: string; description: string; amount: number; catalogItemId: string | null; daysAgo: number }[] = []
  for (let i = 0; i < 44; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length]
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length]
    const name = `${first} ${last}`
    const company = COMPANIES[i % COMPANIES.length]
    const stageIdx = i % 6
    const status = leadStatuses[stageIdx]
    const stageId = STAGES[stageIdx].id
    const assignedToId = MEMBER_IDS[i % MEMBER_IDS.length]
    const dealValue = 1500 + ((i * 613) % 20) * 500
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}.com.br`
    const leadTypeKey = LEAD_TYPES[i % LEAD_TYPES.length].key
    const matchingCatalog = CATALOG_ITEMS.find((c) => c.leadTypeKey === leadTypeKey)
    const catalogItemId = matchingCatalog?.id ?? null
    const objective = matchingCatalog?.objective ?? null
    const socialMedia = SOCIAL_HANDLES[i % SOCIAL_HANDLES.length]
    const leadTypeKeys = [leadTypeKey]
    if (leadTypeKey !== 'cliente' && (status === 'SERVICO_FECHADO' || status === 'NOVAS_MENSAGENS')) leadTypeKeys.push('cliente')
    const leadTypeConnections = leadTypeKeys.map((k) => ({ leadType: { connect: { id: `ltype-${k}` } } }))

    // Banco de conversas em off: conversas que "morreram" (ficaram dias sem resposta).
    // Saem das colunas do pipeline e ficam guardadas para consulta rápida.
    const isArchived = i % 7 === 6

    // Empilhamento de compras: leads em Serviço Fechado e alguns em Novas Mensagens (clientes antigos) têm compras.
    let totalPurchased = 0
    const isClosed = status === 'SERVICO_FECHADO'
    const isReturningClient = status === 'NOVAS_MENSAGENS'
    if (isClosed || isReturningClient) {
      const basePrice = matchingCatalog?.price ?? dealValue
      const numPurchases = isClosed ? 1 + (i % 3) : 1 + (i % 2)
      for (let p = 0; p < numPurchases; p++) {
        const amount = Math.round((basePrice * (1 + p * 0.5)) * 100) / 100
        totalPurchased += amount
        purchaseSeeds.push({
          id: `purchase-${i + 1}-${p + 1}`,
          leadId: `lead-${i + 1}`,
          description: matchingCatalog ? matchingCatalog.name : `Compra ${p + 1}`,
          amount,
          catalogItemId,
          daysAgo: 40 - p * 12,
        })
      }
    }

    await prisma.lead.upsert({
      where: { id: `lead-${i + 1}` },
      update: { leadTypes: { deleteMany: {}, create: leadTypeConnections }, catalogItemId, objective, socialMedia, status, stageId, totalPurchased, isArchived, archivedAt: isArchived ? daysAgo(9 + (i % 5)) : null },
      create: {
        id: `lead-${i + 1}`,
        tenantId: TENANT_ID,
        name,
        email,
        phone: phone(i),
        companyName: company,
        cnpj: cnpj(i),
        status,
        source: SOURCES[i % SOURCES.length],
        score: (i * 17) % 100,
        tags: i % 3 === 0 ? ['quente', 'prioridade'] : i % 3 === 1 ? ['morno'] : ['frio'],
        dealValue,
        assignedToId,
        stageId,
        stagePosition: Math.floor(i / 6),
        leadTypes: { create: leadTypeConnections },
        catalogItemId,
        objective,
        socialMedia,
        totalPurchased,
        isArchived,
        archivedAt: isArchived ? daysAgo(9 + (i % 5)) : null,
        firstContactAt: daysAgo(60 - i),
        lastInteraction: daysAgo(30 - (i % 30)),
        createdAt: daysAgo(60 - i),
      },
    })
  }

  // Compras empilhadas por lead (webhook registraria automaticamente)
  for (const p of purchaseSeeds) {
    await prisma.purchase.upsert({
      where: { id: p.id },
      update: { description: p.description, amount: p.amount, catalogItemId: p.catalogItemId },
      create: {
        id: p.id,
        tenantId: TENANT_ID,
        leadId: p.leadId,
        description: p.description,
        amount: p.amount,
        catalogItemId: p.catalogItemId,
        createdAt: daysAgo(p.daysAgo),
      },
    })
  }

  // Automações da jornada de compra
  for (const a of JOURNEY_AUTOMATIONS) {
    await prisma.journeyAutomation.upsert({
      where: { id: a.id },
      update: { name: a.name, description: a.description, fromStatus: a.fromStatus, toStatus: a.toStatus, triggerType: a.triggerType, delayHours: a.delayHours, action: a.action, message: a.message, keepChannelTag: a.keepChannelTag, connectHermes: a.connectHermes, sortOrder: a.sortOrder, isActive: true },
      create: { id: a.id, tenantId: TENANT_ID, name: a.name, description: a.description, fromStatus: a.fromStatus, toStatus: a.toStatus, triggerType: a.triggerType, delayHours: a.delayHours, action: a.action, message: a.message, keepChannelTag: a.keepChannelTag, connectHermes: a.connectHermes, sortOrder: a.sortOrder, isActive: true },
    })
  }

  // Interactions for first few leads
  const interTemplates: { type: InteractionType; title: string; content: string; amount?: number }[] = [
    { type: InteractionType.SYSTEM_EVENT, title: 'Lead capturado', content: 'Lead criado automaticamente via formulário de captura.' },
    { type: InteractionType.WHATSAPP_RECEIVED, title: 'Mensagem recebida via WhatsApp', content: 'Olá, tenho interesse em conhecer melhor os serviços de vocês.' },
    { type: InteractionType.WHATSAPP_SENT, title: 'Mensagem enviada via WhatsApp', content: 'Olá! Obrigado pelo contato. Podemos agendar uma conversa rápida?' },
    { type: InteractionType.PHONE_CALL, title: 'Ligação realizada', content: 'Ligação de qualificação — duração 8 min. Cliente demonstrou interesse.' },
    { type: InteractionType.MEETING, title: 'Reunião agendada', content: 'Reunião de apresentação marcada para próxima terça às 14h.' },
    { type: InteractionType.STATUS_CHANGE, title: 'Status alterado', content: 'Movido de Conversa Ativa para Reunião Agendada.' },
    { type: InteractionType.NOTE, title: 'Nota interna', content: 'Cliente pediu proposta com condição de pagamento parcelado.' },
    { type: InteractionType.PAYMENT_RECEIVED, title: 'Pagamento confirmado', content: 'Pagamento via PIX confirmado.', amount: 4500 },
  ]
  for (let i = 0; i < 12; i++) {
    const leadId = `lead-${i + 1}`
    const count = 4 + (i % 4)
    for (let j = 0; j < count; j++) {
      const t = interTemplates[(i + j) % interTemplates.length]
      await prisma.interaction.upsert({
        where: { id: `inter-${i + 1}-${j}` },
        update: {},
        create: {
          id: `inter-${i + 1}-${j}`,
          tenantId: TENANT_ID,
          leadId,
          userId: MEMBER_IDS[(i + j) % MEMBER_IDS.length],
          type: t.type,
          title: t.title,
          content: t.content,
          amount: t.amount ?? null,
          createdAt: daysAgo(20 - j * 2),
        },
      })
    }
  }

  // Clients
  const clientStatuses = [ClientStatus.ATIVO, ClientStatus.ATIVO, ClientStatus.ATIVO, ClientStatus.INADIMPLENTE, ClientStatus.INATIVO, ClientStatus.PROSPECTADO]
  for (let i = 0; i < 16; i++) {
    const first = FIRST_NAMES[(i * 2) % FIRST_NAMES.length]
    const last = LAST_NAMES[(i * 5) % LAST_NAMES.length]
    const company = COMPANIES[(i + 4) % COMPANIES.length]
    await prisma.client.upsert({
      where: { id: `client-${i + 1}` },
      update: {},
      create: {
        id: `client-${i + 1}`,
        tenantId: TENANT_ID,
        name: `${first} ${last}`,
        companyName: company,
        cnpj: cnpj(i + 50),
        email: `contato@${company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.com.br`,
        phone: phone(i + 20),
        status: clientStatuses[i % clientStatuses.length],
        lifetimeValue: 3000 + ((i * 971) % 40) * 750,
        segment: SEGMENTS[i % SEGMENTS.length],
        assignedToId: MEMBER_IDS[i % MEMBER_IDS.length],
        createdAt: daysAgo(120 - i * 5),
      },
    })
  }

  // Agenda / Calendário — eventos de exemplo distribuídos ao redor de hoje.
  function atDay(offset: number, hour: number, minute = 0) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + offset)
    d.setHours(hour, minute, 0, 0)
    return d
  }
  const EVENTS = [
    { id: 'event-1', title: 'Reunião de kickoff — Vortex Digital', type: 'MEETING', dayOffset: 0, startHour: 9, durationMin: 60, leadId: 'lead-1', assignee: 'user-manager', location: 'Google Meet', meetingUrl: 'https://meet.google.com/abc-defg-hij', description: 'Apresentação da proposta e alinhamento de expectativas.' },
    { id: 'event-2', title: 'Ligação de qualificação', type: 'CALL', dayOffset: 0, startHour: 14, durationMin: 30, leadId: 'lead-2', assignee: 'user-member-1', description: 'Entender orçamento e prazo do lead.' },
    { id: 'event-3', title: 'Follow-up proposta comercial', type: 'FOLLOWUP', dayOffset: 1, startHour: 11, durationMin: 30, leadId: 'lead-3', assignee: 'user-member-2', description: 'Retomar conversa sobre a proposta enviada.' },
    { id: 'event-4', title: 'Enviar contrato para assinatura', type: 'TASK', dayOffset: 1, startHour: 16, durationMin: 20, leadId: 'lead-5', assignee: 'user-manager', description: 'Gerar contrato e enviar por email.' },
    { id: 'event-5', title: 'Demonstração do produto', type: 'MEETING', dayOffset: 2, startHour: 10, durationMin: 45, leadId: 'lead-8', assignee: 'user-member-3', location: 'Presencial — Escritório', description: 'Demo ao vivo das funcionalidades principais.' },
    { id: 'event-6', title: 'Prazo — resposta da proposta', type: 'DEADLINE', dayOffset: 3, startHour: 18, durationMin: 0, leadId: 'lead-9', assignee: 'user-manager', description: 'Data limite para o cliente retornar.' },
    { id: 'event-7', title: 'Reunião semanal da equipe', type: 'MEETING', dayOffset: 3, startHour: 9, durationMin: 60, assignee: 'user-manager', location: 'Sala de reuniões', description: 'Revisão do pipeline e metas da semana.' },
    { id: 'event-8', title: 'Ligação de reativação', type: 'CALL', dayOffset: 4, startHour: 15, durationMin: 30, leadId: 'lead-14', assignee: 'user-member-1', description: 'Reengajar lead que voltou do banco de 7 dias.' },
    { id: 'event-9', title: 'Follow-up pós-demonstração', type: 'FOLLOWUP', dayOffset: 5, startHour: 13, durationMin: 30, leadId: 'lead-8', assignee: 'user-member-3', description: 'Coletar feedback e endereçar objeções.' },
    { id: 'event-10', title: 'Reunião de fechamento', type: 'MEETING', dayOffset: -1, startHour: 16, durationMin: 45, leadId: 'lead-11', assignee: 'user-manager', location: 'Google Meet', meetingUrl: 'https://meet.google.com/xyz-1234-abc', status: 'DONE', description: 'Negociação final e assinatura.' },
    { id: 'event-11', title: 'Onboarding do cliente novo', type: 'TASK', dayOffset: -2, startHour: 10, durationMin: 60, leadId: 'lead-5', assignee: 'user-member-2', status: 'DONE', description: 'Configuração inicial e treinamento.' },
    { id: 'event-12', title: 'Planejamento de campanha', type: 'MEETING', dayOffset: 6, startHour: 11, durationMin: 90, assignee: 'user-member-1', location: 'Sala de reuniões', description: 'Definir estratégia de tráfego pago do mês.' },
  ]
  for (const e of EVENTS) {
    const startsAt = atDay(e.dayOffset, e.startHour, 0)
    const endsAt = new Date(startsAt.getTime() + (e.durationMin ?? 30) * 60 * 1000)
    const data = {
      tenantId: TENANT_ID,
      title: e.title,
      description: (e as any).description ?? null,
      type: e.type,
      status: (e as any).status ?? 'SCHEDULED',
      startsAt,
      endsAt,
      allDay: false,
      location: (e as any).location ?? null,
      meetingUrl: (e as any).meetingUrl ?? null,
      leadId: (e as any).leadId ?? null,
      assignedToId: (e as any).assignee ?? null,
      syncSource: 'local',
    }
    await prisma.calendarEvent.upsert({
      where: { id: e.id },
      update: data,
      create: { id: e.id, ...data },
    })
  }

  // ---------- Conversas (Central de Conversas estilo WhatsApp) ----------
  // O bot de WhatsApp (Hermes Agent) injeta mensagens via MCP; aqui semeamos conversas realistas.
  const minsAgo = (m: number) => new Date(Date.now() - m * 60 * 1000)
  const mediaLabel = (t: string) =>
    t === 'image' ? '📷 Foto' : t === 'audio' ? '🎤 Áudio' : t === 'video' ? '🎥 Vídeo' : t === 'document' ? '📎 Documento' : t === 'location' ? '📍 Localização' : '📎 Anexo'
  type SeedMsg = { from: 'in' | 'out' | 'bot'; text: string; min: number; status?: string; mediaType?: string }
  const CONVERSATIONS: { leadId: string; unread: number; msgs: SeedMsg[] }[] = [
    {
      leadId: 'lead-1',
      unread: 2,
      msgs: [
        { from: 'in', text: 'Olá! Vi o anúncio de vocês no Instagram e queria entender melhor os serviços.', min: 1440 },
        { from: 'bot', text: 'Oi! Que bom ter você por aqui 😊 Sou o assistente da Agência Vortex. Você busca ajuda com tráfego pago, social media ou site?', min: 1438 },
        { from: 'in', text: 'Principalmente tráfego pago pra minha loja de roupas.', min: 1435 },
        { from: 'out', text: 'Perfeito! Trabalhamos com gestão completa de tráfego. Posso te chamar amanhã às 10h para entender melhor seu momento?', min: 1430, status: 'READ' },
        { from: 'in', text: 'Pode sim!', min: 1428 },
        { from: 'in', text: 'Aliás, vocês fazem também a parte de criativos?', min: 20 },
        { from: 'in', text: 'Fico no aguardo 🙏', min: 8 },
      ],
    },
    {
      leadId: 'lead-2',
      unread: 0,
      msgs: [
        { from: 'in', text: 'Bom dia, recebi a proposta de vocês. Podemos conversar sobre os valores?', min: 2880 },
        { from: 'out', text: 'Bom dia! Claro. A proposta contempla gestão + criativos. Qual ponto ficou com dúvida?', min: 2875, status: 'READ' },
        { from: 'in', text: 'O investimento mensal. Consigo começar com um valor menor?', min: 2870 },
        { from: 'out', text: 'Conseguimos montar um plano de entrada e escalar conforme os resultados. Te envio a versão ajustada ainda hoje.', min: 2860, status: 'READ' },
        { from: 'in', text: 'Show, obrigado!', min: 2855 },
      ],
    },
    {
      leadId: 'lead-3',
      unread: 1,
      msgs: [
        { from: 'in', text: 'Oi, tudo bem? Ainda dá tempo de fechar aquele pacote que conversamos?', min: 300 },
        { from: 'bot', text: 'Oi! O pacote ainda está disponível esta semana. Quer que eu reserve pra você?', min: 298 },
        { from: 'in', text: 'Quero sim, por favor.', min: 15 },
      ],
    },
    {
      leadId: 'lead-4',
      unread: 0,
      msgs: [
        { from: 'in', text: 'Comprovante_pagamento.pdf', min: 4320, mediaType: 'document' },
        { from: 'out', text: 'Recebido! Pagamento confirmado ✅ Vou dar início ao seu projeto agora mesmo.', min: 4315, status: 'READ' },
        { from: 'in', text: 'Maravilha, muito obrigada!', min: 4310 },
      ],
    },
    {
      leadId: 'lead-5',
      unread: 3,
      msgs: [
        { from: 'in', text: 'Oi! Quero saber sobre a gestão de redes sociais.', min: 720 },
        { from: 'bot', text: 'Oi! Nossa gestão inclui planejamento, criação de posts e relatórios mensais. Quantas redes você quer trabalhar?', min: 718 },
        { from: 'in', text: 'Instagram e Facebook.', min: 60 },
        { from: 'in', text: 'E vocês respondem os direct também?', min: 45 },
        { from: 'in', text: 'Preciso muito organizar isso 😩', min: 5 },
      ],
    },
    {
      leadId: 'lead-6',
      unread: 0,
      msgs: [
        { from: 'in', text: 'Boa tarde! Gostaria de agendar uma reunião de apresentação.', min: 5760 },
        { from: 'out', text: 'Boa tarde! Claro. Tenho horários na quinta às 14h ou sexta às 10h. Qual prefere?', min: 5755, status: 'READ' },
        { from: 'in', text: 'Quinta às 14h fica ótimo.', min: 5750 },
        { from: 'bot', text: 'Agendado! ✅ Reunião marcada para quinta às 14h. Você receberá o link do Meet por aqui.', min: 5748 },
      ],
    },
    {
      leadId: 'lead-7',
      unread: 1,
      msgs: [
        { from: 'in', text: 'Mensagem de voz (0:42)', min: 180, mediaType: 'audio' },
        { from: 'out', text: 'Ouvi seu áudio! Entendi a necessidade. Vou preparar uma proposta focada em captação de leads.', min: 175, status: 'DELIVERED' },
        { from: 'in', text: 'Perfeito, aguardo!', min: 30 },
      ],
    },
    {
      leadId: 'lead-8',
      unread: 0,
      msgs: [
        { from: 'in', text: 'Vocês têm cases de resultado no meu segmento (estética)?', min: 10080 },
        { from: 'out', text: 'Temos sim! Já escalamos 3 clínicas de estética. Te mando alguns números por aqui.', min: 10070, status: 'READ' },
        { from: 'out', text: 'Uma delas saiu de 12 para 80 agendamentos por mês em 90 dias 🚀', min: 10068, status: 'READ' },
        { from: 'in', text: 'Impressionante! Bora marcar uma call.', min: 10060 },
      ],
    },
    {
      leadId: 'lead-9',
      unread: 0,
      msgs: [
        { from: 'bot', text: 'Oi! Notei que faz alguns dias que não conversamos. Ainda quer seguir com o projeto de tráfego? 😊', min: 2160 },
        { from: 'in', text: 'Oi! Desculpa a demora, tive uns imprevistos. Semana que vem eu retomo.', min: 2150 },
        { from: 'out', text: 'Sem problemas! Deixo tudo pronto pra quando você puder. Qualquer coisa é só chamar aqui.', min: 2145, status: 'READ' },
      ],
    },
    {
      leadId: 'lead-10',
      unread: 2,
      msgs: [
        { from: 'in', text: 'Oi, quero um orçamento pra criação de site.', min: 90 },
        { from: 'bot', text: 'Oi! Criamos sites institucionais e landing pages de alta conversão. É pra qual objetivo?', min: 88 },
        { from: 'in', text: 'Landing page pra captar leads de um curso.', min: 40 },
        { from: 'in', text: 'Consegue me passar um valor aproximado?', min: 12 },
      ],
    },
  ]

  let msgCount = 0
  for (const conv of CONVERSATIONS) {
    // ordena do mais antigo para o mais recente
    const ordered = [...conv.msgs].sort((a, b) => b.min - a.min)
    let lastText = ''
    let lastAt = new Date()
    for (let k = 0; k < ordered.length; k++) {
      const m = ordered[k]
      const direction = m.from === 'in' ? 'INBOUND' : 'OUTBOUND'
      const isFromBot = m.from === 'bot'
      const senderName = m.from === 'bot' ? 'Hermes Agent' : m.from === 'out' ? 'Equipe Vortex' : null
      const status = direction === 'INBOUND' ? 'DELIVERED' : m.status ?? 'SENT'
      const ts = minsAgo(m.min)
      lastText = m.mediaType ? mediaLabel(m.mediaType) : m.text
      lastAt = ts
      msgCount++
      const id = `msg-${conv.leadId}-${k + 1}`
      const data = {
        tenantId: TENANT_ID,
        leadId: conv.leadId,
        direction,
        content: m.text,
        status,
        senderName,
        isFromBot,
        mediaType: m.mediaType ?? null,
        timestamp: ts,
      }
      await prisma.message.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      })
    }
    await prisma.lead.update({
      where: { id: conv.leadId },
      data: {
        lastMessageAt: lastAt,
        lastReplyAt: lastAt,
        lastMessageText: lastText.slice(0, 160),
        unreadCount: conv.unread,
        lastInteraction: lastAt,
      },
    })
  }
  console.log(`Conversas semeadas: ${CONVERSATIONS.length} (mensagens: ${msgCount}).`)

  // ---------- Alunos (base do dono / whitelabel) ----------
  const STUDENTS = [
    { id: 'student-1', name: 'Rafael Nogueira', email: 'rafael.nogueira@gmail.com', phone: '+55 11 98812-4455', product: 'Mentoria Tráfego Pago', plan: 'Anual', status: 'ATIVO', progress: 72, amountPaid: 2997, source: 'Hotmart', enrolled: 84, lastAccess: 1 },
    { id: 'student-2', name: 'Juliana Prado', email: 'ju.prado@outlook.com', phone: '+55 21 99234-1188', product: 'Curso Gestão de Agências', plan: 'Trimestral', status: 'ATIVO', progress: 45, amountPaid: 1497, source: 'Kiwify', enrolled: 51, lastAccess: 2 },
    { id: 'student-3', name: 'Marcos Vinícius Lima', email: 'marcos.lima@empresa.com.br', phone: '+55 31 98745-2200', product: 'Mentoria Tráfego Pago', plan: 'Mensal', status: 'ATIVO', progress: 18, amountPaid: 397, source: 'Hotmart', enrolled: 12, lastAccess: 0 },
    { id: 'student-4', name: 'Carla Mendes', email: 'carla.mendes@gmail.com', phone: '+55 41 99123-7788', product: 'Curso Gestão de Agências', plan: 'Anual', status: 'CONCLUIDO', progress: 100, amountPaid: 3997, source: 'Eduzz', enrolled: 240, lastAccess: 9 },
    { id: 'student-5', name: 'Bruno Ferreira', email: 'bruno.ferreira@gmail.com', phone: '+55 51 98322-6611', product: 'Imersão Escala 7 Dígitos', plan: 'Vitalício', status: 'ATIVO', progress: 60, amountPaid: 5997, source: 'Hotmart', enrolled: 33, lastAccess: 1 },
    { id: 'student-6', name: 'Patrícia Gomes', email: 'patricia.gomes@hotmail.com', phone: '+55 62 99411-3344', product: 'Curso Copywriting', plan: 'Trimestral', status: 'INATIVO', progress: 25, amountPaid: 897, source: 'Kiwify', enrolled: 118, lastAccess: 40 },
    { id: 'student-7', name: 'André Santos', email: 'andre.santos@gmail.com', phone: '+55 11 98700-9922', product: 'Mentoria Tráfego Pago', plan: 'Anual', status: 'ATIVO', progress: 88, amountPaid: 2997, source: 'Hotmart', enrolled: 160, lastAccess: 0 },
    { id: 'student-8', name: 'Fernanda Oliveira', email: 'fer.oliveira@gmail.com', phone: '+55 85 99655-4477', product: 'Curso Gestão de Agências', plan: 'Mensal', status: 'CANCELADO', progress: 12, amountPaid: 197, source: 'Eduzz', enrolled: 70, lastAccess: 55 },
    { id: 'student-9', name: 'Diego Martins', email: 'diego.martins@empresa.com', phone: '+55 47 98211-5566', product: 'Imersão Escala 7 Dígitos', plan: 'Vitalício', status: 'ATIVO', progress: 54, amountPaid: 5997, source: 'Hotmart', enrolled: 26, lastAccess: 3 },
    { id: 'student-10', name: 'Larissa Costa', email: 'larissa.costa@gmail.com', phone: '+55 71 99388-1122', product: 'Curso Copywriting', plan: 'Anual', status: 'ATIVO', progress: 33, amountPaid: 1297, source: 'Kiwify', enrolled: 44, lastAccess: 2 },
    { id: 'student-11', name: 'Thiago Almeida', email: 'thiago.almeida@gmail.com', phone: '+55 11 98555-8899', product: 'Mentoria Tráfego Pago', plan: 'Trimestral', status: 'CONCLUIDO', progress: 100, amountPaid: 1797, source: 'Hotmart', enrolled: 300, lastAccess: 20 },
    { id: 'student-12', name: 'Beatriz Rocha', email: 'bia.rocha@outlook.com', phone: '+55 19 99277-3311', product: 'Curso Gestão de Agências', plan: 'Anual', status: 'ATIVO', progress: 67, amountPaid: 3997, source: 'Eduzz', enrolled: 95, lastAccess: 1 },
  ]
  for (const s of STUDENTS) {
    const data = {
      tenantId: TENANT_ID,
      name: s.name,
      email: s.email,
      phone: s.phone,
      product: s.product,
      plan: s.plan,
      status: s.status,
      progress: s.progress,
      amountPaid: s.amountPaid,
      source: s.source,
      enrolledAt: daysAgo(s.enrolled),
      lastAccessAt: daysAgo(s.lastAccess),
    }
    await prisma.student.upsert({
      where: { id: s.id },
      update: data,
      create: { id: s.id, ...data },
    })
  }
  console.log(`Alunos semeados: ${STUDENTS.length}.`)

  // ---------- Tráfego Pago (Meta Ads & Google Ads) ----------
  // Conta Meta demo
  const metaAccountData = {
    tenantId: TENANT_ID,
    platform: 'META' as const,
    externalId: 'act_demo_meta_123',
    name: 'Agência Vortex - Meta Ads',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    isActive: true,
    lastSyncAt: daysAgo(0),
  }
  await prisma.adAccount.upsert({
    where: { tenantId_platform_externalId: { tenantId: TENANT_ID, platform: 'META', externalId: 'act_demo_meta_123' } },
    update: metaAccountData,
    create: { id: 'adacc-meta-1', ...metaAccountData },
  })

  // Conta Google demo
  const googleAccountData = {
    tenantId: TENANT_ID,
    platform: 'GOOGLE' as const,
    externalId: '987-654-3210',
    name: 'Agência Vortex - Google Ads',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    isActive: true,
    lastSyncAt: daysAgo(0),
  }
  await prisma.adAccount.upsert({
    where: { tenantId_platform_externalId: { tenantId: TENANT_ID, platform: 'GOOGLE', externalId: '987-654-3210' } },
    update: googleAccountData,
    create: { id: 'adacc-google-1', ...googleAccountData },
  })

  // Campanhas Meta & Google
  const DEMO_CAMPAIGNS = [
    {
      id: 'adcamp-1',
      accountId: 'adacc-meta-1',
      platform: 'META' as const,
      externalId: '23856789001',
      name: 'Black Friday - Curso Marketing Digital',
      status: 'ACTIVE' as const,
      objective: 'OUTCOME_LEADS',
      dailyBudget: 150,
      totalSpend: 3247.5,
      totalImpressions: 185420,
      totalClicks: 4218,
      totalLeads: 89,
      totalConversions: 12,
      totalRevenue: 23964,
    },
    {
      id: 'adcamp-2',
      accountId: 'adacc-meta-1',
      platform: 'META' as const,
      externalId: '23856789002',
      name: 'Remarketing - Mentoria Individual',
      status: 'ACTIVE' as const,
      objective: 'OUTCOME_SALES',
      dailyBudget: 80,
      totalSpend: 1680,
      totalImpressions: 92300,
      totalClicks: 1845,
      totalLeads: 34,
      totalConversions: 5,
      totalRevenue: 12500,
    },
    {
      id: 'adcamp-3',
      accountId: 'adacc-google-1',
      platform: 'GOOGLE' as const,
      externalId: '9876543201',
      name: 'Google Pesquisa - Gestão de Tráfego B2B',
      status: 'ACTIVE' as const,
      objective: 'SEARCH',
      dailyBudget: 120,
      totalSpend: 2450,
      totalImpressions: 48900,
      totalClicks: 2100,
      totalLeads: 42,
      totalConversions: 8,
      totalRevenue: 28000,
    },
    {
      id: 'adcamp-4',
      accountId: 'adacc-google-1',
      platform: 'GOOGLE' as const,
      externalId: '9876543202',
      name: 'Performance Max - Lançamento E-commerce',
      status: 'PAUSED' as const,
      objective: 'PERFORMANCE_MAX',
      dailyBudget: 60,
      totalSpend: 940,
      totalImpressions: 34100,
      totalClicks: 980,
      totalLeads: 15,
      totalConversions: 2,
      totalRevenue: 5000,
    },
  ]

  for (const c of DEMO_CAMPAIGNS) {
    const data = {
      tenantId: TENANT_ID,
      accountId: c.accountId,
      platform: c.platform,
      externalId: c.externalId,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget: c.dailyBudget,
      totalSpend: c.totalSpend,
      totalImpressions: c.totalImpressions,
      totalClicks: c.totalClicks,
      totalLeads: c.totalLeads,
      totalConversions: c.totalConversions,
      totalRevenue: c.totalRevenue,
    }
    await prisma.adCampaign.upsert({ where: { id: c.id }, update: data, create: { id: c.id, ...data } })
  }

  // Métricas diárias demo (últimos 7 dias)
  for (let d = 6; d >= 0; d--) {
    const date = daysAgo(d)
    const id = `adm-meta-${d}`
    const data = {
      tenantId: TENANT_ID,
      campaignId: 'adcamp-1',
      platform: 'META' as const,
      date,
      spend: 140 + (d * 5) % 30,
      impressions: 24000 + (d * 1200),
      clicks: 550 + (d * 30),
      ctr: 2.3,
      cpc: 0.26,
      cpm: 7.8,
      reach: 18000,
      frequency: 1.3,
      leads: 12 + (d % 5),
      conversions: d % 2 === 0 ? 2 : 1,
      costPerResult: 12.5,
    }
    await prisma.adMetricDaily.upsert({ where: { id }, update: data, create: { id, ...data } })
  }

  // Alertas de exemplo
  await prisma.adBudgetAlert.upsert({
    where: { id: 'adalert-1' },
    update: {},
    create: {
      id: 'adalert-1',
      tenantId: TENANT_ID,
      campaignId: 'adcamp-1',
      type: 'BUDGET_80',
      message: '"Black Friday - Curso Marketing Digital" consumiu 87% do orçamento diário',
      severity: 'warning',
      triggeredAt: daysAgo(1),
    },
  })

  await prisma.adBudgetAlert.upsert({
    where: { id: 'adalert-2' },
    update: {},
    create: {
      id: 'adalert-2',
      tenantId: TENANT_ID,
      campaignId: 'adcamp-4',
      type: 'NO_LEADS_24H',
      message: '"Performance Max - Lançamento E-commerce" está pausada sem novos leads nas últimas 24h',
      severity: 'info',
      triggeredAt: daysAgo(0),
    },
  })

  // Seed de Pagamentos (Gateways, Cobranças e Assinaturas)
  const GATEWAY_CONFIGS = [
    {
      id: 'pgw-stripe',
      tenantId: TENANT_ID,
      provider: 'STRIPE' as const,
      displayName: 'Stripe (Sandbox)',
      isActive: true,
      isSandbox: true,
      encApiKey: 'demo_encrypted_stripe_key',
      encSecretKey: 'demo_encrypted_stripe_secret',
      defaultCurrency: 'BRL',
      pixEnabled: true,
      creditEnabled: true,
      boletoEnabled: false,
    },
    {
      id: 'pgw-mp',
      tenantId: TENANT_ID,
      provider: 'MERCADO_PAGO' as const,
      displayName: 'Mercado Pago',
      isActive: true,
      isSandbox: true,
      encAccessToken: 'demo_encrypted_mp_token',
      defaultCurrency: 'BRL',
      pixEnabled: true,
      creditEnabled: true,
      boletoEnabled: true,
    },
  ]

  for (const gw of GATEWAY_CONFIGS) {
    await prisma.paymentGatewayConfig.upsert({
      where: { id: gw.id },
      create: gw,
      update: gw,
    })
  }

  const PAYMENT_ORDERS = [
    {
      id: 'po-1',
      tenantId: TENANT_ID,
      leadId: 'lead-1',
      gatewayConfigId: 'pgw-mp',
      provider: 'MERCADO_PAGO' as const,
      description: 'Mentoria Tráfego Pago — Módulo 1',
      amount: 497.00,
      method: 'PIX' as const,
      status: 'CONFIRMED' as const,
      paidAt: daysAgo(5),
      externalId: 'mp_pay_demo_001',
    },
    {
      id: 'po-2',
      tenantId: TENANT_ID,
      leadId: 'lead-3',
      gatewayConfigId: 'pgw-stripe',
      provider: 'STRIPE' as const,
      description: 'Curso Gestão de Agências',
      amount: 1297.00,
      method: 'CREDIT_CARD' as const,
      status: 'CONFIRMED' as const,
      installments: 6,
      paidAt: daysAgo(3),
      externalId: 'pi_demo_002',
    },
    {
      id: 'po-3',
      tenantId: TENANT_ID,
      leadId: 'lead-5',
      gatewayConfigId: 'pgw-mp',
      provider: 'MERCADO_PAGO' as const,
      description: 'Consultoria SEO',
      amount: 350.00,
      method: 'BOLETO' as const,
      status: 'PENDING' as const,
      expiresAt: new Date(Date.now() + 2 * 86400000),
      externalId: 'mp_pay_demo_003',
    },
    {
      id: 'po-4',
      tenantId: TENANT_ID,
      leadId: 'lead-7',
      gatewayConfigId: 'pgw-stripe',
      provider: 'STRIPE' as const,
      description: 'Imersão Escala 7 Dígitos',
      amount: 2497.00,
      method: 'CREDIT_CARD' as const,
      status: 'FAILED' as const,
      failedAt: daysAgo(1),
      failReason: 'Cartão recusado — saldo insuficiente',
      externalId: 'pi_demo_004',
    },
    {
      id: 'po-5',
      tenantId: TENANT_ID,
      leadId: 'lead-2',
      gatewayConfigId: 'pgw-mp',
      provider: 'MERCADO_PAGO' as const,
      description: 'Pacote Social Media Mensal',
      amount: 890.00,
      method: 'PIX' as const,
      status: 'OVERDUE' as const,
      expiresAt: daysAgo(2),
      externalId: 'mp_pay_demo_005',
    },
  ]

  for (const po of PAYMENT_ORDERS) {
    await prisma.paymentOrder.upsert({
      where: { id: po.id },
      create: po,
      update: po,
    })
  }

  const SUBSCRIPTIONS = [
    {
      id: 'sub-1',
      tenantId: TENANT_ID,
      leadId: 'lead-1',
      gatewayConfigId: 'pgw-stripe',
      provider: 'STRIPE' as const,
      planName: 'Mentoria Premium Mensal',
      amount: 497.00,
      intervalType: 'MONTHLY',
      status: 'ACTIVE' as const,
      totalCollected: 2485.00,
      paymentCount: 5,
      externalId: 'sub_demo_001',
    },
    {
      id: 'sub-2',
      tenantId: TENANT_ID,
      leadId: 'lead-3',
      gatewayConfigId: 'pgw-mp',
      provider: 'MERCADO_PAGO' as const,
      planName: 'Gestão de Tráfego Recorrente',
      amount: 1500.00,
      intervalType: 'MONTHLY',
      status: 'ACTIVE' as const,
      totalCollected: 4500.00,
      paymentCount: 3,
      externalId: 'mp_sub_demo_002',
    },
    {
      id: 'sub-3',
      tenantId: TENANT_ID,
      leadId: 'lead-8',
      gatewayConfigId: 'pgw-stripe',
      provider: 'STRIPE' as const,
      planName: 'Plano Anual Copywriting',
      amount: 3997.00,
      intervalType: 'YEARLY',
      status: 'PAST_DUE' as const,
      totalCollected: 3997.00,
      paymentCount: 1,
      failedPayments: 2,
      externalId: 'sub_demo_003',
    },
    {
      id: 'sub-4',
      tenantId: TENANT_ID,
      leadId: 'lead-6',
      gatewayConfigId: 'pgw-mp',
      provider: 'MERCADO_PAGO' as const,
      planName: 'Acompanhamento Semanal',
      amount: 150.00,
      intervalType: 'WEEKLY',
      status: 'CANCELLED' as const,
      cancelledAt: daysAgo(10),
      cancelReason: 'Pedido do cliente',
      totalCollected: 600.00,
      paymentCount: 4,
      externalId: 'mp_sub_demo_004',
    },
  ]

  for (const sub of SUBSCRIPTIONS) {
    await prisma.subscription.upsert({
      where: { id: sub.id },
      create: sub,
      update: sub,
    })
  }

  console.log('Pagamentos semeados com sucesso.')
  console.log('Seed concluído com sucesso.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
