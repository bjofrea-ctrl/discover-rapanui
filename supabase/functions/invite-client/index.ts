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

  // 1) Upsert de client por email
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

  // 2) Vincular cuenta de auth si no tiene
  if (!clientAuthUserId) {
    // Primero intentar lookup por email (puede que ya exista en Auth pero no esté linkeado)
    const { data: users } = await admin.auth.admin.listUsers();
    const existingAuthUser = users?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email
    );

    if (existingAuthUser) {
      clientAuthUserId = existingAuthUser.id;
      await admin.from("clients").update({ auth_user_id: clientAuthUserId }).eq("id", clientId);
    } else {
      // No existe en Auth — invitar
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: [partner1Name, partner2Name].filter(Boolean).join(" & ") },
      });

      if (inviteError) {
        console.error("invite failed", inviteError);
        return jsonResponse({ error: "invite_failed", detail: inviteError.message }, 500);
      }

      if (invited?.user?.id) {
        clientAuthUserId = invited.user.id;
        await admin.from("clients").update({ auth_user_id: clientAuthUserId }).eq("id", clientId);
      }
    }

    // Actualizar role en profiles — se hace DESPUÉS de setear auth_user_id para evitar race
    if (clientAuthUserId) {
      const { error: upsertError } = await admin
        .from("profiles")
        .upsert({ id: clientAuthUserId, email, role: "client" }, { onConflict: "id" });
      if (upsertError) {
        console.error("profile upsert failed", upsertError);
      }
    }
  }

  // 3) Crear el evento
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

  // 4) Clonar plantillas
  await admin.rpc("clone_templates_to_event", { p_event_id: event.id });

  // 5) Marcar lead como ganado si corresponde
  if (leadId) {
    await admin
      .from("leads")
      .update({ status: "ganado", converted_client_id: clientId })
      .eq("id", leadId);
  }

  return jsonResponse({ ok: true, client_id: clientId, event_id: event.id });
});
