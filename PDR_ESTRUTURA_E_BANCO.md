# 📘 PDR - Especificação Técnica e Guia do CRM Whitelabel

> **Product Data Record (PDR)** — Documento oficial de arquitetura, estrutura de pastas, instalação e esquema do Banco de Dados para replicação e implantação do CRM.

---

## 1. 🎯 Visão Geral do CRM
Este projeto é um **CRM Whitelabel Multitenant** completo e independente. Ele permite gerenciar leads, clientes, funil de vendas (Kanban), automações de mensagens (WhatsApp e Email), controle financeiro, agendamentos e propostas comerciais.

### Stack Tecnológica:
- **Frontend / Backend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Estilização**: Tailwind CSS + Radix UI + Lucide Icons
- **Banco de Dados**: PostgreSQL (gerenciado via Prisma ORM)
- **Autenticação**: NextAuth.js (Session JWT)

---

## 2. 📂 Estrutura Completa de Pastas e Arquivos

Aqui está como o projeto está organizado de forma simples e direta:

```text
CRM_Clean_Whitelabel/
├── app/                        # Páginas e Rotas de API (Next.js App Router)
│   ├── (dashboard)/            # Telas internas do CRM (Leads, Clientes, Financeiro, Kanban, etc.)
│   ├── api/                    # APIs de integração (WhatsApp, Stripe, Email, Autenticação)
│   ├── login/                  # Tela de Login e Acesso
│   ├── layout.tsx              # Estrutura principal da aplicação
│   └── page.tsx                # Página inicial/Redirecionamento
├── components/                 # Componentes Visuais Reutilizáveis
│   ├── ui/                     # Botões, Modais, Tabelas, Cards, Inputs
│   ├── leads/                  # Componentes específicos de gestão de Leads
│   ├── clients/                # Componentes de Clientes e CNPJs
│   ├── kanban/                 # Quadro visual de vendas por etapas
│   ├── finance/                # Painéis e relatórios de fluxo de caixa
│   └── whatsapp/               # Central de Conversas estilo WhatsApp
├── hooks/                      # Funções Utilitárias e Reativas (Custom Hooks)
├── lib/                        # Configurações centrais (Prisma client, Auth, Utils)
├── prisma/                     # Arquivos do Banco de Dados
│   └── schema.prisma           # DEFINIÇÃO DE TODAS AS TABELAS DO BANCO (Prisma Schema)
├── public/                     # Imagens estáticas, logos e ícones
├── scripts/                    # Scripts auxiliares
│   └── seed.ts                 # Script para popular o banco de dados inicial (dados demo)
├── .env.example                # Modelo de variáveis de ambiente
├── .env                        # Arquivo de configuração local (DATABASE_URL, etc.)
├── package.json                # Lista de bibliotecas e dependências do projeto
├── tailwind.config.ts          # Configuração visual e cores do tema
├── tsconfig.json               # Configurações do TypeScript
└── PDR_ESTRUTURA_E_BANCO.md    # Este documento de instrução
```

---

## 3. 🚀 Passo a Passo de Instalação e Execução

Qualquer novo usuário pode colocar este CRM para rodar em poucos minutos seguindo estas etapas:

### Passo 1: Instalar as Dependências
Abra o terminal na pasta do projeto e execute:
```bash
npm install
```
*(ou `yarn install` se preferir utilizar o Yarn)*

### Passo 2: Configurar o Arquivo `.env`
Duplique o arquivo `.env.example` e renomeie para `.env`. Preencha a URL do seu banco de dados PostgreSQL:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/crm_whitelabel"
NEXTAUTH_SECRET="sua_chave_secreta_aqui"
NEXTAUTH_URL="http://localhost:3000"
```

> **Dica**: Você pode usar serviços de banco de dados PostgreSQL gratuitos na nuvem como **Neon.tech**, **Supabase** ou **Railway**.

### Passo 3: Criar as Tabelas no Banco de Dados
Para criar todas as tabelas automaticamente no seu banco de dados PostgreSQL, execute:
```bash
npx prisma db push
```
*(Este comando lê o arquivo `prisma/schema.prisma` e cria todas as 50 tabelas estruturadas no PostgreSQL de forma 100% automática)*

### Passo 4: Popular Dados Iniciais (Opcional)
Para criar uma empresa inicial de teste e um usuário administrador:
```bash
npx prisma db seed
```
- **Login Inicial**: `admin@vortex.com.br`
- **Senha Inicial**: `demo1234`

### Passo 5: Rodar o Aplicativo
```bash
npm run dev
```
Acesse no navegador: `http://localhost:3000`

---

## 4. 🗄️ Estrutura e Explicação do Banco de Dados (Tabelas)

O banco de dados do CRM é estruturado em **Módulos Conectados**. Abaixo está a explicação simples de todas as tabelas criadas pelo Prisma no PostgreSQL:

### 🏢 A. Estrutura Principal (Empresa e Acessos)
1. **`Tenant` (Organização/Empresa)**: Guarda as informações da empresa que usa o CRM (nome, cores da marca, CNPJ, dados de contato e chaves de API). Suporta modelo Whitelabel (multi-empresa).
2. **`User` (Usuários)**: Cadastros de colaboradores e administradores que acessam o CRM (email, senha criptografada, nome, foto, nível de acesso: ADMIN, MANAGER, MEMBER).
3. **`Module` (Módulos)**: Controla quais funcionalidades do CRM estão ativas para cada empresa (Kanban, WhatsApp, Financeiro, Email, etc.).

---

### 🎯 B. Gestão de Vendas, Leads e Clientes
4. **`Lead` (Leads/Oportunidades)**: Registra todos os contatos que entram no CRM (nome, telefone, email, canal de origem, valor negociado, score, etapa do funil e responsável).
5. **`LeadType` (Tipos de Lead)**: Categorias personalizáveis (ex.: Aluno, Cliente B2B, Parceiro, Fornecedor).
6. **`LeadLeadType` (Vínculo Lead-Tipo)**: Permite que um mesmo contato pertença a múltiplos tipos ao mesmo tempo.
7. **`Client` (Clientes Convertidos)**: Cadastro completo de clientes com dados de faturamento, CNPJ e valor total histórico (LTV).
8. **`ClientLeadType` (Vínculo Cliente-Tipo)**: Relaciona o cliente às suas categorias.

---

### 📊 C. Funil de Vendas (Kanban)
9. **`Pipeline` (Funis de Venda)**: Define os fluxos de venda da empresa (ex.: Funil Comercial Padrão).
10. **`Stage` (Etapas do Funil)**: Colunas visuais do Kanban (ex.: Primeiro Contato, Conversa Ativa, Reunião Agendada, Proposta Enviada, Serviço Fechado).

---

### 📦 D. Catálogo de Produtos e Regras Automáticas
11. **`CatalogItem` (Produtos e Serviços)**: Catálogo do que a empresa vende (nome, preço, descrição, tipo: Produto ou Serviço).
12. **`CatalogItemLeadType` (Alvo do Produto)**: Associa produtos/serviços aos tipos de lead ideais.
13. **`ClassificationRule` (Regras de Classificação AI/Palavras-chave)**: Regras que analisam o texto recebido do lead e o classificam automaticamente (ex.: se falar "orçamento", atribui ao produto X).
14. **`ClassificationRuleLeadType` & `ClassificationRuleCatalogItem`**: Tabelas auxiliares de ligação para regras de classificação.

---

### ⚙️ E. Automação da Jornada & Atendimento
15. **`JourneyAutomation` (Fluxos Automáticos)**: Define ações automáticas quando o lead muda de etapa ou fica sem resposta por X horas (ex.: enviar follow-up automático).
16. **`Interaction` (Histórico do Lead)**: Linha do tempo com todas as ações ocorridas com o contato (chamadas, reuniões, envio de contrato, pagamentos).
17. **`CalendarEvent` (Agenda/Calendário)**: Compromissos, reuniões e lembretes vinculados a leads ou clientes.
18. **`Message` (Central de Conversas WhatsApp)**: Armazena o histórico de mensagens trocadas via WhatsApp (texto, áudios, imagens, mensagens do robô/IA).

---

### 💰 F. Módulo Financeiro & Projetos
19. **`Project` (Projetos)**: Projetos em andamento com clientes (datas, valor total, status de entrega, comissão de indicação).
20. **`ProjectInstallment` (Parcelas do Projeto)**: Parcelamento das vendas (valor, data de vencimento, status pago/pendente).
21. **`ProjectCredential` (Acessos do Projeto)**: Guarda credenciais de serviços/senhas dos projetos de forma organizada.
22. **`Purchase` (Compras Realizadas)**: Registro individual de compras efetuadas por um lead.
23. **`MonthlyCashFlow` (Fluxo de Caixa Mensal)**: Resumo consolidado do mês financeiro.
24. **`CashFlowExpense` (Despesas)**: Gastos da empresa no mês (fixos e variáveis).
25. **`CashFlowExtraRevenue` (Receitas Extras)**: Entradas avulsas fora de projetos.
26. **`BankAccount` (Contas Bancárias)**: Saldos e contas cadastradas da empresa.
27. **`TenantDefaultExpense` (Despesas Padrão)**: Despesas recorrentes configuradas da empresa.
28. **`Invoice` (Notas Fiscais)**: Registro de emissão de notas fiscais.
29. **`CashFlowTransaction` (Extrato de Transações)**: Lançamentos detalhados de entradas e saídas de dinheiro.

---

### 💳 G. Gateway de Pagamentos Online
30. **`PaymentGatewayConfig` (Configurações de Gateway)**: Chaves de API das plataformas de pagamento (Stripe, Mercado Pago, Asaas).
31. **`PaymentOrder` (Cobranças/Links de Pagamento)**: Pedidos de cobrança gerados com PIX, Cartão ou Boleto.
32. **`Subscription` (Assinaturas Recorrentes)**: Planos recorrentes de clientes.
33. **`PaymentWebhookLog` (Logs de Pagamento)**: Histórico de confirmações recebidas dos meios de pagamento.

---

### ✉️ H. Email Marketing e Caixa de Entrada
34. **`EmailTemplate` (Modelos de Email)**: Templates visualmente formatados com variáveis (ex.: `{{nome}}`).
35. **`EmailCampaign` (Campanhas em Massa)**: Disparos de email agendados ou enviados.
36. **`EmailRecipient` (Destinatários)**: Rastreio individual de entregas, aberturas e cliques nos emails.
37. **`EmailAccount` (Caixas Conectadas)**: Conexão de e-mails corporativos (Gmail, Outlook, IMAP).
38. **`EmailMessage` (Emails 1:1)**: Mensagens trocadas individualmente com contatos.

---

### 📜 I. Contratos e Propostas Comerciais
39. **`ContractTemplate` (Modelos de Contrato)**: Minutas de contratos jurídicos reutilizáveis.
40. **`Contract` (Contratos Gerados)**: Contrato assinado ou pendente com histórico de auditoria.
41. **`ContractService` (Serviços do Contrato)**: Itens inclusos no contrato.
42. **`ContractSignature` (Assinaturas Digitais)**: Registro com IP, data e documento dos assinantes.
43. **`Proposal` (Propostas Comerciais)**: Propostas em PDF/JSON criadas para clientes.

---

### 📈 J. Anúncios & Tráfego Pago
44. **`AdAccount` (Contas de Anúncios)**: Conexão com Meta Ads ou Google Ads.
45. **`AdCampaign` (Campanhas de Anúncio)**: Métricas de orçamento, gasto total e leads gerados.
46. **`AdSet` (Conjuntos de Anúncio)**: Segmentação das campanhas.
47. **`AdMetricDaily` (Métricas Diárias)**: ROI, CPC, CPL e impressões por dia.
48. **`AdBudgetAlert` (Alertas de Orçamento)**: Lembretes de estouro de orçamento em anúncios.
49. **`WaTemplate` & `WaBroadcast` (Disparos em Massa WhatsApp)**: Templates de mensagens oficiais e transmissões via WhatsApp Meta.
50. **`Student` (Base de Alunos/Assinantes)**: Gestão de inscritos em mentorias e cursos.

---

## 🛠️ Resumo de Comandos Rápidos

| Comando | Descrição |
| :--- | :--- |
| `npm install` | Instala todas as bibliotecas necessárias |
| `npx prisma db push` | Cria todas as tabelas no banco de dados automaticamente |
| `npx prisma db seed` | Cria os dados de demonstração (usuário admin inicial) |
| `npm run dev` | Inicia o sistema em modo de desenvolvimento |
| `npm run build` | Gera a versão final compilada para produção |
