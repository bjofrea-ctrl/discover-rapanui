// Discover Rapa Nui — carga y renderiza los datos reales del cliente autenticado.
// Todo el filtrado por cliente lo resuelve Row Level Security en Supabase:
// estas queries solo devuelven filas del evento del usuario logueado (o todo, si es admin).
import { supabase } from './supabaseClient.js';

const CATEGORY_LABELS_CIVIL = 'documentos_civil';
const CATEGORY_LABELS_ANCESTRAL = 'documentos_ancestral';
const CATEGORY_VIAJE = 'viaje';

const VENDOR_COORDINACION = new Set(['coordinador']);
const VENDOR_EMERGENCIAS = new Set(['emergencia']);
const VENDOR_PROVEEDORES = new Set(['fotografia', 'banqueteria', 'musica', 'flores', 'otro']);

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

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function setEmpty(el, message) {
  if (el) el.innerHTML = `<p class="portal-empty-state">${escapeHtml(message)}</p>`;
}

function renderTimeline(container, milestones) {
  if (!milestones || milestones.length === 0) {
    setEmpty(container, 'Tu coordinador está preparando tu cronograma. Vuelve pronto.');
    return;
  }
  container.innerHTML = milestones.map((m) => `
    <div class="timeline-item timeline-item--${escapeHtml(m.status)}">
      <span class="meta">${escapeHtml(m.phase_label)}${m.status === 'completado' ? ' · ✓' : ''}</span>
      <h4>${escapeHtml(m.title)}</h4>
      <p>${escapeHtml(m.description || '')}</p>
    </div>
  `).join('');
}

function renderChecklistGroup(container, items, onToggle) {
  if (!items || items.length === 0) {
    setEmpty(container, 'Sin ítems por ahora.');
    return;
  }
  container.innerHTML = `<div>${items.map((item) => `
    <label class="checklist-item">
      <input type="checkbox" data-item-id="${item.id}" ${item.is_checked ? 'checked' : ''}>
      ${escapeHtml(item.label)}
    </label>
  `).join('')}</div>`;
  container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => onToggle(cb.dataset.itemId, cb.checked, cb));
  });
}

function renderVendorList(container, vendors) {
  if (!vendors || vendors.length === 0) {
    setEmpty(container, 'Aún no hay contactos asignados.');
    return;
  }
  container.innerHTML = `<ul>${vendors.map((v) => `
    <li>
      <strong>${escapeHtml(v.name)}</strong>${v.category === 'coordinador' || v.is_global ? '' : ` (${escapeHtml(v.category)})`}
      ${v.phone ? `<br>Tel: ${escapeHtml(v.phone)}` : ''}
      ${v.email ? `<br>Email: ${escapeHtml(v.email)}` : ''}
      ${v.notes ? `<br><small>${escapeHtml(v.notes)}</small>` : ''}
    </li>
  `).join('')}</ul>`;
}

function renderServices(container, services) {
  if (!services || services.length === 0) {
    setEmpty(container, 'Tu coordinador aún no ha cargado las actividades de tu experiencia.');
    return;
  }
  container.innerHTML = `<ul>${services.map((s) => `
    <li>
      <strong>${escapeHtml(SERVICE_TYPE_LABELS[s.service_type] || s.service_type)}</strong>
      ${s.description ? ` — ${escapeHtml(s.description)}` : ''}
      ${s.scheduled_date ? `<br><small>${escapeHtml(s.scheduled_date)}</small>` : ''}
    </li>
  `).join('')}</ul>`;
}

async function renderDocuments(container, documents) {
  if (!documents || documents.length === 0) {
    setEmpty(container, 'Tu coordinador aún no ha compartido documentos.');
    return;
  }
  const results = await Promise.allSettled(documents.map(async (doc) => {
    const { data } = await supabase.storage
      .from('event-documents')
      .createSignedUrl(doc.storage_path, 60 * 60);
    return { doc, url: data?.signedUrl || '#' };
  }));
  const links = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
  if (links.length === 0) {
    setEmpty(container, 'Error al cargar documentos. Intenta de nuevo más tarde.');
    return;
  }
  container.innerHTML = `<ul>${links.map(({ doc, url }) => `
    <li><a href="${url}" target="_blank" rel="noopener">${escapeHtml(doc.filename)}</a> <small>(${escapeHtml(doc.category)})</small></li>
  `).join('')}</ul>`;
}

async function toggleChecklistItem(itemId, checked, checkboxEl) {
  checkboxEl.disabled = true;
  const { error } = await supabase.rpc('toggle_checklist_item', {
    p_item_id: itemId,
    p_checked: checked,
  });
  checkboxEl.disabled = false;
  if (error) {
    console.error('toggle_checklist_item failed', error);
    checkboxEl.checked = !checked; // revertir en caso de error
  }
}

function showNoEventState() {
  const message = 'Aún no vinculamos un evento a tu cuenta. Escríbenos a tu coordinador y lo resolvemos.';
  ['timelineContainer', 'servicesContainer', 'checklistCivil', 'checklistAncestral', 'documentsContainer',
    'vendorCoordinacion', 'vendorProveedores', 'vendorEmergencias', 'checklistViaje', 'messagesContainer']
    .forEach((id) => setEmpty(document.getElementById(id), message));
}

let currentEventId = null;

function renderMessages(container, messages) {
  if (!messages || messages.length === 0) {
    setEmpty(container, 'Aún no hay mensajes. Escríbele a tu coordinador cuando quieras.');
    return;
  }
  container.innerHTML = messages.map((m) => `
    <div style="padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
      <strong>${m.sender_role === 'cliente' ? 'Tú' : 'Tu coordinador'}</strong>
      <small style="color: var(--text-light); margin-left: 8px;">${new Date(m.created_at).toLocaleString('es-CL')}</small>
      <p>${escapeHtml(m.body)}</p>
    </div>
  `).join('');
}

let messagesPollId = null;

async function loadMessages() {
  if (!currentEventId) return;
  const container = document.getElementById('messagesContainer');
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('event_id', currentEventId)
    .order('created_at', { ascending: true });
  if (error) { console.error('load messages failed', error); return; }
  renderMessages(container, data);
}

function startMessagesPoll() {
  stopMessagesPoll();
  loadMessages();
  messagesPollId = setInterval(loadMessages, 30000);
}

function stopMessagesPoll() {
  if (messagesPollId) {
    clearInterval(messagesPollId);
    messagesPollId = null;
  }
}

document.getElementById('messageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentEventId) return;
  const bodyInput = document.getElementById('messageBody');
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.from('messages').insert({
    event_id: currentEventId,
    sender_id: session.user.id,
    sender_role: 'cliente',
    body: bodyInput.value,
  });
  if (error) {
    console.error('send message failed', error);
    return;
  }
  bodyInput.value = '';
  loadMessages(); // refresh inmediato, no esperar poll
});

async function loadAndRender(session) {
  const welcomeNames = document.getElementById('welcomeNames');

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, partner1_name, partner2_name')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();

  if (clientError || !client) {
    console.error('client lookup failed', clientError);
    showNoEventState();
    return;
  }

  if (welcomeNames && (client.partner1_name || client.partner2_name)) {
    welcomeNames.textContent = ` ${[client.partner1_name, client.partner2_name].filter(Boolean).join(' & ')}`;
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('client_id', client.id)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError || !event) {
    showNoEventState();
    return;
  }

  currentEventId = event.id;

  const [milestonesRes, checklistRes, vendorsRes, documentsRes, servicesRes] = await Promise.all([
    supabase.from('event_milestones').select('*').eq('event_id', event.id).order('order_index'),
    supabase.from('checklist_items').select('*').eq('event_id', event.id).order('order_index'),
    supabase.from('vendor_contacts').select('*').or(`event_id.eq.${event.id},is_global.eq.true`),
    supabase.from('documents').select('*').eq('event_id', event.id).order('created_at', { ascending: false }),
    supabase.from('event_services').select('*').eq('event_id', event.id).order('scheduled_date', { ascending: true, nullsFirst: false }),
  ]);

  startMessagesPoll();

  renderTimeline(document.getElementById('timelineContainer'), milestonesRes.data);
  renderServices(document.getElementById('servicesContainer'), servicesRes.data);

  const checklist = checklistRes.data || [];
  renderChecklistGroup(
    document.getElementById('checklistCivil'),
    checklist.filter((i) => i.category === CATEGORY_LABELS_CIVIL),
    toggleChecklistItem
  );
  renderChecklistGroup(
    document.getElementById('checklistAncestral'),
    checklist.filter((i) => i.category === CATEGORY_LABELS_ANCESTRAL),
    toggleChecklistItem
  );
  renderChecklistGroup(
    document.getElementById('checklistViaje'),
    checklist.filter((i) => i.category === CATEGORY_VIAJE),
    toggleChecklistItem
  );

  const vendors = vendorsRes.data || [];
  renderVendorList(
    document.getElementById('vendorCoordinacion'),
    vendors.filter((v) => VENDOR_COORDINACION.has(v.category))
  );
  renderVendorList(
    document.getElementById('vendorProveedores'),
    vendors.filter((v) => VENDOR_PROVEEDORES.has(v.category))
  );
  renderVendorList(
    document.getElementById('vendorEmergencias'),
    vendors.filter((v) => VENDOR_EMERGENCIAS.has(v.category))
  );

  await renderDocuments(document.getElementById('documentsContainer'), documentsRes.data);
}

async function init() {
  const { data } = await supabase.auth.getSession();
  if (data.session) await loadAndRender(data.session);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) loadAndRender(session);
  });
}

init();
