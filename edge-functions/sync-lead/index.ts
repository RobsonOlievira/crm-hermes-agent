import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { applyLeadClassification } from "./classification.ts"

// sync-lead — Ponte Gestor de Cursos (fogueteiros → public.leads) → CRM (Lead).
//
// Recebe o envelope despachado pelo trigger em public.leads do banco Gestor e
// faz upsert de um lead na tabela "Lead" do CRM. Dedup por e-mail dentro do
// tenant; registros criados antes ficam preservados (só preenche lacunas).
//
// Além do upsert, aplica a classificação automática de LeadLeadType conforme o
// formulário (inscrito_canal_youtube / aluno).
//
// Campos aceitos: email*, name, whatsapp/phone, formulario, leadId,
// createdAt, status, companyName. Mapeia formulario → source do CRM.

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

function normPhone(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v)
  return s.replace(/[^\d+]/g, "")
}

function sourceFromFormulario(formulario: string | null): string {
  const f = (formulario ?? "").toLowerCase()
  if (f === "tesseract-pagante") return "IMPORT"
  if (f === "comunidade-olha-o-foguete") return "ORGANICO"
  if (f.startsWith("formulário") || f.startsWith("formulario")) return "LANDING_PAGE"
  if (f.includes("comunidade")) return "ORGANICO"
  return "IMPORT"
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
  const whatsapp = normPhone(payload.whatsapp ?? payload.telefone ?? payload.phone)
  if (!email && !whatsapp) return json({ ok: false, error: "missing_email_and_phone" }, 400)

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "not_configured", detail: "SUPABASE_SERVICE_ROLE_KEY não definido" }, 503)
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const tenantId = first(payload.tenantId, payload.tenant_id) ?? DEFAULT_TENANT_ID
  const name = first(payload.name, payload.nome)
  const formulario = first(payload.formulario)
  const leadId = first(payload.leadId, payload.lead_id)
  const companyName = first(payload.companyName, payload.company_name)
  const status = first(payload.status)
  const createdAt = toISO(payload.createdAt ?? payload.created_at)
  const now = new Date().toISOString()
  const source = sourceFromFormulario(formulario)

  const classificationInput = {
    email: email ?? undefined,
    name,
    formulario,
  }

  let query = sb.from("Lead").select("id, name, email, phone, source, firstContactAt, createdAt").eq("tenantId", tenantId)
  if (email) query = query.eq("email", email.toLowerCase()).maybeSingle()
  else query = query.eq("phone", whatsapp).maybeSingle()
  const { data: existing } = await query

  if (existing) {
    const patch: Record<string, unknown> = { updatedAt: now }
    if (name) patch.name = name
    if (whatsapp) patch.phone = whatsapp
    if (companyName) patch.companyName = companyName
    if (existing.source === "MANUAL" && source) patch.source = source
    if (status) patch.status = status
    const { error } = await sb.from("Lead").update(patch).eq("id", existing.id)
    if (error) return json({ ok: false, error: "update_failed", detail: error.message }, 500)
    if (email) {
      await applyLeadClassification(sb, tenantId, classificationInput)
    }
    return json({ ok: true, action: "updated", leadId: existing.id })
  }

  const { data: inserted, error } = await sb.from("Lead").insert({
    id: leadId ?? crypto.randomUUID(),
    tenantId,
    name: name ?? (email ?? whatsapp),
    email: email ? email.toLowerCase() : null,
    phone: whatsapp,
    companyName: companyName ?? null,
    status: status ?? "PRIMEIRO_CONTATO",
    source,
    formulario: formulario ?? null,
    score: 0,
    tags: [],
    dealValue: null,
    stagePosition: 0,
    firstContactAt: createdAt ?? now,
    totalPurchased: 0,
    unreadCount: 0,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }).select("id").single()

  if (error) {
    if (error.code === "23505") {
      const { error: updateErr } = await sb.from("Lead")
        .update({ name: name ?? undefined, phone: whatsapp || undefined, source, updatedAt: now })
        .eq("tenantId", tenantId)
        .eq("email", email ? email.toLowerCase() : "")
      if (updateErr) return json({ ok: false, error: "update_failed", detail: updateErr.message }, 500)
      if (email) {
        await applyLeadClassification(sb, tenantId, classificationInput)
      }
      return json({ ok: true, action: "existing_updated", email: email ?? "" })
    }
    return json({ ok: false, error: "insert_failed", detail: error.message }, 500)
  }

  if (email) {
    await applyLeadClassification(sb, tenantId, classificationInput)
  }
  return json({ ok: true, action: "created", leadId: inserted.id })
})
