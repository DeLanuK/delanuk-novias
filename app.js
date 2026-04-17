// SUPABASE CONFIG
const SUPABASE_URL = 'https://pecldmaxcqrgjmljpqmx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KiTV2tgOvGrVJOs8ETM4LQ_enoANje2';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DATA CONSTANTS
const ETAPAS = [
  'Primer contacto respondido',
  'Presentacion enviada',
  'Reunion de descubrimiento',
  'Bocetos enviados',
  'Diseno aprobado',
  'Sena abonada',
  'Produccion iniciada',
  'Update semana 1',
  'Update semana 2',
  'Prueba final realizada',
  'Ajustes aplicados',
  'Saldo cobrado',
  'Packaging preparado',
  'Entrega realizada',
];

const BADGE_CLASS = {
  'Pendiente':         'b-pend',
  'Propuesta enviada': 'b-prop',
  'Confirmado':        'b-conf',
  'Produccion':        'b-prod',
  'Entregado':         'b-entr',
};

// STATE
let novias = [];
let editId = null; let noviaSort = { col: 'fecha', dir: 1 }; let dashSearch = '';
let fichaId = null;
let realtimeChannel = null;

function mkCheck(doneTo) {
  return ETAPAS.map((label, i) => ({ label, done: i < doneTo }));
}

// DATE PARSING
const MONTHS = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12,nov:11,dic:12,feb:2,mar:3,abr:4};

function parseDate(s) {
  if (!s || !s.trim()) return new Date(2099, 11, 31);
  const t = s.trim().toLowerCase();
  const yr = t.match(/\b(202[5-9]|203\d)\b/);
  const explicitY = yr ? +yr[1] : null;
  const dm = t.match(/^(\d{1,2})\/(\d{1,2})/);
  if (dm) {
    const [, d, m] = dm.map(Number);
    const y = explicitY || (m >= 8 ? 2025 : 2026);
    return new Date(y, m - 1, d);
  }
  for (const [k, v] of Object.entries(MONTHS)) {
    if (t.includes(k)) {
      const y = explicitY || (v >= 8 ? 2025 : 2026);
      return new Date(y, v - 1, 1);
    }
  }
  return new Date(2099, 11, 31);
}

function fmtDate(d) {
  if (d.getFullYear() >= 2099) return null;
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

// HELPERS
function fmt(n) { return new Intl.NumberFormat('es-AR').format(n || 0); }
function badge(estado) { return `<span class="badge ${BADGE_CLASS[estado] || 'b-pend'}">${estado || 'Pendiente'}</span>`; }

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function isUrgent(n) {
  const d = parseDate(n.fecha);
  if (d.getFullYear() >= 2099) return false;
  const daysUntil = (d - new Date()) / 86400000;
  const saldo = (n.total || 0) - (n.sena || 0);
  return daysUntil >= 0 && daysUntil < 30 && saldo > 0;
}

function waLink(tel) {
  const digits = (tel || '').replace(/\D/g, '');
  if (!digits) return null;
  const full = digits.startsWith('54') ? digits : '549' + digits.replace(/^0/, '');
  return 'https://wa.me/' + full;
}

function igLink(handle) {
  if (!handle) return null;
  const clean = handle.replace(/^@/, '').trim();
  return clean ? 'https://instagram.com/' + clean : null;
}

function nextAction(n) {
  if (!n.checklist) return null;
  const item = n.checklist.find(c => !c.done);
  return item ? item.label : null;
}

async function deleteNovia(id) {
  const n = novias.find(x => x.id === id);
  if (!n) return;
  if (!confirm(`¿Eliminar a ${n.nombre}? Esta acción no se puede deshacer.`)) return;
  const { error } = await sb.from('novias').delete().eq('id', id);
  if (error) { showToast('Error al eliminar'); return; }
  closeModal('ficha');
  showToast(`${n.nombre} eliminada`);
  await loadNovias();
}

// AUTH
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await showApp(session);
  } else {
    showLogin();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await showApp(session);
    } else if (event === 'SIGNED_OUT') {
      if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
      showLogin();
    }
  });
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
}

async function showApp(session) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').style.display = 'flex';
  document.getElementById('user-email').textContent = session.user.email;
  await loadNovias();
  subscribeRealtime();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit');
  const err = document.getElementById('login-error');
  err.textContent = '';
  btn.textContent = 'Ingresando...';
  btn.disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Ingresar';
  if (error) {
    err.textContent = 'Email o contrasena incorrectos';
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  if (!confirm('Cerrar sesion?')) return;
  await sb.auth.signOut();
});

// DATA LOAD + REALTIME
async function loadNovias() {
  const { data, error } = await sb.from('novias').select('*').order('id');
  if (error) {
    console.error('Error cargando novias:', error);
    showToast('Error cargando datos');
    return;
  }
  novias = data.map(n => ({
    ...n,
    checklist: Array.isArray(n.checklist) && n.checklist.length ? n.checklist : mkCheck(0),
    pagos: Array.isArray(n.pagos) ? n.pagos : [],
  }));
  renderDash();
  if (document.getElementById('view-novias').classList.contains('active')) renderNovias();
  if (document.getElementById('view-pagos').classList.contains('active')) renderPagos();
}

function subscribeRealtime() {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel('novias-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'novias' }, () => {
      loadNovias();
    })
    .subscribe();
}

// NAV
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.getElementById('view-' + view).classList.add('active');
    if (view === 'dashboard') renderDash();
    if (view === 'novias') renderNovias();
    if (view === 'pagos') renderPagos();
  });
});

['btn-add-dash', 'btn-add-novias', 'btn-add-side'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => openModal('add'));
});

// DASHBOARD
function renderDash() {
  const q = dashSearch.toLowerCase();
  const pend = novias.filter(n => n.estado === 'Pendiente').length;
  const conf = novias.filter(n => n.estado === 'Confirmado').length;
  const saldoTotal = novias.reduce((a, n) => a + ((n.total || 0) - (n.sena || 0)), 0);
  document.getElementById('dash-subtitle').textContent = `${novias.length} novias activas`;
  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Novias activas</div><div class="kpi-val rose">${novias.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pendientes accion</div><div class="kpi-val red">${pend}</div></div>
    <div class="kpi-card"><div class="kpi-label">Confirmadas</div><div class="kpi-val blue">${conf}</div></div>
    <div class="kpi-card"><div class="kpi-label">Saldo a cobrar</div><div class="kpi-val green">$${fmt(saldoTotal)}</div></div>
  `;
  // Sync search input if exists
  const si = document.getElementById('dash-search');
  if (si && si.value !== dashSearch) si.value = dashSearch;

  let filtered = [...novias].sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
  if (q) {
    filtered = filtered.filter(n =>
      (n.nombre || '').toLowerCase().includes(q) ||
      (n.ciudad || '').toLowerCase().includes(q) ||
      (n.piezas || '').toLowerCase().includes(q) ||
      (n.resp || '').toLowerCase().includes(q)
    );
  }
  const tbody = document.getElementById('dash-tbody');
  tbody.innerHTML = '';
  let prevMonth = '';
  filtered.forEach(n => {
    const d = parseDate(n.fecha);
    const monthLabel = fmtDate(d) || 'Sin fecha';
    if (monthLabel !== prevMonth) {
      prevMonth = monthLabel;
      tbody.insertAdjacentHTML('beforeend', `<tr class="month-divider"><td colspan="7">${monthLabel.toUpperCase()}</td></tr>`);
    }
    const saldo = n.total > 0 ? n.total - n.sena : null;
    const next = nextAction(n);
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="td-name">${escapeHtml(n.nombre)}</span>${isUrgent(n) ? ' <span class="badge b-urgent">Urgente</span>' : ''}</td>
        <td><span class="td-muted">${escapeHtml(n.fecha) || '-'}</span></td>
        <td>${badge(n.estado)}${next ? `<br><span class="next-action">▶ ${escapeHtml(next)}</span>` : ''}</td>
        <td class="td-piezas td-muted" title="${escapeHtml(n.piezas || '')}">${escapeHtml(n.piezas) || '-'}</td>
        <td><span class="td-muted">${escapeHtml(n.resp) || '-'}</span></td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">${saldo !== null ? '$' + fmt(saldo) : '-'}</td>
        <td><div class="row-actions"><button class="row-btn" onclick="openFicha(${n.id})">Ver ficha</button></div></td>
      </tr>
    `);
  });
}
// NOVIAS LIST
function renderNovias() {
  const q = (document.getElementById('search').value || '').toLowerCase();
  const est = document.getElementById('filter-estado').value;
  const { col, dir } = noviaSort;

  const filtered = [...novias]
    .filter(n => {
      const mq = !q || (n.nombre || '').toLowerCase().includes(q) || (n.ciudad || '').toLowerCase().includes(q) || (n.piezas || '').toLowerCase().includes(q);
      const me = !est || n.estado === est;
      return mq && me;
    })
    .sort((a, b) => {
      let va, vb;
      if (col === 'fecha') { va = parseDate(a.fecha); vb = parseDate(b.fecha); return dir * (va - vb); }
      if (col === 'estado') { va = a.estado || ''; vb = b.estado || ''; return dir * va.localeCompare(vb); }
      if (col === 'saldo') { va = (a.total||0)-(a.sena||0); vb = (b.total||0)-(b.sena||0); return dir * (va - vb); }
      return 0;
    });

  // Update sort arrows in headers
  ['fecha','estado','saldo'].forEach(c => {
    const th = document.getElementById('th-' + c);
    if (!th) return;
    th.dataset.sort = c;
    const arrow = col === c ? (dir === 1 ? ' ↑' : ' ↓') : ' ↕';
    th.querySelector('.sort-arrow').textContent = arrow;
  });

  const tbody = document.getElementById('novias-tbody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No se encontraron novias</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  filtered.forEach(n => {
    const saldo = n.total > 0 ? n.total - n.sena : null;
    const pagoBadge = n.total > 0
      ? (saldo === 0 ? `<span class="badge b-paid">Pagado</span>`
        : n.sena > 0 ? `<span class="badge b-partial">Sena</span>`
        : `<span class="badge b-nopago">Sin sena</span>`)
      : `<span class="td-muted">-</span>`;
    const next = nextAction(n);
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>
          <span class="td-name">${escapeHtml(n.nombre)}</span>${isUrgent(n) ? ' <span class="badge b-urgent">Urgente</span>' : ''}
          ${n.resp ? `<br><span class="td-muted">${escapeHtml(n.resp)}</span>` : ''}
        </td>
        <td class="td-muted">${escapeHtml(n.fecha) || '-'}</td>
        <td class="td-muted">${escapeHtml(n.ciudad) || '-'}</td>
        <td class="td-piezas td-muted" title="${escapeHtml(n.piezas || '')}">${escapeHtml(n.piezas) || '-'}</td>
        <td>${badge(n.estado)}${next ? `<br><span class="next-action">▶ ${escapeHtml(next)}</span>` : ''}</td>
        <td>${pagoBadge}</td>
        <td><div class="row-actions">
          <button class="row-btn" onclick="openFicha(${n.id})">Ficha</button>
          <button class="row-btn" onclick="openModal('edit',${n.id})">Editar</button>
        </div></td>
      </tr>
    `);
  });
}
// PAGOS
function renderPagos() {
  const withPago = novias.filter(n => (n.total || 0) > 0 || (n.sena || 0) > 0);
  const totalM = withPago.reduce((a, n) => a + (n.total || 0), 0);
  const totalC = withPago.reduce((a, n) => a + (n.sena || 0), 0);
  const totalS = totalM - totalC;

  document.getElementById('kpi-pagos').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total facturado</div><div class="kpi-val">$${fmt(totalM)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total cobrado</div><div class="kpi-val green">$${fmt(totalC)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Saldo pendiente</div><div class="kpi-val red">$${fmt(totalS)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Novias con pago</div><div class="kpi-val">${withPago.length}</div></div>
  `;

  const tbody = document.getElementById('pagos-tbody');
  if (!withPago.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No hay pagos registrados</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  withPago.forEach(n => {
    const saldo = (n.total || 0) - (n.sena || 0);
    const estBadge = saldo === 0 ? `<span class="badge b-paid">Pagado</span>` : n.sena > 0 ? `<span class="badge b-partial">Sena</span>` : `<span class="badge b-nopago">Sin sena</span>`;
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="td-name">${escapeHtml(n.nombre)}</span><br><span class="td-muted">${escapeHtml(n.fecha) || '-'}</span></td>
        <td class="amount">$${fmt(n.total)}</td>
        <td class="amount paid">$${fmt(n.sena)}</td>
        <td class="td-muted">${escapeHtml(n.fsena) || '-'}</td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">$${fmt(saldo)}</td>
        <td>${estBadge}</td>
      </tr>
    `);
  });
}

// MODAL FORM
function openModal(mode, id) {
  editId = mode === 'edit' ? id : null;
  const n = editId ? novias.find(x => x.id === editId) : null;
  document.getElementById('modal-form-title').textContent = n ? 'Editar novia' : 'Nueva novia';
  document.getElementById('f-nombre').value  = n ? (n.nombre || '')  : '';
  document.getElementById('f-fecha').value   = n ? (n.fecha || '')   : '';
  document.getElementById('f-tel').value     = n ? (n.tel || '')     : '';
  document.getElementById('f-ig').value      = n ? (n.ig || '')      : '';
  document.getElementById('f-ciudad').value  = n ? (n.ciudad || '')  : '';
  document.getElementById('f-tipo').value    = n ? (n.tipo || 'Iglesia y fiesta') : 'Iglesia y fiesta';
  document.getElementById('f-rol').value     = n ? (n.rol || 'Novia')  : 'Novia';
  document.getElementById('f-resp').value    = n ? (n.resp || '')    : '';
  document.getElementById('f-estado').value  = n ? (n.estado || 'Pendiente')  : 'Pendiente';
  document.getElementById('f-total').value   = n && n.total ? n.total : '';
  document.getElementById('f-sena').value    = n && n.sena ? n.sena : '';
  document.getElementById('f-fsena').value   = n ? (n.fsena || '')   : '';
  document.getElementById('f-piezas').value  = n ? (n.piezas || '')  : '';
  document.getElementById('f-notas').value   = n ? (n.notas || '')   : '';
  document.getElementById('overlay-form').classList.add('open');
}

function closeModal(which) {
  document.getElementById('overlay-' + which).classList.remove('open');
}

async function saveNovia() {
  const nombre = document.getElementById('f-nombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio'); return; }
  const data = {
    nombre,
    fecha:  document.getElementById('f-fecha').value.trim(),
    tel:    document.getElementById('f-tel').value.trim(),
    ig:     document.getElementById('f-ig').value.trim(),
    ciudad: document.getElementById('f-ciudad').value.trim(),
    tipo:   document.getElementById('f-tipo').value,
    rol:    document.getElementById('f-rol').value,
    resp:   document.getElementById('f-resp').value,
    estado: document.getElementById('f-estado').value,
    total:  parseInt(document.getElementById('f-total').value) || 0,
    sena:   parseInt(document.getElementById('f-sena').value) || 0,
    fsena:  document.getElementById('f-fsena').value.trim(),
    piezas: document.getElementById('f-piezas').value.trim(),
    notas:  document.getElementById('f-notas').value.trim(),
  };
  let error;
  if (editId) {
    ({ error } = await sb.from('novias').update(data).eq('id', editId));
  } else {
    data.checklist = mkCheck(0);
    ({ error } = await sb.from('novias').insert(data));
  }
  if (error) { alert('Error guardando: ' + error.message); return; }
  closeModal('form');
  showToast(editId ? 'Novia actualizada' : 'Novia agregada');
  await loadNovias();
}

// FICHA
function openFicha(id) {
  fichaId = id;
  const n = novias.find(x => x.id === id);
  const done = n.checklist.filter(c => c.done).length;
  const saldo = (n.total || 0) - (n.sena || 0);

  const wa = waLink(n.tel);
  const ig = igLink(n.ig);
  document.getElementById('ficha-name').textContent = n.nombre;
  document.getElementById('ficha-body').innerHTML = `
    <div class="ficha-hero">
      <div>
        <div class="ficha-hero-name">${escapeHtml(n.nombre)} ${badge(n.estado)}${isUrgent(n) ? ' <span class="badge b-urgent">Urgente</span>' : ''}</div>
        <div class="ficha-hero-sub">
          ${escapeHtml(n.fecha) || 'Fecha a confirmar'} - ${escapeHtml(n.ciudad) || '-'} - ${escapeHtml(n.tipo) || '-'}<br>
          ${escapeHtml(n.rol || '')}${n.resp ? ' - Responsable: ' + escapeHtml(n.resp) : ''}
        </div>
      </div>
    </div>
    ${(wa || ig) ? `<div class="ficha-sec">Contacto</div>
      <div class="contact-row">
        ${wa ? `<a class="chip chip-link" href="${wa}" target="_blank" rel="noopener">WhatsApp · ${escapeHtml(n.tel)}</a>` : ''}
        ${ig ? `<a class="chip chip-link" href="${ig}" target="_blank" rel="noopener">Instagram · ${escapeHtml(n.ig)}</a>` : ''}
      </div>` : ''}
    ${n.piezas ? `<div class="ficha-sec">Piezas encargadas</div><div class="ficha-piezas">${escapeHtml(n.piezas)}</div>` : ''}
    ${n.notas ? `<div class="ficha-sec">Notas internas</div><div class="ficha-notas">${escapeHtml(n.notas)}</div>` : ''}
    <div class="ficha-sec">Pagos</div>
    <div class="pago-cards">
      <div class="pago-card"><div class="pc-label">Presupuesto</div><div class="pc-val rose">${n.total > 0 ? '$' + fmt(n.total) : '-'}</div></div>
      <div class="pago-card"><div class="pc-label">Cobrado</div><div class="pc-val green">${n.sena > 0 ? '$' + fmt(n.sena) : '-'}</div></div>
      <div class="pago-card"><div class="pc-label">Saldo</div><div class="pc-val ${saldo > 0 ? 'red' : ''}">${n.total > 0 ? '$' + fmt(saldo) : '-'}</div></div>
    </div>
    ${(n.pagos && n.pagos.length > 0) ? '<div class="pagos-lista">' + n.pagos.map((p, i) => '<div class="pago-item"><span class="pago-fecha">' + p.fecha + '</span><span class="pago-concepto">' + escapeHtml(p.concepto) + '</span><span class="pago-monto">' + '$' + fmt(p.monto) + '</span><button class="pago-del" onclick="deletePago(' + n.id + ',' + i + ')">×</button></div>').join('') + '</div>' : '<p class="ck-date" style="margin:4px 0 8px">Sin pagos registrados</p>'}
    <div class="pago-add-row">
      <input class="pago-input" id="pago-monto-${n.id}" type="number" placeholder="Monto $" min="1">
      <input class="pago-input" id="pago-concepto-${n.id}" type="text" placeholder="Concepto">
      <button class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="addPago(${n.id})">+ Agregar</button>
    </div>    <div class="ficha-sec">Proceso - ${done}/${n.checklist.length} etapas completadas</div>
    <div class="checklist" id="checklist-${id}"></div>
  `;
  renderChecklist(n);
  document.getElementById('overlay-ficha').classList.add('open');
}

function renderChecklist(n) {
  const el = document.getElementById('checklist-' + n.id);
  if (!el) return;
  el.innerHTML = '';
  n.checklist.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'check-item' + (c.done ? ' done' : '');
    div.onclick = () => toggleCheck(n.id, i);
    const dateStr = c.done && c.fechaDone
      ? '<span class="ck-date">' + new Date(c.fechaDone).toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'2-digit'}) + '</span>'
      : '';
    div.innerHTML = '<div class="ck-box">' + (c.done ? '✓' : '') + '</div><span class="ck-label">' + escapeHtml(c.label) + '</span>' + dateStr;
    el.appendChild(div);
  });
}
async function toggleCheck(nid, idx) {
  const n = novias.find(x => x.id === nid);
  const wasDone = n.checklist[idx].done;
  n.checklist[idx].done = !wasDone;
  n.checklist[idx].fechaDone = !wasDone ? new Date().toISOString() : null;
  renderChecklist(n);
  const { error } = await sb.from('novias').update({ checklist: n.checklist }).eq('id', nid);
  if (error) {
    n.checklist[idx].done = wasDone;
    n.checklist[idx].fechaDone = wasDone ? n.checklist[idx].fechaDone : null;
    renderChecklist(n);
    showToast('Error guardando cambio');
  }
}
async function addPago(nid) {
  const montoEl = document.getElementById('pago-monto-' + nid);
  const concEl = document.getElementById('pago-concepto-' + nid);
  const monto = parseInt(montoEl ? montoEl.value : 0) || 0;
  const concepto = concEl ? (concEl.value.trim() || 'Pago') : 'Pago';
  if (!monto) { showToast('Ingresa un monto'); return; }
  const n = novias.find(x => x.id === nid);
  const nuevoPago = { fecha: new Date().toISOString().slice(0,10), monto, concepto };
  const pagosActualizados = [...(n.pagos || []), nuevoPago];
  const totalCobrado = pagosActualizados.reduce((a, p) => a + p.monto, 0);
  const { error } = await sb.from('novias').update({ pagos: pagosActualizados, sena: totalCobrado }).eq('id', nid);
  if (error) { showToast('Error guardando pago'); return; }
  showToast('Pago registrado');
  await loadNovias();
  openFicha(nid);
}

async function deletePago(nid, idx) {
  if (!confirm('Eliminar este pago?')) return;
  const n = novias.find(x => x.id === nid);
  const pagosActualizados = (n.pagos || []).filter((_, i) => i !== idx);
  const totalCobrado = pagosActualizados.reduce((a, p) => a + p.monto, 0);
  const { error } = await sb.from('novias').update({ pagos: pagosActualizados, sena: totalCobrado }).eq('id', nid);
  if (error) { showToast('Error eliminando pago'); return; }
  showToast('Pago eliminado');
  await loadNovias();
  openFicha(nid);
}

function editFromFicha() {
  closeModal('ficha');
  openModal('edit', fichaId);
}

// CLOSE ON OVERLAY CLICK
document.querySelectorAll('.overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// INIT
initAuth();
