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

async function renderDocuments(container, documents) {
  if (!documents || documents.length === 0) {
    setEmpty(container, 'Tu coordinador aún no ha compartido documentos.');
    return;
  }
  const links = await Promise.all(documents.map(async (doc) => {
    const { data } = await supabase.storage
      .from('event-documents')
      .createSignedUrl(doc.storage_path, 60 * 60);
    return { doc, url: data?.signedUrl || '#' };
  }));
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
  ['timelineContainer', 'checklistCivil', 'checklistAncestral', 'documentsContainer',
    'vendorCoordinacion', 'vendorProveedores', 'vendorEmergencias', 'checklistViaje']
    .forEach((id) => setEmpty(document.getElementById(id), message));
}

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

  const [milestonesRes, checklistRes, vendorsRes, documentsRes] = await Promise.all([
    supabase.from('event_milestones').select('*').eq('event_id', event.id).order('order_index'),
    supabase.from('checklist_items').select('*').eq('event_id', event.id).order('order_index'),
    supabase.from('vendor_contacts').select('*').or(`event_id.eq.${event.id},is_global.eq.true`),
    supabase.from('documents').select('*').eq('event_id', event.id).order('created_at', { ascending: false }),
  ]);

  renderTimeline(document.getElementById('timelineContainer'), milestonesRes.data);

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
