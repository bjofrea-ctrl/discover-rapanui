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

const SERVICE_TYPE_LABELS = {
  ceremonia_ancestral: 'Ceremonia Ancestral',
  ceremonia_civil: 'Ceremonia Civil',
  arriendo_casa: 'Arriendo de Casa',
  restaurant: 'Restaurant',
  cena: 'Cena',
  coctel: 'Cóctel',
  tour: 'Tour',
  fotografia: 'Fotografía',
  musica: 'Música',
  flores: 'Flores',
  transporte: 'Transporte',
  otro: 'Otro',
};

const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatMoney(amount, currency) {
  const n = Number(amount || 0);
  return `${n.toLocaleString('es-CL')} ${currency || 'CLP'}`;
}

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
  await Promise.all([loadLeads(), loadEvents(), loadCashFlow(), loadTransactionsTable()]);
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
    .select('id, event_type, ceremony_type, event_date, status, coordinator_name, budget_amount, budget_currency, clients(email, partner1_name, partner2_name)')
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

  const budgetForm = document.getElementById('budgetForm');
  budgetForm.budget_amount.value = ev.budget_amount ?? '';
  budgetForm.budget_currency.value = ev.budget_currency || 'CLP';

  loadMilestones();
  loadChecklist();
  loadVendors();
  loadServices();
}

document.getElementById('closeEventEditorBtn').addEventListener('click', () => {
  currentEventId = null;
  document.getElementById('eventEditorSection').classList.add('admin-hidden');
});

document.getElementById('budgetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const { error } = await supabase.from('events').update({
    budget_amount: form.budget_amount.value ? Number(form.budget_amount.value) : null,
    budget_currency: form.budget_currency.value,
  }).eq('id', currentEventId);
  if (error) { alert('No se pudo guardar el presupuesto.'); return; }
  await loadServices();
  await loadEvents();
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

// ============================================================
// SERVICIOS / ACTIVIDADES INCLUIDAS EN EL EVENTO
// ============================================================
async function loadServices() {
  const container = document.getElementById('servicesEditorContainer');
  const { data, error } = await supabase
    .from('event_services')
    .select('*')
    .eq('event_id', currentEventId)
    .order('scheduled_date', { ascending: true, nullsFirst: false });

  if (error) { container.textContent = 'Error cargando servicios.'; return; }

  let total = 0;
  if (!data.length) {
    container.innerHTML = '<p class="admin-note">Sin actividades/servicios agregados todavía.</p>';
  } else {
    container.innerHTML = data.map((s) => {
      const lineTotal = (Number(s.cost) || 0) * (s.quantity || 1);
      total += lineTotal;
      return `
        <div class="admin-inline-fields" data-service-id="${s.id}" style="align-items:center;">
          <span class="admin-badge">${escapeHtml(SERVICE_TYPE_LABELS[s.service_type] || s.service_type)}</span>
          <span>${escapeHtml(s.description || '')}</span>
          <span>${s.scheduled_date || ''}</span>
          <span>${s.quantity}× ${formatMoney(s.cost, s.currency)}</span>
          <span class="admin-badge">${escapeHtml(s.status)}</span>
          <button class="admin-btn delete-service-btn">Eliminar</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.delete-service-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('¿Eliminar este servicio?')) return;
        const id = e.target.closest('[data-service-id]').dataset.serviceId;
        await supabase.from('event_services').delete().eq('id', id);
        loadServices();
      });
    });
  }

  renderBudgetSummary(total);
}

function renderBudgetSummary(servicesTotal) {
  const summary = document.getElementById('budgetSummary');
  const form = document.getElementById('budgetForm');
  const budget = Number(form.budget_amount.value || 0);
  const currency = form.budget_currency.value;
  if (!budget) {
    summary.textContent = `Costo estimado de servicios: ${formatMoney(servicesTotal, currency)} (sin presupuesto definido).`;
    return;
  }
  const pct = Math.round((servicesTotal / budget) * 100);
  summary.textContent = `Presupuesto: ${formatMoney(budget, currency)} — Servicios: ${formatMoney(servicesTotal, currency)} (${pct}% del presupuesto).`;
}

document.getElementById('addServiceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  await supabase.from('event_services').insert({
    event_id: currentEventId,
    service_type: payload.service_type,
    description: payload.description || null,
    scheduled_date: payload.scheduled_date || null,
    quantity: payload.quantity ? Number(payload.quantity) : 1,
    cost: payload.cost ? Number(payload.cost) : null,
    currency: payload.currency || 'CLP',
  });
  form.reset();
  loadServices();
});

// ============================================================
// CONTABILIDAD DE LA EMPRESA (admin-only)
// ============================================================
async function loadTransactionsTable() {
  const container = document.getElementById('transactionsTableContainer');
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(200);

  if (error) { container.textContent = 'Error cargando movimientos.'; return; }
  if (!data.length) { container.innerHTML = '<p class="admin-note">Sin movimientos registrados todavía.</p>'; return; }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Origen</th><th></th></tr></thead>
      <tbody>${data.map((t) => `
        <tr data-tx-id="${t.id}">
          <td>${t.transaction_date}</td>
          <td><span class="admin-badge">${t.type}</span></td>
          <td>${escapeHtml(t.category)}</td>
          <td>${escapeHtml(t.description || '')}</td>
          <td>${formatMoney(t.amount, t.currency)}</td>
          <td>${t.source === 'excel_import' ? 'Excel' : 'Manual'}</td>
          <td><button class="admin-btn delete-tx-btn">Eliminar</button></td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;

  container.querySelectorAll('.delete-tx-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('¿Eliminar este movimiento?')) return;
      const id = e.target.closest('tr').dataset.txId;
      await supabase.from('finance_transactions').delete().eq('id', id);
      await Promise.all([loadTransactionsTable(), loadCashFlow()]);
    });
  });
}

document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  const { data: { session } } = await supabase.auth.getSession();

  const { error } = await supabase.from('finance_transactions').insert({
    transaction_date: payload.transaction_date,
    type: payload.type,
    category: payload.category,
    description: payload.description || null,
    amount: Number(payload.amount),
    currency: payload.currency || 'CLP',
    source: 'manual',
    created_by: session.user.id,
  });
  if (error) { alert('No se pudo agregar el movimiento.'); return; }
  form.reset();
  await Promise.all([loadTransactionsTable(), loadCashFlow()]);
});

async function loadCashFlow() {
  const container = document.getElementById('cashFlowContainer');
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('transaction_date, type, amount')
    .order('transaction_date', { ascending: true });

  if (error) { container.textContent = 'Error cargando flujo de caja.'; return; }
  if (!data.length) { container.innerHTML = '<p class="admin-note">Sin movimientos todavía.</p>'; return; }

  const byMonth = new Map();
  data.forEach((t) => {
    const key = t.transaction_date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, { ingresos: 0, egresos: 0 });
    const bucket = byMonth.get(key);
    if (t.type === 'ingreso') bucket.ingresos += Number(t.amount);
    else bucket.egresos += Number(t.amount);
  });

  let acumulado = 0;
  const rows = [...byMonth.keys()].sort().map((key) => {
    const { ingresos, egresos } = byMonth.get(key);
    const saldoMes = ingresos - egresos;
    acumulado += saldoMes;
    const [year, month] = key.split('-');
    const label = `${MONTH_NAMES_ES[Number(month) - 1]} ${year}`;
    return { label, ingresos, egresos, saldoMes, acumulado };
  });

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Saldo del mes</th><th>Saldo acumulado</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${r.label}</td>
          <td>${formatMoney(r.ingresos, 'CLP')}</td>
          <td>${formatMoney(r.egresos, 'CLP')}</td>
          <td>${formatMoney(r.saldoMes, 'CLP')}</td>
          <td>${formatMoney(r.acumulado, 'CLP')}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

async function loadEerr() {
  const container = document.getElementById('eerrContainer');
  const fromVal = document.getElementById('eerrFrom').value; // 'YYYY-MM'
  const toVal = document.getElementById('eerrTo').value;
  if (!fromVal || !toVal) { container.innerHTML = 'Selecciona un rango de meses.'; return; }

  const fromDate = `${fromVal}-01`;
  const [toYear, toMonth] = toVal.split('-').map(Number);
  const toDate = new Date(toYear, toMonth, 0).toISOString().slice(0, 10); // último día del mes "hasta"

  const { data, error } = await supabase
    .from('finance_transactions')
    .select('type, category, amount')
    .gte('transaction_date', fromDate)
    .lte('transaction_date', toDate);

  if (error) { container.textContent = 'Error cargando EERR.'; return; }
  if (!data.length) { container.innerHTML = '<p class="admin-note">Sin movimientos en ese rango.</p>'; return; }

  const byCategory = new Map();
  let totalIngresos = 0;
  let totalEgresos = 0;
  data.forEach((t) => {
    if (!byCategory.has(t.category)) byCategory.set(t.category, { ingresos: 0, egresos: 0 });
    const bucket = byCategory.get(t.category);
    if (t.type === 'ingreso') { bucket.ingresos += Number(t.amount); totalIngresos += Number(t.amount); }
    else { bucket.egresos += Number(t.amount); totalEgresos += Number(t.amount); }
  });

  const rows = [...byCategory.entries()].map(([category, v]) => `
    <tr>
      <td>${escapeHtml(category)}</td>
      <td>${formatMoney(v.ingresos, 'CLP')}</td>
      <td>${formatMoney(v.egresos, 'CLP')}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Categoría</th><th>Ingresos</th><th>Egresos</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td><strong>${formatMoney(totalIngresos, 'CLP')}</strong></td>
          <td><strong>${formatMoney(totalEgresos, 'CLP')}</strong></td>
        </tr>
        <tr>
          <td colspan="2"><strong>Resultado del periodo</strong></td>
          <td><strong>${formatMoney(totalIngresos - totalEgresos, 'CLP')}</strong></td>
        </tr>
      </tfoot>
    </table>
  `;
}

document.getElementById('eerrFrom').addEventListener('change', loadEerr);
document.getElementById('eerrTo').addEventListener('change', loadEerr);

// ── Importación de Excel (SheetJS, cargado solo acá — el sitio público sigue sin CDN) ──
let pendingImportRows = null;

document.getElementById('excelFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('excelPreviewContainer');
  if (!file) return;

  preview.innerHTML = '<p class="admin-note">Leyendo archivo...</p>';
  try {
    const XLSX = await import('https://esm.sh/xlsx@0.18.5');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    // Se asume: fecha, tipo, categoría, descripción, monto — sin fila de encabezado o con ella (se filtra por tipo válido).
    const parsed = rows
      .map((r) => ({
        transaction_date: r[0],
        type: String(r[1] || '').trim().toLowerCase(),
        category: r[2],
        description: r[3] || '',
        amount: Number(r[4]),
      }))
      .filter((r) => (r.type === 'ingreso' || r.type === 'egreso') && r.transaction_date && !Number.isNaN(r.amount));

    if (!parsed.length) {
      preview.innerHTML = '<p class="admin-note">No se encontraron filas válidas. Revisa el formato de columnas en backend/SETUP.md.</p>';
      pendingImportRows = null;
      return;
    }

    pendingImportRows = { rows: parsed, file };
    preview.innerHTML = `
      <p class="admin-note">${parsed.length} filas detectadas. Revisa antes de confirmar:</p>
      <table class="admin-table">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr></thead>
        <tbody>${parsed.slice(0, 50).map((r) => `
          <tr><td>${escapeHtml(r.transaction_date)}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.description)}</td><td>${r.amount}</td></tr>
        `).join('')}</tbody>
      </table>
      ${parsed.length > 50 ? `<p class="admin-note">Mostrando 50 de ${parsed.length}.</p>` : ''}
      <button id="confirmImportBtn" class="admin-btn primary">Confirmar importación</button>
      <button id="cancelImportBtn" class="admin-btn">Cancelar</button>
      <p id="importMsg" class="admin-note"></p>
    `;

    document.getElementById('cancelImportBtn').addEventListener('click', () => {
      pendingImportRows = null;
      preview.innerHTML = '';
      e.target.value = '';
    });

    document.getElementById('confirmImportBtn').addEventListener('click', confirmImport);
  } catch (err) {
    console.error('excel parse failed', err);
    preview.innerHTML = '<p class="admin-note">No se pudo leer el archivo. ¿Es un .xlsx/.xls válido?</p>';
    pendingImportRows = null;
  }
});

async function confirmImport() {
  if (!pendingImportRows) return;
  const { rows, file } = pendingImportRows;
  const msg = document.getElementById('importMsg');
  const confirmBtn = document.getElementById('confirmImportBtn');
  confirmBtn.disabled = true;
  msg.textContent = 'Importando...';

  const { data: { session } } = await supabase.auth.getSession();
  const batchId = crypto.randomUUID();
  const storagePath = `${batchId}/${file.name}`;

  const { error: uploadError } = await supabase.storage.from('finance-imports').upload(storagePath, file);
  if (uploadError) {
    msg.textContent = 'Error subiendo el archivo original.';
    confirmBtn.disabled = false;
    return;
  }

  const { error: insertError } = await supabase.from('finance_transactions').insert(
    rows.map((r) => ({
      transaction_date: r.transaction_date,
      type: r.type,
      category: r.category || 'otro',
      description: r.description || null,
      amount: r.amount,
      currency: 'CLP',
      source: 'excel_import',
      import_batch_id: batchId,
      created_by: session.user.id,
    }))
  );

  await supabase.from('finance_imports').insert({
    filename: file.name,
    storage_path: storagePath,
    uploaded_by: session.user.id,
    row_count: rows.length,
    status: insertError ? 'error' : 'procesado',
    notes: insertError ? String(insertError.message || insertError) : null,
  });

  if (insertError) {
    msg.textContent = 'El archivo se guardó, pero hubo un error insertando las filas. Revisa el formato.';
    confirmBtn.disabled = false;
    return;
  }

  msg.textContent = `${rows.length} movimientos importados con éxito.`;
  pendingImportRows = null;
  document.getElementById('excelFileInput').value = '';
  await Promise.all([loadTransactionsTable(), loadCashFlow()]);
}
