// Discover Rapa Nui — Edge Function: submit-lead
// Recibe el formulario de contacto público, valida, filtra spam,
// guarda el lead en la base de datos y notifica al equipo por email (Resend).
//
// Deploy: supabase functions deploy submit-lead --no-verify-jwt
// Secrets requeridos (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Supabase los inyecta automático)
//   RESEND_API_KEY, NOTIFY_EMAIL_TO, NOTIFY_EMAIL_FROM

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVENT_TYPES = new Set([
  "Boda / Ceremonia",
  "Elopement",
  "Renovación de votos",
  "Tour / Experiencia",
  "Hospedaje",
  "Otro",
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  // Honeypot: campo oculto que un humano nunca completa. Si viene con
  // contenido, se descarta silenciosamente (200 OK falso para no delatar el filtro a bots).
  if (typeof payload.website === "string" && payload.website.trim() !== "") {
    return jsonResponse({ ok: true });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const country = typeof payload.country === "string" ? payload.country.trim() : "";
  const eventType = typeof payload.event_type === "string" ? payload.event_type.trim() : "";
  const guestCountRaw = payload.guest_count;
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!name || name.length > 200) {
    return jsonResponse({ error: "invalid_name" }, 400);
  }
  if (!email || !isValidEmail(email) || email.length > 254) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }
  if (eventType && !EVENT_TYPES.has(eventType)) {
    return jsonResponse({ error: "invalid_event_type" }, 400);
  }
  if (message.length > 5000) {
    return jsonResponse({ error: "message_too_long" }, 400);
  }

  let guestCount: number | null = null;
  if (guestCountRaw !== undefined && guestCountRaw !== null && guestCountRaw !== "") {
    const n = Number(guestCountRaw);
    if (!Number.isFinite(n) || n < 0 || n > 5000) {
      return jsonResponse({ error: "invalid_guest_count" }, 400);
    }
    guestCount = Math.trunc(n);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      name,
      email,
      country: country || null,
      event_type: eventType || null,
      guest_count: guestCount,
      message: message || null,
      source: "web",
    })
    .select()
    .single();

  if (error) {
    console.error("insert lead failed", error);
    return jsonResponse({ error: "insert_failed" }, 500);
  }

  // Notificación por email — best-effort: si falla, el lead ya quedó guardado,
  // así que igual respondemos 200 al formulario público.
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const notifyTo = Deno.env.get("NOTIFY_EMAIL_TO");
  const notifyFrom = Deno.env.get("NOTIFY_EMAIL_FROM");

  if (resendKey && notifyTo && notifyFrom) {
    try {
      const emailBody = [
        `Nuevo lead desde el formulario de contacto:`,
        ``,
        `Nombre: ${name}`,
        `Email: ${email}`,
        `País: ${country || "-"}`,
        `Tipo de evento: ${eventType || "-"}`,
        `Invitados aprox.: ${guestCount ?? "-"}`,
        `Mensaje: ${message || "-"}`,
      ].join("\n");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: notifyFrom,
          to: notifyTo,
          reply_to: email,
          subject: `Nuevo lead: ${name} (${eventType || "sin tipo"})`,
          text: emailBody,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (e) {
      console.error("resend notify failed", e);
    }
  }

  return jsonResponse({ ok: true, id: lead.id });
});
