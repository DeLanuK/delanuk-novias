────────────────────────────────────────────────────────────────────────────────────────────────────────────────────óóññóó────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────ñ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────·─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────// ── DATA ──────────────────────────────────────────────────────────────────
const ETAPAS = [
  'Primer contacto respondido',
  'Presentación enviada',
  'Reunión de descubrimiento',
  'Bocetos enviados',
  'Diseño aprobado',
  'Seña abonada',
  'Producción iniciada',
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
  'Producción':        'b-prod',
  'Entregado':         'b-entr',
};

let novias = [
  {id:1, nombre:'Lila Moreno',         fecha:'22/08/2025', tel:'3814016822',  ig:'',           ciudad:'Córdoba',       tipo:'',               rol:'Novia',   resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Orquillas (alpaca/plata/perlas) + aros medianos',                                    notas:'',                                   checklist:mkCheck(0)},
  {id:2, nombre:'Milagros Alloatti',   fecha:'20/09/2025', tel:'',            ig:'',           ciudad:'La Paz',        tipo:'Fiesta',         rol:'Novia',   resp:'',       estado:'Propuesta enviada', total:0,      sena:0,      fsena:'',     piezas:'Gargantilla de perlas y aros mini',                                                  notas:'',                                   checklist:mkCheck(2)},
  {id:3, nombre:'Lucrecia Sarria',     fecha:'27/09/2025', tel:'3512358379',  ig:'',           ciudad:'Córdoba',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Aros nuevos',                                                                       notas:'',                                   checklist:mkCheck(0)},
  {id:4, nombre:'Camila Flores',       fecha:'09/10/2025', tel:'2212007507',  ig:'',           ciudad:'Villa María',   tipo:'Iglesia y fiesta',rol:'Novia',  resp:'Marina', estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Dos orquillas perlas plateadas + aritos con perla mediana',                          notas:'Mandar opciones de orquillas y aritos',checklist:mkCheck(0)},
  {id:5, nombre:'Sol Boccardo',        fecha:'18/10/2025', tel:'',            ig:'',           ciudad:'Córdoba',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Ver aros nuevos perlas + brazalete Oriente',                                        notas:'Confirmar visita al local',           checklist:mkCheck(0)},
  {id:6, nombre:'Martina Muñoz',       fecha:'25/10/2025', tel:'3516360311',  ig:'',           ciudad:'Córdoba',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'Lucía',  estado:'Confirmado',        total:0,      sena:0,      fsena:'',     piezas:'2 cadenas espalda (31cm+corta) + Aros Mistral base bolita ORO',                      notas:'',                                   checklist:mkCheck(5)},
  {id:7, nombre:'Ana Allende',         fecha:'26/10/2025', tel:'',            ig:'',           ciudad:'Córdoba',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Aplique cinturón bronce (orfebrería) + aros + anillo bronce',                        notas:'Ella trae tela al local — definir material',checklist:mkCheck(0)},
  {id:8, nombre:'Gabriela Amesa',      fecha:'Nov/2025',   tel:'',            ig:'@gabiamesa', ciudad:'Córdoba',       tipo:'',               rol:'Novia',   resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Aros Gaviota ORO',                                                                  notas:'Enviar precios aros nuevos',          checklist:mkCheck(0)},
  {id:9, nombre:'Constanza Ros',       fecha:'14/11/2025', tel:'2645305033',  ig:'@coti.ross', ciudad:'San Juan',      tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Cadenita espalda con perlas ORO',                                                   notas:'Hablar con amiga — pasarle precio aros',checklist:mkCheck(0)},
  {id:10,nombre:'Sofia Liotta',        fecha:'22/11/2025', tel:'34645200410', ig:'',           ciudad:'Córdoba',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Aros Menfis alpaca o aros plata base redonda + 3 perlitas colgantes',               notas:'',                                   checklist:mkCheck(0)},
  {id:11,nombre:'Diana',               fecha:'07/12/2025', tel:'3516798378',  ig:'',           ciudad:'CABA',          tipo:'',               rol:'Novia',   resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Aros Mistral ORO (hacer)',                                                          notas:'',                                   checklist:mkCheck(0)},
  {id:12,nombre:'Luciana Naief',       fecha:'13/12/2025', tel:'1131569984',  ig:'',           ciudad:'Córdoba',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Aros Mistral PLATA (hacer) + presupuesto tocado + cadenita Capri plata',             notas:'',                                   checklist:mkCheck(0)},
  {id:13,nombre:'Flor Zunino',         fecha:'02/02/2026', tel:'358043378',   ig:'',           ciudad:'Córdoba',       tipo:'',               rol:'Novia',   resp:'Lucía',  estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Orquillas + collar',                                                                notas:'⚠️ PARA JUEVES 19/02 — URGENTE',     checklist:mkCheck(0)},
  {id:14,nombre:'Sofi Mosso',          fecha:'07/03/2026', tel:'3854862293',  ig:'',           ciudad:'Córdoba',       tipo:'',               rol:'Novia',   resp:'Marina', estado:'Confirmado',        total:274000, sena:137000, fsena:'03/03',piezas:'Aros Céfiro plateados + brazalete Mumbai + tocado con perlas en rodete',             notas:'',                                   checklist:mkCheck(6)},
  {id:15,nombre:'Guadalupe Díaz',      fecha:'28/03/2026', tel:'34602699151', ig:'',           ciudad:'Río Cuarto',    tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Collar cadena + perlas dispersas 40cm regulable',                                  notas:'Enviar presupuesto',                 checklist:mkCheck(0)},
  {id:16,nombre:'Florencia Cacso',     fecha:'28/03/2026', tel:'3564473784',  ig:'',           ciudad:'San Francisco', tipo:'',               rol:'Novia',   resp:'',       estado:'Confirmado',        total:0,      sena:0,      fsena:'',     piezas:'Tocado tipo Paula Patiño',                                                          notas:'Foto tomada en cel — revisar',       checklist:mkCheck(3)},
  {id:17,nombre:'Sofía Giménez',       fecha:'04/04/2026', tel:'1168819910',  ig:'',           ciudad:'Córdoba',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Orquillas + aros de perla',                                                         notas:'',                                   checklist:mkCheck(0)},
  {id:18,nombre:'Pili',                fecha:'25/04/2026', tel:'3517514732',  ig:'',           ciudad:'Córdoba',       tipo:'',               rol:'Novia',   resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Collar gargantilla plateado + aros pequeños + pulsera o anillo',                    notas:'',                                   checklist:mkCheck(0)},
  {id:19,nombre:'Ángeles',             fecha:'02/05/2026', tel:'3513983601',  ig:'',           ciudad:'Río Cuarto',    tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:237600, sena:118800, fsena:'03/03',piezas:'4 piezas bronce: 3 chapones para vestido + anillo + 2 pares aritos',                notas:'Mandar ideas y presupuesto',         checklist:mkCheck(0)},
  {id:20,nombre:'Victoria Poggio',     fecha:'09/05/2026', tel:'1144241079',  ig:'',           ciudad:'Tucumán',       tipo:'Iglesia y fiesta',rol:'Novia',  resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Aros Paloma + brazalete',                                                           notas:'No responde — reintentar contacto',  checklist:mkCheck(0)},
  {id:21,nombre:'Cande Sarria',        fecha:'16/05/2026', tel:'',            ig:'',           ciudad:'Córdoba',       tipo:'',               rol:'Novia',   resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Brazalete bronce con piedra sentimental + collar con perla',                        notas:'Confirmar adaptación piedra',        checklist:mkCheck(0)},
  {id:22,nombre:'Julieta Lomonaco',    fecha:'Mar/2027',   tel:'3534219297',  ig:'',           ciudad:'Buenos Aires',  tipo:'',               rol:'Novia',   resp:'',       estado:'Pendiente',         total:0,      sena:0,      fsena:'',     piezas:'Rosario simbólico plata + Aros Evia plateados + tocado alpaca+perlas',              notas:'',                                   checklist:mkCheck(0)},
  {id:23,nombre:'Cami (orquillas)',    fecha:'',           tel:'',            ig:'',           ciudad:'',              tipo:'',               rol:'Novia',   resp:'',       estado:'Pendiente',         total:136000, sena:68000,  fsena:'17/03',piezas:'Orquillas x2',                                                                       notas:'Seña $68.000 abonada el 17/03',      checklist:mkCheck(0)},
];

let nextId = 30;
let editId = null;
let fichaId = null;

function mkCheck(doneTo) {
  return ETAPAS.map((label, i) => ({ label, done: i < doneTo }));
}

// ── DATE PARSING ───────────────────────────────────────────────────────────
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

// ── HELPERS ────────────────────────────────────────────────────────────────
function fmt(n) { return new Intl.NumberFormat('es-AR').format(n || 0); }
function badge(estado) { return `<span class="badge ${BADGE_CLASS[estado] || 'b-pend'}">${estado || 'Pendiente'}</span>`; }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ── NAV ────────────────────────────────────────────────────────────────────
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

// ── DASHBOARD ──────────────────────────────────────────────────────────────
function renderDash() {
  const pend  = novias.filter(n => n.estado === 'Pendiente').length;
  const conf  = novias.filter(n => n.estado === 'Confirmado').length;
  const prod  = novias.filter(n => n.estado === 'Producción').length;
  const saldo = novias.reduce((a, n) => a + (n.total - n.sena), 0);

  document.getElementById('dash-subtitle').textContent = `${novias.length} novias activas · ${new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}`;

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi"><div class="kpi-label">Novias activas</div><div class="kpi-val rose">${novias.length}</div></div>
    <div class="kpi"><div class="kpi-label">Pendientes acción</div><div class="kpi-val red">${pend}</div></div>
    <div class="kpi"><div class="kpi-label">Confirmadas</div><div class="kpi-val blue">${conf}</div></div>
    <div class="kpi"><div class="kpi-label">Saldo a cobrar</div><div class="kpi-val green">$${fmt(saldo)}</div></div>
  `;

  const sorted = [...novias].sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
  const tbody = document.getElementById('dash-tbody');
  tbody.innerHTML = '';
  let prevMonth = '';

  sorted.forEach(n => {
    const d = parseDate(n.fecha);
    const monthLabel = fmtDate(d) || 'Sin fecha';
    if (monthLabel !== prevMonth) {
      prevMonth = monthLabel;
      tbody.insertAdjacentHTML('beforeend', `<tr class="month-divider"><td colspan="7">${monthLabel.toUpperCase()}</td></tr>`);
    }
    const saldo = n.total > 0 ? n.total - n.sena : null;
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="td-name">${n.nombre}</span></td>
        <td><span class="td-muted">${n.fecha || '—'}</span></td>
        <td>${badge(n.estado)}</td>
        <td class="td-piezas td-muted" title="${n.piezas}">${n.piezas || '—'}</td>
        <td><span class="td-muted">${n.resp || '—'}</span></td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">${saldo !== null ? '$' + fmt(saldo) : '—'}</td>
        <td><div class="row-actions"><button class="row-btn" onclick="openFicha(${n.id})">Ver ficha</button></div></td>
      </tr>
    `);
  });
}

// ── NOVIAS LIST ────────────────────────────────────────────────────────────
function renderNovias() {
  const q = (document.getElementById('search').value || '').toLowerCase();
  const est = document.getElementById('filter-estado').value;
  const filtered = [...novias]
    .sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha))
    .filter(n => {
      const mq = !q || n.nombre.toLowerCase().includes(q) || n.ciudad.toLowerCase().includes(q) || n.piezas.toLowerCase().includes(q);
      const me = !est || n.estado === est;
      return mq && me;
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
      ? (saldo === 0 ? `<span class="badge b-paid">Pagado</span>` : n.sena > 0 ? `<span class="badge b-partial">Seña</span>` : `<span class="badge b-nopago">Sin seña</span>`)
      : `<span class="td-muted">—</span>`;
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>
          <span class="td-name">${n.nombre}</span>
          ${n.resp ? `<br><span class="td-muted">${n.resp}</span>` : ''}
        </td>
        <td class="td-muted">${n.fecha || '—'}</td>
        <td class="td-muted">${n.ciudad || '—'}</td>
        <td class="td-piezas td-muted" title="${n.piezas}">${n.piezas || '—'}</td>
        <td>${badge(n.estado)}</td>
        <td>${pagoBadge}</td>
        <td><div class="row-actions">
          <button class="row-btn" onclick="openFicha(${n.id})">Ficha</button>
          <button class="row-btn" onclick="openModal('edit',${n.id})">Editar</button>
        </div></td>
      </tr>
    `);
  });
}

// ── PAGOS ──────────────────────────────────────────────────────────────────
function renderPagos() {
  const withPago = novias.filter(n => n.total > 0 || n.sena > 0);
  const totalM = withPago.reduce((a, n) => a + n.total, 0);
  const totalC = withPago.reduce((a, n) => a + n.sena, 0);
  const totalS = totalM - totalC;

  document.getElementById('kpi-pagos').innerHTML = `
    <div class="kpi"><div class="kpi-label">Total facturado</div><div class="kpi-val">$${fmt(totalM)}</div></div>
    <div class="kpi"><div class="kpi-label">Total cobrado</div><div class="kpi-val green">$${fmt(totalC)}</div></div>
    <div class="kpi"><div class="kpi-label">Saldo pendiente</div><div class="kpi-val red">$${fmt(totalS)}</div></div>
    <div class="kpi"><div class="kpi-label">Novias con pago</div><div class="kpi-val">${withPago.length}</div></div>
  `;

  const tbody = document.getElementById('pagos-tbody');
  if (!withPago.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No hay pagos registrados</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  withPago.forEach(n => {
    const saldo = n.total - n.sena;
    const estBadge = saldo === 0 ? `<span class="badge b-paid">Pagado</span>` : n.sena > 0 ? `<span class="badge b-partial">Seña</span>` : `<span class="badge b-nopago">Sin seña</span>`;
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="td-name">${n.nombre}</span><br><span class="td-muted">${n.fecha || '—'}</span></td>
        <td class="amount">$${fmt(n.total)}</td>
        <td class="amount paid">$${fmt(n.sena)}</td>
        <td class="td-muted">${n.fsena || '—'}</td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">$${fmt(saldo)}</td>
        <td>${estBadge}</td>
      </tr>
    `);
  });
}

// ── MODAL FORM ─────────────────────────────────────────────────────────────
function openModal(mode, id) {
  editId = mode === 'edit' ? id : null;
  const n = editId ? novias.find(x => x.id === editId) : null;
  document.getElementById('modal-form-title').textContent = n ? 'Editar novia' : 'Nueva novia';
  document.getElementById('f-nombre').value  = n ? n.nombre  : '';
  document.getElementById('f-fecha').value   = n ? n.fecha   : '';
  document.getElementById('f-tel').value     = n ? n.tel     : '';
  document.getElementById('f-ig').value      = n ? n.ig      : '';
  document.getElementById('f-ciudad').value  = n ? n.ciudad  : '';
  document.getElementById('f-tipo').value    = n ? n.tipo    : 'Iglesia y fiesta';
  document.getElementById('f-rol').value     = n ? n.rol     : 'Novia';
  document.getElementById('f-resp').value    = n ? n.resp    : '';
  document.getElementById('f-estado').value  = n ? n.estado  : 'Pendiente';
  document.getElementById('f-total').value   = n ? n.total   : '';
  document.getElementById('f-sena').value    = n ? n.sena    : '';
  document.getElementById('f-fsena').value   = n ? n.fsena   : '';
  document.getElementById('f-piezas').value  = n ? n.piezas  : '';
  document.getElementById('f-notas').value   = n ? n.notas   : '';
  document.getElementById('overlay-form').classList.add('open');
}

function closeModal(which) {
  document.getElementById('overlay-' + which).classList.remove('open');
}

function saveNovia() {
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
  if (editId) {
    const idx = novias.findIndex(x => x.id === editId);
    novias[idx] = { ...novias[idx], ...data };
  } else {
    novias.push({ id: nextId++, ...data, checklist: mkCheck(0) });
  }
  closeModal('form');
  showToast(editId ? 'Novia actualizada' : 'Novia agregada');
  renderDash();
  if (document.getElementById('view-novias').classList.contains('active')) renderNovias();
  if (document.getElementById('view-pagos').classList.contains('active')) renderPagos();
}

// ── FICHA ──────────────────────────────────────────────────────────────────
function openFicha(id) {
  fichaId = id;
  const n = novias.find(x => x.id === id);
  const done = n.checklist.filter(c => c.done).length;
  const pct = Math.round(done / n.checklist.length * 100);
  const saldo = n.total - n.sena;

  document.getElementById('ficha-name').textContent = n.nombre;
  document.getElementById('ficha-body').innerHTML = `
    <div class="ficha-hero">
      <div>
        <div class="ficha-hero-name">${n.nombre} ${badge(n.estado)}</div>
        <div class="ficha-hero-sub">
          ${n.fecha || 'Fecha a confirmar'} · ${n.ciudad || '—'} · ${n.tipo || '—'}<br>
          ${n.rol}${n.resp ? ' · Responsable: ' + n.resp : ''}
        </div>
      </div>
    </div>

    ${(n.tel || n.ig) ? `
      <div class="ficha-sec">Contacto</div>
      <div class="contact-row">
        ${n.tel ? `<span class="chip"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.38 2 2 0 0 1 3.59 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>${n.tel}</span>` : ''}
        ${n.ig ? `<span class="chip"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/></svg>${n.ig}</span>` : ''}
      </div>
    ` : ''}

    ${n.piezas ? `
      <div class="ficha-sec">Piezas encargadas</div>
      <div class="ficha-piezas">${n.piezas}</div>
    ` : ''}

    ${n.notas ? `
      <div class="ficha-sec">Notas internas</div>
      <div class="ficha-notas">${n.notas}</div>
    ` : ''}

    <div class="ficha-sec">Pago</div>
    <div class="pago-cards">
      <div class="pago-card"><div class="pc-label">Total</div><div class="pc-val rose">${n.total > 0 ? '$' + fmt(n.total) : '—'}</div></div>
      <div class="pago-card"><div class="pc-label">Seña cobrada</div><div class="pc-val green">${n.sena > 0 ? '$' + fmt(n.sena) : '—'}</div></div>
      <div class="pago-card"><div class="pc-label">Saldo</div><div class="pc-val ${saldo > 0 ? 'red' : ''}">${n.total > 0 ? '$' + fmt(saldo) : '—'}</div></div>
    </div>
    ${n.total > 0 ? `
      <div class="prog-wrap">
        <div class="prog-bar"><div class="prog-fill" style="width:${Math.round(n.sena / n.total * 100)}%"></div></div>
        <div class="prog-label">${Math.round(n.sena / n.total * 100)}% cobrado</div>
      </div>` : ''}

    <div class="ficha-sec">Proceso · ${done}/${n.checklist.length} etapas completadas</div>
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
    div.innerHTML = `<div class="ck-box">${c.done ? '✓' : ''}</div><span class="ck-label">${c.label}</span>`;
    el.appendChild(div);
  });
}

function toggleCheck(nid, idx) {
  const n = novias.find(x => x.id === nid);
  n.checklist[idx].done = !n.checklist[idx].done;
  renderChecklist(n);
}

function editFromFicha() {
  closeModal('ficha');
  openModal('edit', fichaId);
}

// ── CLOSE ON OVERLAY CLICK ─────────────────────────────────────────────────
document.querySelectorAll('.overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// ── INIT ───────────────────────────────────────────────────────────────────
renderDash();
