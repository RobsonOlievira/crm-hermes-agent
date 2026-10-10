export interface NavItem {
  key: string // module key or special
  label: string
  href: string
  icon: string // lucide icon name
  moduleKey?: string // if set, only shows when module active
  permission?: string // if set, only shows when viewRole has permission
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', moduleKey: 'dashboard' },
      { key: 'leads', label: 'Leads', href: '/leads', icon: 'Users', moduleKey: 'leads' },
      { key: 'kanban', label: 'Pipeline', href: '/pipeline', icon: 'KanbanSquare', moduleKey: 'kanban' },
      { key: 'clients', label: 'Clientes', href: '/clients', icon: 'Building2', moduleKey: 'clients' },
      { key: 'projects', label: 'Projetos', href: '/projects', icon: 'Briefcase', permission: 'dashboard:full' },
      { key: 'students', label: 'Alunos', href: '/students', icon: 'GraduationCap', permission: 'settings:modules' },
      { key: 'interactions', label: 'Interações', href: '/interactions', icon: 'Activity', moduleKey: 'interactions' },
      { key: 'catalog', label: 'Catálogo', href: '/catalog', icon: 'Package', moduleKey: 'catalog' },
    ],
  },
  {
    title: 'Módulos',
    items: [
      { key: 'whatsapp', label: 'WhatsApp Bot', href: '/whatsapp', icon: 'MessageCircle', moduleKey: 'whatsapp' },
      { key: 'whatsapp_broadcast', label: 'Disparo Promoções', href: '/whatsapp/promotions', icon: 'Megaphone', moduleKey: 'whatsapp' },
      { key: 'calendar', label: 'Agenda', href: '/calendar', icon: 'CalendarDays', moduleKey: 'calendar' },
      { key: 'cashflow', label: 'Fluxo de Caixa', href: '/cashflow', icon: 'Wallet', permission: 'dashboard:full' },
      { key: 'payments', label: 'Pagamentos', href: '/payments', icon: 'CreditCard', moduleKey: 'payments' },
      { key: 'contracts', label: 'Contratos', href: '/contracts', icon: 'FileText', moduleKey: 'contracts' },
      { key: 'ads_tracker', label: 'Tráfego Pago', href: '/ads', icon: 'Megaphone', moduleKey: 'ads_tracker' },
      { key: 'prospecting', label: 'Prospecção AI', href: '/prospecting', icon: 'Target', moduleKey: 'prospecting' },
      { key: 'automations', label: 'Automações', href: '/automations', icon: 'Workflow', moduleKey: 'automations' },
      { key: 'email_marketing', label: 'Email Marketing', href: '/email-marketing', icon: 'Mail', moduleKey: 'email_marketing' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { key: 'team', label: 'Equipe', href: '/team', icon: 'UserCog', moduleKey: 'team', permission: 'settings:team' },
      { key: 'lead-types', label: 'Tipos de Lead', href: '/settings/lead-types', icon: 'Tags', permission: 'settings:modules' },
      { key: 'classification', label: 'Classificação Automática', href: '/settings/classification', icon: 'Wand2', permission: 'settings:modules' },
      { key: 'modules', label: 'Módulos', href: '/settings/modules', icon: 'Blocks', permission: 'settings:modules' },
      { key: 'contract-templates', label: 'Modelos de Contratos', href: '/settings/contract-templates', icon: 'FileText', permission: 'settings:modules', moduleKey: 'contracts' },
      { key: 'company-data', label: 'Dados da Empresa', href: '/settings/company', icon: 'Building', permission: 'settings:branding' },
      { key: 'mcp', label: 'Integração IA (MCP)', href: '/settings/mcp', icon: 'Bot', permission: 'settings:modules' },
      { key: 'email-settings', label: 'Email (envio)', href: '/settings/email', icon: 'Mail', permission: 'settings:modules' },
      { key: 'branding', label: 'Marca (Branding)', href: '/settings/branding', icon: 'Palette', permission: 'settings:branding' },
    ],
  },
]

export const PLACEHOLDER_MODULES: Record<string, { title: string; description: string; icon: string }> = {
  whatsapp: { title: 'WhatsApp Bot', description: 'Atendimento automatizado 24/7 via Meta API e Evolution, com histórico vinculado ao lead.', icon: 'MessageCircle' },
  calendar: { title: 'Agenda / Calendário', description: 'Agende reuniões e follow-ups sincronizados com o pipeline.', icon: 'CalendarDays' },
  payments: { title: 'Pagamentos', description: 'Cobranças e assinaturas via Stripe, Mercado Pago e Asaas com confirmação automática.', icon: 'CreditCard' },
  contracts: { title: 'Gerador de Contratos', description: 'Templates com variáveis dinâmicas e assinatura eletrônica.', icon: 'FileText' },
  ads_tracker: { title: 'Tráfego Pago', description: 'Conecte Meta e Google Ads, acompanhe CPL, ROI e atribua leads às campanhas.', icon: 'Megaphone' },
  prospecting: { title: 'Prospecção AI', description: 'Busca ativa de prospects B2B por nicho e cidade alimentado pelo motor AIsa com análise de IA.', icon: 'Target' },
  automations: { title: 'Automações / Workflows', description: 'Regras no formato gatilho, condição e ação para automatizar o funil.', icon: 'Workflow' },
  email_marketing: { title: 'Email Marketing', description: 'Criação e envio de campanhas de email em massa com templates e segmentação.', icon: 'Mail' },
}
