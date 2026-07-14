// Discover Rapa Nui — panel admin "nivel dios" (Fase 1: pipeline de leads,
// conversión a cliente, editor de cronograma/checklist/proveedores por evento).
// Vanilla JS, sin build step — reutiliza el mismo cliente Supabase del sitio público.
import { supabase, CONFIG } from '../../../assets/js/supabaseClient.js';

const EVENT_TYPE_LABELS = {
  elopement: 'Elopement',
  boda_completa: 'Boda Completa',
  renovacion_votos: 'Renovación de votos',
  tour: 'Tour',
  otro: 'Otro',
};

const LEAD_EVENT_TYPE_MAP = {
  'Boda / Ceremonia': 'boda_completa',
  'Elopement': 'elopement',
  'Renovación de votos': 'renovacion_votos',
  'Tour / Experiencia': 'tour',
  'Hospedaje': 'otro',
  'Otro': 'otro',
};

const LEAD_STATUSES = ['nuevo', 'contactado', 'cotizado', 'ganado', 'perdido'];
const EVENT_STATUSES = ['cotizado', 'contratado', 'planificacion', 'completado', 'cancelado'];
const MILESTONE_STATUSES = ['pendiente', 'en_progreso', 'completado'];

let currentEventId = null;

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function selectHtml(name, options, selected, extraAttrs = '') {
  return `<select data-field="${name}" ${extraAttrs}>${options.map((opt) =>
    `<option value="${opt}" ${opt === selected ? 'selected' : ''}>${opt}</option>`
  ).join('')}</select>`;
}

// ============================================================
// AUTH GUARD
// ============================================================
const loginScreen = document.getElementById('adminLoginScreen');
const forbiddenScreen = document.getElementById('adminForbidden');
const dashboard = document.getElementById('adminDashboard');
const emailInput = document.getElementById('adminEmailInput');
const loginBtn = document.getElementById('adminLoginBtn');
const loginMsg = document.getElementById('adminLoginMsg');

function showScreen(el) {
  [loginScreen, forbiddenScreen, dashboard].forEach((s) => s.classList.add('admin-hidden'));
  el.classList.remove('admin-hidden');
}

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) return;
  loginBtn.disabled = true;
  loginMsg.textContent = 'Enviando...';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  });
  loginBtn.disabled = false;
  loginMsg.textContent = error
    ? 'No pudimos enviar el enlace. Intenta nuevamente.'
    : 'Revisa tu correo — te enviamos un enlace de acceso.';
});

document.getElementById('adminForbiddenLogout').addEventListener('click', () => supabase.auth.signOut());
document.getElementById('adminLogoutBtn').addEventListener('click', () => supabase.auth.signOut());

async function handleSession(session) {
  if (!session) {
    showScreen(loginScreen);
    return;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') {
    showScreen(forbiddenScreen);
    return;
  }

  showScreen(dashboard);
  await Promise.all([loadLeads(), loadEvents()]);
}

supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
supabase.auth.getSession().then(({ data }) => handleSession(data.session));

// ============================================================
// LEADS
// ============================================================
async function loadLeads() {
  const container = document.getElementById('leadsTableContainer');
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.textContent = 'Error cargando leads.';
    console.error(error);
    return;
  }
  if (!leads.length) {
    container.textContent = 'No hay leads todavía.';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Fecha</th><th>Nombre</th><th>Email</th><th>Evento</th><th>Invitados</th><th>Estado</th><th></th></tr></thead>
      <tbody>${leads.map((lead) => `
        <tr data-lead-id="${lead.id}">
          <td>${new Date(lead.created_at).toLocaleDateString('es-CL')}</td>
          <td>${escapeHtml(lead.name)}</td>
          <td>${escapeHtml(lead.email)}</td>
          <td>${escapeHtml(lead.event_type || '-')}</td>
          <td>${lead.guest_count ?? '-'}</td>
          <td>${selectHtml('status', LEAD_STATUSES, lead.status)}</td>
          <td>${lead.status === 'ganado'
            ? '<span class="admin-badge">Convertido</span>'
            : `<button class="admin-btn convert-lead-btn">Convertir en cliente</button>`}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;

  container.querySelectorAll('select[data-field="status"]').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const leadId = e.target.closest('tr').dataset.leadId;
      const { error: updError } = await supabase.from('leads').update({ status: e.target.value }).eq('id', leadId);
      if (updError) alert('No se pudo actualizar el estado del lead.');
    });
  });

  container.querySelectorAll('.convert-lead-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      const lead = leads.find((l) => l.id === row.dataset.leadId);
      openConvertLeadForm(lead);
    });
  });
}

function openConvertLeadForm(lead) {
  const section = document.getElementById('convertLeadSection');
  const form = document.getElementById('convertLeadForm');
  section.classList.remove('admin-hidden');
  form.email.value = lead.email;
  form.partner1_name.value = lead.name || '';
  form.lead_id.value = lead.id;
  const mapped = LEAD_EVENT_TYPE_MAP[lead.event_type];
  if (mapped) form.event_type.value = mapped;
  if (lead.guest_count) form.guest_count.value = lead.guest_count;
  if (lead.country) form.country.value = lead.country;
  section.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('cancelConvertBtn').addEventListener('click', () => {
  document.getElementById('convertLeadSection').classList.add('admin-hidden');
  document.getElementById('convertLeadForm').reset();
});

document.getElementById('convertLeadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('convertLeadMsg');
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  if (payload.guest_count) payload.guest_count = Number(payload.guest_count);
  else delete payload.guest_count;
  if (!payload.lead_id) delete payload.lead_id;

  const { data: { session } } = await supabase.auth.getSession();
  msg.textContent = 'Creando cliente e invitando...';

  try {
    const res = await fetch(CONFIG.INVITE_CLIENT_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'request_failed');

    msg.textContent = 'Cliente creado e invitado con éxito.';
    form.reset();
    setTimeout(() => document.getElementById('convertLeadSection').classList.add('admin-hidden'), 1500);
    await Promise.all([loadLeads(), loadEvents()]);
  } catch (err) {
    console.error('invite-client failed', err);
    msg.textContent = 'Error: no se pudo crear/invitar al cliente.';
  }
});

// ============================================================
// EVENTOS / CLIENTES
// ============================================================
async function loadEvents() {
  const container = document.getElementById('eventsTableContainer');
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_type, ceremony_type, event_date, status, coordinator_name, clients(email, partner1_name, partner2_name)')
    .order('created_at', { ascending: false });

  if (error) {
    container.textContent = 'Error cargando eventos.';
    console.error(error);
    return;
  }
  if (!events.length) {
    container.textContent = 'No hay eventos todavía.';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Cliente</th><th>Email</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
      <tbody>${events.map((ev) => `
        <tr data-event-id="${ev.id}">
          <td>${escapeHtml([ev.clients?.partner1_name, ev.clients?.partner2_name].filter(Boolean).join(' & ') || '-')}</td>
          <td>${escapeHtml(ev.clients?.email || '-')}</td>
          <td>${escapeHtml(EVENT_TYPE_LABELS[ev.event_type] || ev.event_type)}</td>
          <td>${ev.event_date || '-'}</td>
          <td>${selectHtml('status', EVENT_STATUSES, ev.status)}</td>
          <td><button class="admin-btn edit-event-btn">Editar →</button></td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;

  container.querySelectorAll('select[data-field="status"]').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const eventId = e.target.closest('tr').dataset.eventId;
      const { error: updError } = await supabase.from('events').update({ status: e.target.value }).eq('id', eventId);
      if (updError) alert('No se pudo actualizar el estado del evento.');
    });
  });

  container.querySelectorAll('.edit-event-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      const ev = events.find((x) => x.id === row.dataset.eventId);
      openEventEditor(ev);
    });
  });
}

// ============================================================
// EDITOR DE EVENTO: cronograma, checklist, proveedores
// ============================================================
function openEventEditor(ev) {
  currentEventId = ev.id;
  document.getElementById('eventEditorSection').classList.remove('admin-hidden');
  document.getElementById('eventEditorTitle').textContent =
    [ev.clients?.partner1_name, ev.clients?.partner2_name].filter(Boolean).join(' & ') || ev.clients?.email || ev.id;
  document.getElementById('eventEditorSection').scrollIntoView({ behavior: 'smooth' });
  loadMilestones();
  loadChecklist();
  loadVendors();
}

document.getElementById('closeEventEditorBtn').addEventListener('click', () => {
  currentEventId = null;
  document.getElementById('eventEditorSection').classList.add('admin-hidden');
});

async function loadMilestones() {
  const container = document.getElementById('milestonesContainer');
  const { data, error } = await supabase
    .from('event_milestones')
    .select('*')
    .eq('event_id', currentEventId)
    .order('order_index');

  if (error) { container.textContent = 'Error cargando cronograma.'; return; }
  if (!data.length) { container.innerHTML = '<p class="admin-note">Sin hitos todavía.</p>'; return; }

  container.innerHTML = data.map((m) => `
    <div class="admin-inline-fields" data-milestone-id="${m.id}" style="align-items:center;">
      <strong>${escapeHtml(m.phase_label)}</strong>
      <span>${escapeHtml(m.title)}</span>
      ${selectHtml('status', MILESTONE_STATUSES, m.status)}
      <button class="admin-btn delete-milestone-btn">Eliminar</button>
    </div>
  `).join('');

  container.querySelectorAll('select[data-field="status"]').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.closest('[data-milestone-id]').dataset.milestoneId;
      const status = e.target.value;
      await supabase.from('event_milestones').update({
        status, completed_at: status === 'completado' ? new Date().toISOString() : null,
      }).eq('id', id);
    });
  });
  container.querySelectorAll('.delete-milestone-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('¿Eliminar este hito?')) return;
      const id = e.target.closest('[data-milestone-id]').dataset.milestoneId;
      await supabase.from('event_milestones').delete().eq('id', id);
      loadMilestones();
    });
  });
}

document.getElementById('addMilestoneForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  const { count } = await supabase
    .from('event_milestones')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', currentEventId);
  await supabase.from('event_milestones').insert({
    event_id: currentEventId,
    phase_label: payload.phase_label,
    title: payload.title,
    description: payload.description || null,
    due_date: payload.due_date || null,
    order_index: count ?? 0,
  });
  form.reset();
  loadMilestones();
});

async function loadChecklist() {
  const container = document.getElementById('checklistEditorContainer');
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('event_id', currentEventId)
    .order('order_index');

  if (error) { container.textContent = 'Error cargando checklist.'; return; }
  if (!data.length) { container.innerHTML = '<p class="admin-note">Sin ítems todavía.</p>'; return; }

  container.innerHTML = data.map((item) => `
    <div class="admin-inline-fields" data-item-id="${item.id}" style="align-items:center;">
      <span class="admin-badge">${escapeHtml(item.category)}</span>
      <label><input type="checkbox" data-field="is_checked" ${item.is_checked ? 'checked' : ''}> ${escapeHtml(item.label)}</label>
      <button class="admin-btn delete-checklist-btn">Eliminar</button>
    </div>
  `).join('');

  container.querySelectorAll('input[data-field="is_checked"]').forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.closest('[data-item-id]').dataset.itemId;
      await supabase.rpc('toggle_checklist_item', { p_item_id: id, p_checked: e.target.checked });
    });
  });
  container.querySelectorAll('.delete-checklist-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('¿Eliminar este ítem?')) return;
      const id = e.target.closest('[data-item-id]').dataset.itemId;
      await supabase.from('checklist_items').delete().eq('id', id);
      loadChecklist();
    });
  });
}

document.getElementById('addChecklistForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  const { count } = await supabase
    .from('checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', currentEventId);
  await supabase.from('checklist_items').insert({
    event_id: currentEventId,
    category: payload.category,
    label: payload.label,
    order_index: count ?? 0,
  });
  form.reset();
  loadChecklist();
});

async function loadVendors() {
  const container = document.getElementById('vendorsEditorContainer');
  const { data, error } = await supabase
    .from('vendor_contacts')
    .select('*')
    .eq('event_id', currentEventId);

  if (error) { container.textContent = 'Error cargando proveedores.'; return; }
  if (!data.length) { container.innerHTML = '<p class="admin-note">Sin proveedores asignados todavía.</p>'; return; }

  container.innerHTML = data.map((v) => `
    <div class="admin-inline-fields" data-vendor-id="${v.id}" style="align-items:center;">
      <span class="admin-badge">${escapeHtml(v.category)}</span>
      <strong>${escapeHtml(v.name)}</strong>
      <span>${escapeHtml(v.phone || '')}</span>
      <span>${escapeHtml(v.email || '')}</span>
      <button class="admin-btn delete-vendor-btn">Eliminar</button>
    </div>
  `).join('');

  container.querySelectorAll('.delete-vendor-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('¿Eliminar este proveedor?')) return;
      const id = e.target.closest('[data-vendor-id]').dataset.vendorId;
      await supabase.from('vendor_contacts').delete().eq('id', id);
      loadVendors();
    });
  });
}

document.getElementById('addVendorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  await supabase.from('vendor_contacts').insert({
    event_id: currentEventId,
    category: payload.category,
    name: payload.name,
    phone: payload.phone || null,
    email: payload.email || null,
    is_global: false,
  });
  form.reset();
  loadVendors();
});
