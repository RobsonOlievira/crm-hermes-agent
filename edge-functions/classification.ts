// classification.ts — Lógica central de classificação automática de leads (CRM Hermes).
//
// Aplica os tipos de lead em LeadLeadType a partir de:
//   - formulário do Gestor de Cursos (inscrito_canal_youtube / aluno)
//   - plano/curso do estudante (aluno_meu_primeiro_app, aluno_antigravity_pro,
//     aluno_hermes_agent, aluno_formacao_app_ia)
//   - status ativo/inativo (aluno vs interessados_no_curso)
//
// É idempotente e reconciliatória APENAS sobre o conjunto de tipos gerenciados
// (AUTO_LEAD_KEYS). Tipos atribuídos manualmente ou por outras regras não são
// removidos.

export const AUTO_LEAD_KEYS: string[] = [
  "inscrito_canal_youtube",
  "aluno",
  "interessados_no_curso",
  "aluno_meu_primeiro_app",
  "aluno_antigravity_pro",
  "aluno_hermes_agent",
  "aluno_formacao_app_ia",
]

const COURSE_MAP: Array<{ key: string; test: (plan: string) => boolean }> = [
  { key: "aluno_meu_primeiro_app", test: (p) => p.startsWith("low_ticket_maia") },
  { key: "aluno_antigravity_pro", test: (p) => p === "antigravity" },
  { key: "aluno_hermes_agent", test: (p) => p === "hermes_agent" },
  { key: "aluno_formacao_app_ia", test: (p) => p === "mestre_aplicativos_ia" },
]

export interface ClassificationInput {
  email?: string | null
  name?: string | null
  formulario?: string | null
  plan?: string | null
  product?: string | null
  status?: string | null
  expiresAt?: string | null
  // Quando true (student presente), o status/expiração controlam aluno vs inativo.
  hasStudentData?: boolean
}

export function isInactive(input: ClassificationInput): boolean {
  const status = (input.status ?? "").toString().toLowerCase()
  if (
    status === "inativo" ||
    status === "cancelado" ||
    status === "expired" ||
    status === "inactive" ||
    status === "revogado"
  ) {
    return true
  }
  if (input.expiresAt) {
    const e = new Date(input.expiresAt).getTime()
    if (!Number.isNaN(e) && e < Date.now()) return true
  }
  return false
}

export function normStr(v: string | null | undefined): string {
  return (v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

export function computeTargetKeys(input: ClassificationInput): Set<string> {
  const keys = new Set<string>()
  const f = normStr(input.formulario)

  if (f.includes("comunidade-olha-o-foguete") || f.includes("olha o foguete") || f.includes("skills antigravity")) {
    keys.add("inscrito_canal_youtube")
  }

  const plan = normStr(input.plan ?? input.product)
  if (plan) {
    for (const rule of COURSE_MAP) {
      if (rule.test(plan)) keys.add(rule.key)
    }
  }

  const hasStudentData = Boolean(input.hasStudentData || input.plan || input.status || input.expiresAt)
  if (hasStudentData) {
    if (isInactive(input)) {
      keys.add("interessados_no_curso")
      keys.delete("aluno")
    } else {
      keys.add("aluno")
    }
  } else if (f === "tesseract-pagante") {
    keys.add("aluno")
  }

  return keys
}

async function findOrCreateLead(
  sb: any,
  tenantId: string,
  input: ClassificationInput,
): Promise<{ id: string } | null> {
  const email = (input.email ?? "").toLowerCase()
  const { data: lead } = await sb
    .from("Lead")
    .select("id")
    .eq("tenantId", tenantId)
    .eq("email", email)
    .maybeSingle()

  if (lead?.id) return { id: lead.id }

  // Criação best-effort (apenas quando a classificação roda a partir de um student
  // válido, ex.: sync-student) para garantir que o lead existe e aparece na lista.
  if (!email || !input.name) return null
  const now = new Date().toISOString()
  const { data: inserted, error } = await sb.from("Lead").insert({
    id: crypto.randomUUID(),
    tenantId,
    name: input.name,
    email,
    phone: "",
    companyName: null,
    status: "PRIMEIRO_CONTATO",
    source: "IMPORT",
    score: 0,
    tags: [],
    dealValue: null,
    stagePosition: 0,
    firstContactAt: now,
    totalPurchased: 0,
    unreadCount: 0,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }).select("id").single()
  if (error || !inserted) return null
  return { id: inserted.id }
}

export async function applyLeadClassification(
  sb: any,
  tenantId: string,
  input: ClassificationInput,
  opts: { ensureLead?: boolean } = {},
): Promise<{ applied: boolean; reason?: string; added?: number; removed?: number; target?: string[] }> {
  const email = ((input.email ?? "").toLowerCase() || "").trim()
  if (!email) return { applied: false, reason: "no_email" }

  // Preserva formulario informado no Lead sempre que vier no input.
  if (input.formulario) {
    await sb
      .from("Lead")
      .update({ formulario: input.formulario })
      .eq("tenantId", tenantId)
      .eq("email", email)
  }

  const lead = await findOrCreateLead(sb, tenantId, input)
  if (!lead) return { applied: false, reason: "no_lead" }

  const { data: types }: { data: Array<{ id: string; key: string }> | null } = await sb
    .from("LeadType")
    .select("id,key")
    .eq("tenantId", tenantId)

  const byKey = new Map<string, string>()
  for (const t of types ?? []) byKey.set((t.key ?? "").toLowerCase(), t.id)

  const target = computeTargetKeys(input)
  const targetIds = [...target].map((k) => byKey.get(k)).filter(Boolean) as string[]
  const autoIds = AUTO_LEAD_KEYS.map((k) => byKey.get(k)).filter(Boolean) as string[]

  const { data: current }: { data: Array<{ leadTypeId: string }> | null } = await sb
    .from("LeadLeadType")
    .select("leadTypeId")
    .eq("leadId", lead.id)

  const currentIds = new Set<string>((current ?? []).map((r) => r.leadTypeId).filter(Boolean))
  const currentSet = new Set<string>(currentIds)
  const autoSet = new Set<string>(autoIds)

  const toRemove = [...currentSet].filter((id) => autoSet.has(id) && !targetIds.includes(id))
  const toAdd = targetIds.filter((id) => !currentSet.has(id))

  if (toRemove.length) {
    await sb.from("LeadLeadType").delete().eq("leadId", lead.id).in("leadTypeId", toRemove)
  }
  if (toAdd.length) {
    const rows = toAdd.map((leadTypeId) => ({ leadId: lead.id, leadTypeId }))
    await sb.from("LeadLeadType").insert(rows)
  }

  return { applied: true, added: toAdd.length, removed: toRemove.length, target: [...target] }
}
