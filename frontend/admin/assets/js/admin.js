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
const PAGE_SIZE = 25;

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

function loadingSkeleton(lines = 3) {
  return `<div class="admin-skeleton">${Array(lines).fill('<div class="admin-skeleton-line"></div>').join('')}</div>`;
}

// ==============================
// TOAST SYSTEM
// ==============================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: 'check', error: 'cross', info: 'info' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] === 'check' ? '\u2713' : icons[type] === 'cross' ? '\u2717' : '\u2139'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==============================
// AUTH GUARD
// ==============================
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
  await Promise.all([
    loadLeads(), loadEvents(), loadCashFlow(), loadTransactionsTable(),
    loadMilestoneTemplates(), loadChecklistTemplates(),
  ]);
}

supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
supabase.auth.getSession().then(({ data }) => handleSession(data.session));

// JWT refresh check every 10 min
setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  if (expiresAt && Date.now() > expiresAt - 60000) {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      showToast('Sesion expirada. Vuelve a iniciar sesion.', 'error');
      supabase.auth.signOut();
    }
  }
}, 600000);

// ==============================
// PAGINATION HELPERS
// ==============================
let leadsPage = 0;
let eventsPage = 0;

function paginateControls(page, total, label, onPrev, onNext) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  return `<div class="admin-pagination">
    <button class="admin-btn" ${page <= 0 ? 'disabled' : ''} data-paginate="prev">\u2190 Anterior</button>
    <span>Pagina ${page + 1} de ${Math.max(totalPages, 1)} (${total} ${label})</span>
    <button class="admin-btn" ${page >= totalPages - 1 ? 'disabled' : ''} data-paginate="next">Siguiente \u2192</button>
  </div>`;
}

function attachPagination(container, page, total, label, loadFn) {
  const prevBtn = container.querySelector('[data-paginate="prev"]');
  const nextBtn = container.querySelector('[data-paginate="next"]');
  if (prevBtn) prevBtn.addEventListener('click', () => { loadFn(page - 1); });
  if (nextBtn) nextBtn.addEventListener('click', () => { loadFn(page + 1); });
}

// ==============================
// LEADS
// ==============================
async function loadLeads(page = 0) {
  const container = document.getElementById('leadsTableContainer');
  container.innerHTML = loadingSkeleton(5);

  const { data: allLeads, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) {
    showToast('Error cargando leads: ' + error.message, 'error');
    container.innerHTML = '<p class="admin-note">Error cargando leads.</p>';
    return;
  }

  leadsPage = page;
  if (!allLeads.length) {
    container.innerHTML = '<p class="admin-note">No hay leads todavia.</p>';
    return;
  }

  const total = count || allLeads.length;
  container.innerHTML =
    '<table class="admin-table">' +
    '<thead><tr><th>Fecha</th><th>Nombre</th><th>Email</th><th>Evento</th><th>Invitados</th><th>Estado</th><th></th></tr></thead>' +
    '<tbody>' + allLeads.map((lead) =>
      '<tr data-lead-id="' + lead.id + '">' +
      '<td>' + new Date(lead.created_at).toLocaleDateString('es-CL') + '</td>' +
      '<td>' + escapeHtml(lead.name) + '</td>' +
      '<td>' + escapeHtml(lead.email) + '</td>' +
      '<td>' + escapeHtml(lead.event_type || '-') + '</td>' +
      '<td>' + (lead.guest_count ?? '-') + '</td>' +
      '<td>' + selectHtml('status', LEAD_STATUSES, lead.status) + '</td>' +
      '<td>' + (lead.status === 'ganado'
        ? '<span class="admin-badge">Convertido</span>'
        : '<button class="admin-btn convert-lead-btn">Convertir en cliente</button>') + '</td>' +
      '</tr>'
    ).join('') + '</tbody></table>' +
    paginateControls(page, total, 'leads', function () { loadLeads(page - 1); }, function () { loadLeads(page + 1); });

  container.querySelectorAll('select[data-field="status"]').forEach(function (sel) {
    sel.addEventListener('change', async function (e) {
      const leadId = e.target.closest('tr').dataset.leadId;
      try {
        const { error: updError } = await supabase.from('leads').update({ status: e.target.value }).eq('id', leadId);
        if (updError) throw updError;
        showToast('Estado de lead actualizado.');
      } catch (err) {
        showToast('No se pudo actualizar el estado del lead.', 'error');
      }
    });
  });

  container.querySelectorAll('.convert-lead-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      const row = e.target.closest('tr');
      const lead = allLeads.find(function (l) { return l.id === row.dataset.leadId; });
      openConvertLeadForm(lead);
    });
  });

  attachPagination(container, page, total, 'leads', loadLeads);
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

document.getElementById('cancelConvertBtn').addEventListener('click', function () {
  document.getElementById('convertLeadSection').classList.add('admin-hidden');
  document.getElementById('convertLeadForm').reset();
});

document.getElementById('convertLeadForm').addEventListener('submit', async function (e) {
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
        Authorization: 'Bearer ' + session.access_token,
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'request_failed');

    msg.textContent = 'Cliente creado e invitado con exito.';
    form.reset();
    showToast('Cliente creado e invitado con exito.');
    setTimeout(function () { document.getElementById('convertLeadSection').classList.add('admin-hidden'); }, 1500);
    await Promise.all([loadLeads(), loadEvents()]);
  } catch (err) {
    console.error('invite-client failed', err);
    msg.textContent = 'Error: no se pudo crear/invitar al cliente.';
    showToast('Error al crear cliente: ' + err.message, 'error');
  }
});

// ==============================
// EVENTOS / CLIENTES
// ==============================
async function loadEvents(page = 0, searchTerm = '') {
  const container = document.getElementById('eventsTableContainer');
  container.innerHTML = loadingSkeleton(5);

  let query = supabase
    .from('events')
    .select('id, event_type, ceremony_type, event_date, status, coordinator_name, budget_amount, budget_currency, clients!inner(email, partner1_name, partner2_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (searchTerm) {
    query = query.or(
      'clients.email.ilike.%' + searchTerm + '%,clients.partner1_name.ilike.%' + searchTerm + '%,clients.partner2_name.ilike.%' + searchTerm + '%'
    );
  }

  const { data: events, error, count } = await query
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) {
    showToast('Error cargando eventos: ' + error.message, 'error');
    container.innerHTML = '<p class="admin-note">Error cargando eventos.</p>';
    return;
  }

  eventsPage = page;
  if (!events.length) {
    container.innerHTML = '<p class="admin-note">No hay eventos todavia.</p>';
    return;
  }

  const total = count || events.length;
  container.innerHTML =
    '<table class="admin-table">' +
    '<thead><tr><th>Cliente</th><th>Email</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>' +
    '<tbody>' + events.map(function (ev) {
      return '<tr data-event-id="' + ev.id + '">' +
        '<td>' + escapeHtml([ev.clients?.partner1_name, ev.clients?.partner2_name].filter(Boolean).join(' & ') || '-') + '</td>' +
        '<td>' + escapeHtml(ev.clients?.email || '-') + '</td>' +
        '<td>' + escapeHtml(EVENT_TYPE_LABELS[ev.event_type] || ev.event_type) + '</td>' +
        '<td>' + (ev.event_date || '-') + '</td>' +
        '<td>' + selectHtml('status', EVENT_STATUSES, ev.status) + '</td>' +
        '<td><button class="admin-btn edit-event-btn">Editar \u2192</button></td>' +
        '</tr>';
    }).join('') + '</tbody></table>' +
    paginateControls(page, total, 'eventos', function () { loadEvents(page - 1, searchTerm); }, function () { loadEvents(page + 1, searchTerm); });

  container.querySelectorAll('select[data-field="status"]').forEach(function (sel) {
    sel.addEventListener('change', async function (e) {
      const eventId = e.target.closest('tr').dataset.eventId;
      try {
        const { error: updError } = await supabase.from('events').update({ status: e.target.value }).eq('id', eventId);
        if (updError) throw updError;
        showToast('Estado actualizado.');
      } catch (err) {
        showToast('No se pudo actualizar el estado del evento.', 'error');
      }
    });
  });

  container.querySelectorAll('.edit-event-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      const row = e.target.closest('tr');
      const ev = events.find(function (x) { return x.id === row.dataset.eventId; });
      openEventEditor(ev);
    });
  });

  attachPagination(container, page, total, 'eventos', function (p) { loadEvents(p, searchTerm); });
}

const searchInput = document.getElementById('searchEventsInput');
if (searchInput) {
  let searchTimer;
  searchInput.addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { loadEvents(0, e.target.value.trim()); }, 400);
  });
}

// ==============================
// EDITOR DE EVENTO
// ==============================
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
  loadDocuments();
  loadMessages();
}

document.getElementById('closeEventEditorBtn').addEventListener('click', function () {
  currentEventId = null;
  document.getElementById('eventEditorSection').classList.add('admin-hidden');
});

document.getElementById('budgetForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  try {
    const { error } = await supabase.from('events').update({
      budget_amount: form.budget_amount.value ? Number(form.budget_amount.value) : null,
      budget_currency: form.budget_currency.value,
    }).eq('id', currentEventId);
    if (error) throw error;
    showToast('Presupuesto guardado.');
    await loadServices();
    await loadEvents();
  } catch (err) {
    showToast('No se pudo guardar el presupuesto.', 'error');
  }
});

async function loadMilestones() {
  const container = document.getElementById('milestonesContainer');
  container.innerHTML = loadingSkeleton(2);
  try {
    const { data, error } = await supabase
      .from('event_milestones')
      .select('*')
      .eq('event_id', currentEventId)
      .order('order_index');
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin hitos todavia.</p>'; return; }

    container.innerHTML = data.map(function (m) {
      return '<div class="admin-inline-fields" data-milestone-id="' + m.id + '">' +
        '<strong>' + escapeHtml(m.phase_label) + '</strong>' +
        '<span>' + escapeHtml(m.title) + '</span>' +
        selectHtml('status', MILESTONE_STATUSES, m.status) +
        '<button class="admin-btn delete-milestone-btn">Eliminar</button></div>';
    }).join('');

    container.querySelectorAll('select[data-field="status"]').forEach(function (sel) {
      sel.addEventListener('change', async function (e) {
        const id = e.target.closest('[data-milestone-id]').dataset.milestoneId;
        const status = e.target.value;
        await supabase.from('event_milestones').update({
          status: status,
          completed_at: status === 'completado' ? new Date().toISOString() : null,
        }).eq('id', id);
      });
    });
    container.querySelectorAll('.delete-milestone-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        if (!confirm('Eliminar este hito?')) return;
        const id = e.target.closest('[data-milestone-id]').dataset.milestoneId;
        await supabase.from('event_milestones').delete().eq('id', id);
        loadMilestones();
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando cronograma.</p>';
    showToast('Error cargando cronograma.', 'error');
  }
}

document.getElementById('addMilestoneForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const { count } = await supabase
      .from('event_milestones')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', currentEventId);
    const { error } = await supabase.from('event_milestones').insert({
      event_id: currentEventId,
      phase_label: payload.phase_label,
      title: payload.title,
      description: payload.description || null,
      due_date: payload.due_date || null,
      order_index: count ?? 0,
    });
    if (error) throw error;
    form.reset();
    loadMilestones();
    showToast('Hito agregado.');
  } catch (err) {
    showToast('Error al agregar hito.', 'error');
  }
});

async function loadChecklist() {
  const container = document.getElementById('checklistEditorContainer');
  container.innerHTML = loadingSkeleton(2);
  try {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('event_id', currentEventId)
      .order('order_index');
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin items todavia.</p>'; return; }

    container.innerHTML = data.map(function (item) {
      return '<div class="admin-inline-fields" data-item-id="' + item.id + '">' +
        '<span class="admin-badge">' + escapeHtml(item.category) + '</span>' +
        '<label><input type="checkbox" data-field="is_checked"' + (item.is_checked ? ' checked' : '') + '> ' + escapeHtml(item.label) + '</label>' +
        '<button class="admin-btn delete-checklist-btn">Eliminar</button></div>';
    }).join('');

    container.querySelectorAll('input[data-field="is_checked"]').forEach(function (cb) {
      cb.addEventListener('change', async function (e) {
        try {
          const id = e.target.closest('[data-item-id]').dataset.itemId;
          const { error: rpcErr } = await supabase.rpc('toggle_checklist_item', { p_item_id: id, p_checked: e.target.checked });
          if (rpcErr) throw rpcErr;
        } catch (err) {
          showToast('Error al actualizar checklist.', 'error');
        }
      });
    });
    container.querySelectorAll('.delete-checklist-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        if (!confirm('Eliminar este item?')) return;
        const id = e.target.closest('[data-item-id]').dataset.itemId;
        await supabase.from('checklist_items').delete().eq('id', id);
        loadChecklist();
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando checklist.</p>';
    showToast('Error cargando checklist.', 'error');
  }
}

document.getElementById('addChecklistForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const { count } = await supabase
      .from('checklist_items')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', currentEventId);
    const { error } = await supabase.from('checklist_items').insert({
      event_id: currentEventId,
      category: payload.category,
      label: payload.label,
      order_index: count ?? 0,
    });
    if (error) throw error;
    form.reset();
    loadChecklist();
    showToast('Item de checklist agregado.');
  } catch (err) {
    showToast('Error al agregar item.', 'error');
  }
});

async function loadVendors() {
  const container = document.getElementById('vendorsEditorContainer');
  container.innerHTML = loadingSkeleton(2);
  try {
    const { data, error } = await supabase
      .from('vendor_contacts')
      .select('*')
      .eq('event_id', currentEventId);
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin proveedores asignados todavia.</p>'; return; }

    container.innerHTML = data.map(function (v) {
      return '<div class="admin-inline-fields" data-vendor-id="' + v.id + '">' +
        '<span class="admin-badge">' + escapeHtml(v.category) + '</span>' +
        '<strong>' + escapeHtml(v.name) + '</strong>' +
        '<span>' + escapeHtml(v.phone || '') + '</span>' +
        '<span>' + escapeHtml(v.email || '') + '</span>' +
        '<button class="admin-btn delete-vendor-btn">Eliminar</button></div>';
    }).join('');

    container.querySelectorAll('.delete-vendor-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        if (!confirm('Eliminar este proveedor?')) return;
        const id = e.target.closest('[data-vendor-id]').dataset.vendorId;
        await supabase.from('vendor_contacts').delete().eq('id', id);
        loadVendors();
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando proveedores.</p>';
    showToast('Error cargando proveedores.', 'error');
  }
}

document.getElementById('addVendorForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const { error } = await supabase.from('vendor_contacts').insert({
      event_id: currentEventId,
      category: payload.category,
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email || null,
      is_global: false,
    });
    if (error) throw error;
    form.reset();
    loadVendors();
    showToast('Proveedor agregado.');
  } catch (err) {
    showToast('Error al agregar proveedor.', 'error');
  }
});

// ==============================
// SERVICIOS
// ==============================
async function loadServices() {
  const container = document.getElementById('servicesEditorContainer');
  container.innerHTML = loadingSkeleton(2);
  try {
    const { data, error } = await supabase
      .from('event_services')
      .select('*')
      .eq('event_id', currentEventId)
      .order('scheduled_date', { ascending: true, nullsFirst: false });
    if (error) throw error;

    let total = 0;
    if (!data || !data.length) {
      container.innerHTML = '<p class="admin-note">Sin actividades/servicios agregados todavia.</p>';
    } else {
      container.innerHTML = data.map(function (s) {
        const lineTotal = (Number(s.cost) || 0) * (s.quantity || 1);
        total += lineTotal;
        return '<div class="admin-inline-fields" data-service-id="' + s.id + '">' +
          '<span class="admin-badge">' + escapeHtml(SERVICE_TYPE_LABELS[s.service_type] || s.service_type) + '</span>' +
          '<span>' + escapeHtml(s.description || '') + '</span>' +
          '<span>' + (s.scheduled_date || '') + '</span>' +
          '<span>' + s.quantity + 'x ' + formatMoney(s.cost, s.currency) + '</span>' +
          '<span class="admin-badge">' + escapeHtml(s.status) + '</span>' +
          '<button class="admin-btn delete-service-btn">Eliminar</button></div>';
      }).join('');

      container.querySelectorAll('.delete-service-btn').forEach(function (btn) {
        btn.addEventListener('click', async function (e) {
          if (!confirm('Eliminar este servicio?')) return;
          const id = e.target.closest('[data-service-id]').dataset.serviceId;
          await supabase.from('event_services').delete().eq('id', id);
          loadServices();
        });
      });
    }
    renderBudgetSummary(total);
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando servicios.</p>';
    showToast('Error cargando servicios.', 'error');
  }
}

function renderBudgetSummary(servicesTotal) {
  const summary = document.getElementById('budgetSummary');
  const form = document.getElementById('budgetForm');
  const budget = Number(form.budget_amount.value || 0);
  const currency = form.budget_currency.value;
  if (!budget) {
    summary.textContent = 'Costo estimado de servicios: ' + formatMoney(servicesTotal, currency) + ' (sin presupuesto definido).';
    return;
  }
  const pct = Math.round((servicesTotal / budget) * 100);
  summary.textContent = 'Presupuesto: ' + formatMoney(budget, currency) + ' — Servicios: ' + formatMoney(servicesTotal, currency) + ' (' + pct + '% del presupuesto).';
}

document.getElementById('addServiceForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const { error } = await supabase.from('event_services').insert({
      event_id: currentEventId,
      service_type: payload.service_type,
      description: payload.description || null,
      scheduled_date: payload.scheduled_date || null,
      quantity: payload.quantity ? Number(payload.quantity) : 1,
      cost: payload.cost ? Number(payload.cost) : null,
      currency: payload.currency || 'CLP',
    });
    if (error) throw error;
    form.reset();
    loadServices();
    showToast('Servicio agregado.');
  } catch (err) {
    showToast('Error al agregar servicio.', 'error');
  }
});

// ==============================
// CONTABILIDAD
// ==============================
async function loadTransactionsTable() {
  const container = document.getElementById('transactionsTableContainer');
  container.innerHTML = loadingSkeleton(4);
  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin movimientos registrados todavia.</p>'; return; }

    container.innerHTML =
      '<table class="admin-table">' +
      '<thead><tr><th>Fecha</th><th>Tipo</th><th>Categoria</th><th>Descripcion</th><th>Monto</th><th>Origen</th><th></th></tr></thead>' +
      '<tbody>' + data.map(function (t) {
        return '<tr data-tx-id="' + t.id + '">' +
          '<td>' + t.transaction_date + '</td>' +
          '<td><span class="admin-badge">' + t.type + '</span></td>' +
          '<td>' + escapeHtml(t.category) + '</td>' +
          '<td>' + escapeHtml(t.description || '') + '</td>' +
          '<td>' + formatMoney(t.amount, t.currency) + '</td>' +
          '<td>' + (t.source === 'excel_import' ? 'Excel' : 'Manual') + '</td>' +
          '<td><button class="admin-btn delete-tx-btn">Eliminar</button></td></tr>';
      }).join('') + '</tbody></table>';

    container.querySelectorAll('.delete-tx-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        if (!confirm('Eliminar este movimiento?')) return;
        const id = e.target.closest('tr').dataset.txId;
        await supabase.from('finance_transactions').delete().eq('id', id);
        await Promise.all([loadTransactionsTable(), loadCashFlow()]);
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando movimientos.</p>';
    showToast('Error cargando movimientos.', 'error');
  }
}

document.getElementById('addTransactionForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
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
    if (error) throw error;
    form.reset();
    showToast('Movimiento agregado.');
    await Promise.all([loadTransactionsTable(), loadCashFlow()]);
  } catch (err) {
    showToast('No se pudo agregar el movimiento.', 'error');
  }
});

async function loadCashFlow() {
  const container = document.getElementById('cashFlowContainer');
  container.innerHTML = loadingSkeleton(5);
  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('transaction_date, type, amount')
      .order('transaction_date', { ascending: true });
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin movimientos todavia.</p>'; return; }

    const byMonth = new Map();
    data.forEach(function (t) {
      const key = t.transaction_date.slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, { ingresos: 0, egresos: 0 });
      const bucket = byMonth.get(key);
      if (t.type === 'ingreso') bucket.ingresos += Number(t.amount);
      else bucket.egresos += Number(t.amount);
    });

    let acumulado = 0;
    const rows = [...byMonth.keys()].sort().map(function (key) {
      const { ingresos, egresos } = byMonth.get(key);
      const saldoMes = ingresos - egresos;
      acumulado += saldoMes;
      const [year, month] = key.split('-');
      const label = MONTH_NAMES_ES[Number(month) - 1] + ' ' + year;
      return { label: label, ingresos: ingresos, egresos: egresos, saldoMes: saldoMes, acumulado: acumulado };
    });

    container.innerHTML =
      '<table class="admin-table">' +
      '<thead><tr><th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Saldo del mes</th><th>Saldo acumulado</th></tr></thead>' +
      '<tbody>' + rows.map(function (r) {
        return '<tr>' +
          '<td>' + r.label + '</td>' +
          '<td>' + formatMoney(r.ingresos, 'CLP') + '</td>' +
          '<td>' + formatMoney(r.egresos, 'CLP') + '</td>' +
          '<td>' + formatMoney(r.saldoMes, 'CLP') + '</td>' +
          '<td>' + formatMoney(r.acumulado, 'CLP') + '</td></tr>';
      }).join('') + '</tbody></table>';
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando flujo de caja.</p>';
    showToast('Error cargando flujo de caja.', 'error');
  }
}

async function loadEerr() {
  const container = document.getElementById('eerrContainer');
  const fromVal = document.getElementById('eerrFrom').value;
  const toVal = document.getElementById('eerrTo').value;
  if (!fromVal || !toVal) { container.innerHTML = 'Selecciona un rango de meses.'; return; }

  container.innerHTML = loadingSkeleton(3);
  try {
    const fromDate = fromVal + '-01';
    const [toYear, toMonth] = toVal.split('-').map(Number);
    const toDate = new Date(toYear, toMonth, 0).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('type, category, amount')
      .gte('transaction_date', fromDate)
      .lte('transaction_date', toDate);
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin movimientos en ese rango.</p>'; return; }

    const byCategory = new Map();
    let totalIngresos = 0;
    let totalEgresos = 0;
    data.forEach(function (t) {
      if (!byCategory.has(t.category)) byCategory.set(t.category, { ingresos: 0, egresos: 0 });
      const bucket = byCategory.get(t.category);
      if (t.type === 'ingreso') { bucket.ingresos += Number(t.amount); totalIngresos += Number(t.amount); }
      else { bucket.egresos += Number(t.amount); totalEgresos += Number(t.amount); }
    });

    const rows = [...byCategory.entries()].map(function (entry) {
      const category = entry[0];
      const v = entry[1];
      return '<tr>' +
        '<td>' + escapeHtml(category) + '</td>' +
        '<td>' + formatMoney(v.ingresos, 'CLP') + '</td>' +
        '<td>' + formatMoney(v.egresos, 'CLP') + '</td></tr>';
    }).join('');

    container.innerHTML =
      '<table class="admin-table">' +
      '<thead><tr><th>Categoria</th><th>Ingresos</th><th>Egresos</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td><strong>Total</strong></td>' +
      '<td><strong>' + formatMoney(totalIngresos, 'CLP') + '</strong></td>' +
      '<td><strong>' + formatMoney(totalEgresos, 'CLP') + '</strong></td></tr>' +
      '<tr><td colspan="2"><strong>Resultado del periodo</strong></td>' +
      '<td><strong>' + formatMoney(totalIngresos - totalEgresos, 'CLP') + '</strong></td></tr></tfoot></table>';
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando EERR.</p>';
    showToast('Error cargando EERR.', 'error');
  }
}

document.getElementById('eerrFrom').addEventListener('change', loadEerr);
document.getElementById('eerrTo').addEventListener('change', loadEerr);

// ==============================
// IMPORTACION DE EXCEL
// ==============================
let pendingImportRows = null;

document.getElementById('excelFileInput').addEventListener('change', async function (e) {
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

    const parsed = rows
      .map(function (r) {
        return {
          transaction_date: r[0],
          type: String(r[1] || '').trim().toLowerCase(),
          category: r[2],
          description: r[3] || '',
          amount: Number(r[4]),
        };
      })
      .filter(function (r) { return (r.type === 'ingreso' || r.type === 'egreso') && r.transaction_date && !Number.isNaN(r.amount); });

    if (!parsed.length) {
      preview.innerHTML = '<p class="admin-note">No se encontraron filas validas. Revisa el formato de columnas.</p>';
      pendingImportRows = null;
      return;
    }

    pendingImportRows = { rows: parsed, file: file };
    preview.innerHTML =
      '<p class="admin-note">' + parsed.length + ' filas detectadas. Revisa antes de confirmar:</p>' +
      '<table class="admin-table">' +
      '<thead><tr><th>Fecha</th><th>Tipo</th><th>Categoria</th><th>Descripcion</th><th>Monto</th></tr></thead>' +
      '<tbody>' + parsed.slice(0, 50).map(function (r) {
        return '<tr><td>' + escapeHtml(r.transaction_date) + '</td><td>' + escapeHtml(r.type) + '</td><td>' + escapeHtml(r.category) + '</td><td>' + escapeHtml(r.description) + '</td><td>' + r.amount + '</td></tr>';
      }).join('') + '</tbody></table>' +
      (parsed.length > 50 ? '<p class="admin-note">Mostrando 50 de ' + parsed.length + '.</p>' : '') +
      '<button id="confirmImportBtn" class="admin-btn primary">Confirmar importacion</button> ' +
      '<button id="cancelImportBtn" class="admin-btn">Cancelar</button>' +
      '<p id="importMsg" class="admin-note"></p>';

    document.getElementById('cancelImportBtn').addEventListener('click', function () {
      pendingImportRows = null;
      preview.innerHTML = '';
      e.target.value = '';
    });
    document.getElementById('confirmImportBtn').addEventListener('click', confirmImport);
  } catch (err) {
    console.error('excel parse failed', err);
    preview.innerHTML = '<p class="admin-note">No se pudo leer el archivo. Es un .xlsx/.xls valido?</p>';
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

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const batchId = crypto.randomUUID();
    const storagePath = batchId + '/' + file.name;

    const { error: uploadError } = await supabase.storage.from('finance-imports').upload(storagePath, file);
    if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

    const { error: insertError } = await supabase.from('finance_transactions').insert(
      rows.map(function (r) {
        return {
          transaction_date: r.transaction_date,
          type: r.type,
          category: r.category || 'otro',
          description: r.description || null,
          amount: r.amount,
          currency: 'CLP',
          source: 'excel_import',
          import_batch_id: batchId,
          created_by: session.user.id,
        };
      })
    );

    await supabase.from('finance_imports').insert({
      filename: file.name,
      storage_path: storagePath,
      uploaded_by: session.user.id,
      row_count: rows.length,
      status: insertError ? 'error' : 'procesado',
      notes: insertError ? String(insertError.message || insertError) : null,
    });

    if (insertError) throw new Error('Insert failed: ' + insertError.message);

    msg.textContent = rows.length + ' movimientos importados con exito.';
    pendingImportRows = null;
    document.getElementById('excelFileInput').value = '';
    showToast(rows.length + ' movimientos importados.');
    await Promise.all([loadTransactionsTable(), loadCashFlow()]);
  } catch (err) {
    msg.textContent = 'Error: ' + err.message;
    confirmBtn.disabled = false;
    showToast('Error en importacion.', 'error');
  }
}

// ==============================
// DOCUMENTOS
// ==============================
async function loadDocuments() {
  const container = document.getElementById('documentsEditorContainer');
  container.innerHTML = loadingSkeleton(2);
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('event_id', currentEventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin documentos todavia.</p>'; return; }

    const results = await Promise.allSettled(data.map(async function (doc) {
      const { data: signed } = await supabase.storage.from('event-documents').createSignedUrl(doc.storage_path, 60 * 60);
      return { doc: doc, url: signed?.signedUrl || '#' };
    }));

    const links = results.filter(function (r) { return r.status === 'fulfilled'; }).map(function (r) { return r.value; });
    if (!links.length) { container.innerHTML = '<p class="admin-note">Error al cargar documentos.</p>'; return; }

    container.innerHTML = links.map(function (item) {
      const { doc, url } = item;
      return '<div class="admin-inline-fields" data-document-id="' + doc.id + '">' +
        '<span class="admin-badge">' + escapeHtml(doc.category) + '</span>' +
        '<a href="' + url + '" target="_blank" rel="noopener">' + escapeHtml(doc.filename) + '</a>' +
        '<button class="admin-btn delete-document-btn">Eliminar</button></div>';
    }).join('');

    container.querySelectorAll('.delete-document-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        if (!confirm('Eliminar este documento?')) return;
        const id = e.target.closest('[data-document-id]').dataset.documentId;
        const doc = data.find(function (d) { return d.id === id; });
        if (doc) await supabase.storage.from('event-documents').remove([doc.storage_path]);
        await supabase.from('documents').delete().eq('id', id);
        loadDocuments();
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando documentos.</p>';
    showToast('Error cargando documentos.', 'error');
  }
}

document.getElementById('addDocumentForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('documentUploadMsg');
  const file = form.file.files[0];
  if (!file) return;

  const { data: { session } } = await supabase.auth.getSession();
  const storagePath = currentEventId + '/' + Date.now() + '_' + file.name;

  msg.textContent = 'Subiendo...';
  try {
    const { error: uploadError } = await supabase.storage.from('event-documents').upload(storagePath, file);
    if (uploadError) throw new Error('upload failed: ' + uploadError.message);

    const { error: insertError } = await supabase.from('documents').insert({
      event_id: currentEventId,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      category: form.category.value,
      uploaded_by: session.user.id,
    });
    if (insertError) throw new Error('insert failed: ' + insertError.message);

    msg.textContent = 'Documento subido.';
    form.reset();
    loadDocuments();
    showToast('Documento subido.');
  } catch (err) {
    console.error('document upload failed', err);
    msg.textContent = 'Error al subir el archivo.';
    showToast('Error al subir documento.', 'error');
  }
});

// ==============================
// MENSAJES DEL EVENTO
// ==============================
async function loadMessages() {
  const container = document.getElementById('messagesEditorContainer');
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('event_id', currentEventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin mensajes todavia.</p>'; return; }

    container.innerHTML = data.map(function (m) {
      return '<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06);">' +
        '<span class="admin-badge">' + (m.sender_role === 'coordinador' ? 'Tu (coordinador)' : 'Cliente') + '</span> ' +
        '<span class="admin-note">' + new Date(m.created_at).toLocaleString('es-CL') + '</span>' +
        '<p>' + escapeHtml(m.body) + '</p></div>';
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando mensajes.</p>';
    showToast('Error cargando mensajes.', 'error');
  }
}

document.getElementById('addMessageForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('messages').insert({
      event_id: currentEventId,
      sender_id: session.user.id,
      sender_role: 'coordinador',
      body: form.body.value,
    });
    if (error) throw error;
    form.reset();
    loadMessages();
  } catch (err) {
    showToast('No se pudo enviar el mensaje.', 'error');
  }
});

// ==============================
// PLANTILLAS REUTILIZABLES
// ==============================
document.getElementById('applyTemplatesBtn').addEventListener('click', async function () {
  const msg = document.getElementById('applyTemplatesMsg');
  msg.textContent = 'Aplicando...';
  try {
    const { error } = await supabase.rpc('clone_templates_to_event', { p_event_id: currentEventId });
    if (error) throw error;
    msg.textContent = 'Plantillas aplicadas.';
    showToast('Plantillas aplicadas al evento.');
    await Promise.all([loadMilestones(), loadChecklist()]);
  } catch (err) {
    console.error('clone_templates_to_event failed', err);
    msg.textContent = 'No se pudieron aplicar las plantillas.';
    showToast('Error al aplicar plantillas.', 'error');
  }
});

async function loadMilestoneTemplates() {
  const container = document.getElementById('milestoneTemplatesContainer');
  container.innerHTML = loadingSkeleton(3);
  try {
    const { data, error } = await supabase
      .from('milestone_templates')
      .select('*')
      .order('event_type')
      .order('order_index');
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin plantillas de cronograma todavia.</p>'; return; }

    container.innerHTML = data.map(function (t) {
      return '<div class="admin-inline-fields" data-template-id="' + t.id + '">' +
        '<span class="admin-badge">' + escapeHtml(EVENT_TYPE_LABELS[t.event_type] || t.event_type) + '</span>' +
        '<strong>' + escapeHtml(t.phase_label) + '</strong>' +
        '<span>' + escapeHtml(t.title) + '</span>' +
        '<button class="admin-btn delete-milestone-template-btn">Eliminar</button></div>';
    }).join('');

    container.querySelectorAll('.delete-milestone-template-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        if (!confirm('Eliminar este hito de la plantilla?')) return;
        const id = e.target.closest('[data-template-id]').dataset.templateId;
        await supabase.from('milestone_templates').delete().eq('id', id);
        loadMilestoneTemplates();
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando plantillas de cronograma.</p>';
    showToast('Error cargando plantillas.', 'error');
  }
}

document.getElementById('addMilestoneTemplateForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const { count } = await supabase
      .from('milestone_templates')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', payload.event_type);
    const { error } = await supabase.from('milestone_templates').insert({
      event_type: payload.event_type,
      phase_label: payload.phase_label,
      title: payload.title,
      description: payload.description || null,
      order_index: count ?? 0,
    });
    if (error) throw error;
    form.reset();
    loadMilestoneTemplates();
    showToast('Plantilla de hito agregada.');
  } catch (err) {
    showToast('Error al agregar plantilla.', 'error');
  }
});

async function loadChecklistTemplates() {
  const container = document.getElementById('checklistTemplatesContainer');
  container.innerHTML = loadingSkeleton(3);
  try {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('*')
      .order('event_type')
      .order('order_index');
    if (error) throw error;
    if (!data || !data.length) { container.innerHTML = '<p class="admin-note">Sin plantillas de checklist todavia.</p>'; return; }

    container.innerHTML = data.map(function (t) {
      return '<div class="admin-inline-fields" data-template-id="' + t.id + '">' +
        '<span class="admin-badge">' + escapeHtml(EVENT_TYPE_LABELS[t.event_type] || t.event_type) + '</span>' +
        '<span class="admin-badge">' + escapeHtml(t.ceremony_type || 'cualquiera') + '</span>' +
        '<span class="admin-badge">' + escapeHtml(t.category) + '</span>' +
        '<span>' + escapeHtml(t.label) + '</span>' +
        '<button class="admin-btn delete-checklist-template-btn">Eliminar</button></div>';
    }).join('');

    container.querySelectorAll('.delete-checklist-template-btn').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        if (!confirm('Eliminar este item de la plantilla?')) return;
        const id = e.target.closest('[data-template-id]').dataset.templateId;
        await supabase.from('checklist_templates').delete().eq('id', id);
        loadChecklistTemplates();
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="admin-note">Error cargando plantillas de checklist.</p>';
    showToast('Error cargando plantillas.', 'error');
  }
}

document.getElementById('addChecklistTemplateForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const { count } = await supabase
      .from('checklist_templates')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', payload.event_type);
    const { error } = await supabase.from('checklist_templates').insert({
      event_type: payload.event_type,
      ceremony_type: payload.ceremony_type || null,
      category: payload.category,
      label: payload.label,
      order_index: count ?? 0,
    });
    if (error) throw error;
    form.reset();
    loadChecklistTemplates();
    showToast('Plantilla de checklist agregada.');
  } catch (err) {
    showToast('Error al agregar plantilla.', 'error');
  }
});
