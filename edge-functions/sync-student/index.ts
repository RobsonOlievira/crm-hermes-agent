import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { applyLeadClassification } from "./classification.ts"

// sync-student — Ponte Gestor de Cursos (Tesseract) → CRM Hermes (Student).
//
// Recebe o envelope enviado pela trigger em public.leads do banco Gestor (via
// pg_net) ou pela função de reconciliação sync-students-crm e faz upsert de um
// aluno na tabela "Student" do CRM. Dedup por e-mail dentro do tenant.
//
// Além do upsert, aplica a classificação automática de LeadLeadType no lead
// correspondente (por e-mail): aluno vs interessados_no_curso conforme
// status/expiração, e os tipos de curso a partir de plan/product.
//
// Campos aceitos: email*, name, whatsapp/phone, source, status, amountPaid,
// expiresAt, product, plan, enrolledAt, leadId. Regra de matrícula: quando
// enviada, o enrolledAt só é atualizado se for mais antigo que o atual.
//
// Secrets (Dashboard → Edge Functions → sync-student → Secrets):
//   CRM_SYNC_SECRET   (obrigatório — token do header `x-webhook-secret`)
//   DEFAULT_TENANT_ID (opcional — tenant usado quando o payload não envia)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const SYNC_SECRET = Deno.env.get("CRM_SYNC_SECRET") ?? "hmr_eb7d32c05f1ce85e64bc40da0b7a221a82478d1dee11c3f3"
const DEFAULT_TENANT_ID = Deno.env.get("DEFAULT_TENANT_ID") ?? "a2faa3b0-d158-484b-8842-cfc1898d5af3"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function first(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim()
  }
  return null
}

function normPhone(v: unknown): string | null {
  const s = v === null || v === undefined ? "" : String(v)
  const digits = s.replace(/[^\d+]/g, "")
  return digits ? digits : null
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function toISO(v: unknown): string | null {
  const s = first(v)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS_HEADERS })
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405)

  const url = new URL(req.url)
  const secret = req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret") ?? ""
  if (!safeEqual(secret, SYNC_SECRET)) return json({ ok: false, error: "unauthorized" }, 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400)
  }
  const payload = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>

  const email = first(payload.email, payload.Email)
  if (!email) return json({ ok: false, error: "missing_email" }, 400)

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "not_configured", detail: "SUPABASE_SERVICE_ROLE_KEY não definido" }, 503)
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const tenantId = first(payload.tenantId, payload.tenant_id) ?? DEFAULT_TENANT_ID
  const name = first(payload.name, payload.nome) ?? email.split("@")[0]
  const phone = normPhone(payload.whatsapp ?? payload.telefone ?? payload.phone)
  const source = first(payload.source, payload.formulario, "tesseract")
  const leadId = first(payload.leadId, payload.lead_id)
  const status = first(payload.status)
  const amountPaid = num(payload.amountPaid ?? payload.valor_pago)
  const expiresAt = toISO(payload.expiresAt ?? payload.data_expiracao)
  const product = first(payload.product, payload.produto)
  const plan = first(payload.plan, payload.course_id)
  const enrolledAt = toISO(payload.enrolledAt ?? payload.created_at)
  const now = new Date().toISOString()

  const normalizedEmail = email.toLowerCase()
  const classificationInput = {
    email: normalizedEmail,
    name,
    plan,
    product,
    status,
    expiresAt,
    hasStudentData: true,
  }

  const { data: existing } = await sb.from("Student")
    .select("id, name, email, phone, source, enrolledAt, status, amountPaid")
    .eq("tenantId", tenantId)
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (existing) {
    const patch: Record<string, unknown> = { updatedAt: now }
    if (name && name !== existing.name) patch.name = name
    if (phone) patch.phone = phone
    if (!existing.source && source) patch.source = source
    if (status) patch.status = status
    if (amountPaid !== null) patch.amountPaid = amountPaid
    if (expiresAt) patch.expiresAt = expiresAt
    if (product) patch.product = product
    if (plan) patch.plan = plan
    if (enrolledAt) {
      const cur = existing.enrolledAt ? new Date(existing.enrolledAt).getTime() : null
      const next = new Date(enrolledAt).getTime()
      if (cur === null || next < cur) patch.enrolledAt = new Date(enrolledAt).toISOString()
    }
    if (Object.keys(patch).length > 1) {
      const { error } = await sb.from("Student").update(patch).eq("id", existing.id)
      if (error) return json({ ok: false, error: "update_failed", detail: error.message }, 500)
    }
    await applyLeadClassification(sb, tenantId, classificationInput, { ensureLead: true })
    return json({ ok: true, action: "updated", studentId: existing.id })
  }

  const { data: inserted, error } = await sb.from("Student").insert({
    id: leadId ?? crypto.randomUUID(),
    tenantId,
    name,
    email: normalizedEmail,
    phone,
    source,
    status: status ?? "ATIVO",
    progress: 0,
    amountPaid: amountPaid ?? 0,
    product: product ?? null,
    plan: plan ?? null,
    enrolledAt: enrolledAt ?? now,
    expiresAt: expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  }).select("id").single()

  if (error) {
    if (error.code === "23505") {
      const { error: updateErr } = await sb.from("Student")
        .update({
          name,
          phone: phone ?? undefined,
          status: status ?? "ATIVO",
          amountPaid: amountPaid ?? 0,
          product: product ?? undefined,
          plan: plan ?? undefined,
          expiresAt: expiresAt ?? undefined,
          updatedAt: now,
        })
        .eq("tenantId", tenantId).eq("email", normalizedEmail)
      if (updateErr) return json({ ok: false, error: "update_failed", detail: updateErr.message }, 500)
      await applyLeadClassification(sb, tenantId, classificationInput, { ensureLead: true })
      return json({ ok: true, action: "existing_updated", email: normalizedEmail })
    }
    return json({ ok: false, error: "insert_failed", detail: error.message }, 500)
  }

  await applyLeadClassification(sb, tenantId, classificationInput, { ensureLead: true })
  return json({ ok: true, action: "created", studentId: inserted.id })
})
