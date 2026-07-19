// Discover Rapa Nui — Edge Function: invite-client
// Uso exclusivo del admin (verifica JWT + role=admin de quien llama).
// Crea (o reutiliza) un cliente + evento, invita al email por Supabase Auth
// (magic link de "aceptar invitación") y, si viene lead_id, marca el lead como ganado.
//
// Deploy: supabase functions deploy invite-client
// (esta función SÍ verifica JWT — no usar --no-verify-jwt)
//
// Body esperado (JSON):
// {
//   "email": "pareja@example.com",
//   "partner1_name": "...", "partner2_name": "...", "phone": "...", "country": "...",
//   "event_type": "boda_completa", "ceremony_type": "civil", "event_date": "2027-03-10",
//   "guest_count": 40, "coordinator_name": "...",
//   "lead_id": "uuid-opcional-del-lead-que-se-convierte"
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return jsonResponse({ error: "missing_authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente "como el caller" solo para validar identidad/rol.
  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return jsonResponse({ error: "invalid_session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || callerProfile?.role !== "admin") {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }

  const partner1Name = typeof payload.partner1_name === "string" ? payload.partner1_name : null;
  const partner2Name = typeof payload.partner2_name === "string" ? payload.partner2_name : null;
  const phone = typeof payload.phone === "string" ? payload.phone : null;
  const country = typeof payload.country === "string" ? payload.country : null;
  const eventType = typeof payload.event_type === "string" ? payload.event_type : "boda_completa";
  const ceremonyType = typeof payload.ceremony_type === "string" ? payload.ceremony_type : null;
  const eventDate = typeof payload.event_date === "string" ? payload.event_date : null;
  const guestCount = typeof payload.guest_count === "number" ? payload.guest_count : null;
  const coordinatorName = typeof payload.coordinator_name === "string" ? payload.coordinator_name : null;
  const leadId = typeof payload.lead_id === "string" ? payload.lead_id : null;

  // 1) Upsert de client por email (no duplica si el email ya existe).
  const { data: existingClient } = await admin
    .from("clients")
    .select("id, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  let clientId: string;
  let clientAuthUserId: string | null = existingClient?.auth_user_id ?? null;

  if (existingClient) {
    clientId = existingClient.id;
    await admin
      .from("clients")
      .update({ partner1_name: partner1Name, partner2_name: partner2Name, phone, country })
      .eq("id", clientId);
  } else {
    const { data: newClient, error: insertClientError } = await admin
      .from("clients")
      .insert({ email, partner1_name: partner1Name, partner2_name: partner2Name, phone, country })
      .select()
      .single();
    if (insertClientError) {
      console.error("insert client failed", insertClientError);
      return jsonResponse({ error: "client_insert_failed" }, 500);
    }
    clientId = newClient.id;
  }

  // 2) Invitar por email si todavía no tiene cuenta de auth vinculada.
  if (!clientAuthUserId) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: [partner1Name, partner2Name].filter(Boolean).join(" & ") },
    });
    if (inviteError) {
      // Si el usuario de auth ya existía (invitado antes sin quedar linkeado), no es fatal.
      console.error("invite failed", inviteError);
    } else if (invited?.user?.id) {
      clientAuthUserId = invited.user.id;
      await admin
        .from("clients")
        .update({ auth_user_id: clientAuthUserId })
        .eq("id", clientId);
      await admin
        .from("profiles")
        .update({ role: "client" })
        .eq("id", clientAuthUserId);
    }
  }

  // 3) Crear el evento.
  const { data: event, error: eventError } = await admin
    .from("events")
    .insert({
      client_id: clientId,
      event_type: eventType,
      ceremony_type: ceremonyType,
      event_date: eventDate,
      guest_count: guestCount,
      coordinator_name: coordinatorName,
      status: "contratado",
    })
    .select()
    .single();

  if (eventError) {
    console.error("insert event failed", eventError);
    return jsonResponse({ error: "event_insert_failed" }, 500);
  }

  // 4) Clonar plantillas de cronograma/checklist si existen para ese event_type.
  await admin.rpc("clone_templates_to_event", { p_event_id: event.id });

  // 5) Si viene de un lead, marcarlo como ganado y linkearlo al cliente.
  if (leadId) {
    await admin
      .from("leads")
      .update({ status: "ganado", converted_client_id: clientId })
      .eq("id", leadId);
  }

  return jsonResponse({ ok: true, client_id: clientId, event_id: event.id });
});
