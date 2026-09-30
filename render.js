// ===== CONSTANTES VISUALES =====
const BADGE_CLASS = {
  'Pendiente': 'b-pend',
  'Propuesta enviada': 'b-prop',
  'Confirmado': 'b-conf',
  'Produccion': 'b-prod',
  'Entregado': 'b-entr',
  'Cancelado': 'b-canc',
};

// ===== HELPERS GENERALES =====
async function toggleArchivadas(checked) {
  window.AppState.showArchived = !!checked;
  try {
    window.AppState.novias = await apiLoadNovias({ includeArchived: window.AppState.showArchived });
    renderDash();
    renderNovias();
    renderPagos();
  } catch (e) {
    showToast('Error cargando novias');
  }
}
window.toggleArchivadas = toggleArchivadas;
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
function fmt(n) { return new Intl.NumberFormat('es-AR').format(n || 0); }
function badge(estado) { return `<span class="badge ${BADGE_CLASS[estado] || 'b-pend'}">${estado || 'Pendiente'}</span>`; }
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.className = 'toast'; // reset classes
  const isError = type === 'error' || (!type && /error|no se pudo|falta/i.test(msg));
  if (isError) t.classList.add('toast-error');
  t.innerHTML = '<span>' + msg + '</span><button class="toast-close" onclick="this.parentElement.classList.remove(\'show\')">&times;</button>';
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), isError ? 5000 : 3200);
}
// Auto-archivar novias con estado "Entregado" y fecha de evento ya pasada
async function autoArchivarEntregadas(novias) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const paraArchivar = novias.filter(n => {
    if (n.archivada) return false;
    if (n.estado !== 'Entregado') return false;
    const d = parseDate(n.fecha);
    if (d.getFullYear() >= 2099) return false; // sin fecha, no tocar
    return d < hoy;
  });
  if (!paraArchivar.length) return;
  for (const n of paraArchivar) {
    try {
      await apiSetArchivada(n.id, true);
      n.archivada = true;
    } catch (e) { console.error('Error auto-archivando novia', n.id, e); }
  }
  // Quitar las archivadas de la lista si no se están mostrando
  if (!window.AppState.showArchived) {
    window.AppState.novias = novias.filter(n => !n.archivada);
    window._novias = window.AppState.novias;
  }
  if (paraArchivar.length === 1) {
    showToast(paraArchivar[0].nombre + ' fue archivada automaticamente (entregada)');
  } else if (paraArchivar.length > 1) {
    showToast(paraArchivar.length + ' novias entregadas fueron archivadas automaticamente');
  }
}
window.autoArchivarEntregadas = autoArchivarEntregadas;

function isUrgent(n) {
  const d = parseDate(n.fecha);
  if (d.getFullYear() >= 2099) return false;
  const daysUntil = (d - new Date()) / 86400000;
  return daysUntil >= 0 && daysUntil < 30 && saldoDe(n) > 0;
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
const ETAPA_DISPLAY = {
  'Mandar presupuesto': 'Presupuesto enviado',
  'Pago la seña': 'Seña cobrada',
  'Pieza terminada': 'Pieza terminada',
  'Entrega realizada': 'Entrega realizada',
  'Pago realizado': 'Pago realizado',
};
const TRABAJOS = ['Orfebrería', 'Ensamble', 'Ambas'];
function trabajoChip(t) {
  return t ? `<span class="chip-trabajo">${escapeHtml(t)}</span>` : '';
}
function lastCompleted(n) {
  if (!n.checklist) return null;
  const doneItems = n.checklist.filter(c => c.done);
  if (!doneItems.length) return null;
  const last = doneItems[doneItems.length - 1];
  return ETAPA_DISPLAY[last.label] || last.label;
}
function ingresosUltimos6Meses(novias) {
  const hoy = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
      year: d.getFullYear(),
      total: 0,
    });
  }
  novias.forEach(n => {
    (n.pagos || []).forEach(p => {
      if (!p.fecha) return;
      const key = String(p.fecha).slice(0, 7); // 'YYYY-MM'
      const m = meses.find(x => x.key === key);
      if (m) m.total += (p.monto || 0);
    });
  });
  return meses;
}

// ===== TEMPLATE DE WHATSAPP (PUNTO 9) =====
function waMessage(n) {
  const saldo = saldoDe(n);
  const piezas = (n.piezas || '').trim() || 'tu pedido';
  const fecha = (n.fecha || '').trim() || 'fecha a confirmar';
  const nombre = (n.nombre || '').split(' ')[0];
  const lineas = [
    `Hola ${nombre}! Te escribo de DELANUK ✨`,
    ``,
    `Te paso el resumen de tu pedido:`,
    `• Piezas: ${piezas}`,
    `• Fecha del evento: ${fecha}`,
  ];
  if (n.total > 0) {
    lineas.push(`• Presupuesto: $${fmt(n.total)}`);
    if (n.sena_cita_pagada && n.sena_cita > 0) lineas.push(`• Seña de la cita: $${fmt(n.sena_cita)}`);
    lineas.push(`• Cobrado: $${fmt(n.sena || 0)}`);
    lineas.push(`• Saldo pendiente: $${fmt(saldo)}`);
  }
  lineas.push('', 'Cualquier consulta quedo a disposición 💌');
  return lineas.join('\n');
}
function waLinkWithMessage(n) {
  const base = waLink(n.tel);
  if (!base) return null;
  return base + '?text=' + encodeURIComponent(waMessage(n));
}
async function copyWaMessage(id) {
  const n = window.AppState.novias.find(x => x.id === id);
  if (!n) return;
  try {
    await navigator.clipboard.writeText(waMessage(n));
    showToast('Mensaje copiado ✓');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = waMessage(n);
    document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Mensaje copiado ✓');
  }
}
window.copyWaMessage = copyWaMessage;

// ===== DEEP-LINK ROUTING (PUNTO 10) =====
function resolveHashRoute() {
  const m = location.hash.match(/^#\/novia\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    const exists = window.AppState.novias.find(x => x.id === id);
    if (exists) openFicha(id, { fromHash: true });
    else history.replaceState(null, '', location.pathname + location.search);
  } else {
    const overlay = document.getElementById('overlay-ficha');
    if (overlay && overlay.classList.contains('open')) {
      overlay.classList.remove('open');
      window.AppState.fichaId = null;
    }
  }
}

// ===== FILA REUTILIZABLE (PUNTO 12) =====
function renderRow(n, contexto) {
  const saldo = n.total > 0 ? saldoDe(n) : null;
  const last = lastCompleted(n);
  const urg = isUrgent(n) ? ' <span class="badge b-urgent">Urgente</span>' : '';
  const arch = n.archivada ? ' <span class="badge b-archived">Archivada</span>' : '';
  const piezasTd = `<td class="td-piezas td-muted" title="${escapeHtml(n.piezas || '')}">${escapeHtml(n.piezas) || '-'}${n.trabajo ? '<br>' + trabajoChip(n.trabajo) : ''}</td>`;
  const lastLine = last ? `<br><span class="next-action">✓ ${escapeHtml(last)}</span>` : '';

  if (contexto === 'dashboard') {
    return `
      <tr>
<td><span class="td-name">${escapeHtml(n.nombre)}</span>${urg}${arch}</td>        <td><span class="td-muted">${escapeHtml(n.fecha) || '-'}</span></td>
        <td>${badge(n.estado)}${lastLine}</td>
        ${piezasTd}
        <td><span class="td-muted">${escapeHtml(n.resp) || '-'}</span></td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">${saldo !== null ? '$' + fmt(saldo) : '-'}</td>
        <td><div class="row-actions"><button class="row-btn" onclick="openFicha(${n.id})">Ver ficha</button></div></td>
      </tr>`;
  }

  const pagoBadge = n.total > 0
    ? (saldo === 0 ? `<span class="badge b-paid">Pagado</span>`
        : cobradoDe(n) > 0 ? `<span class="badge b-partial">Seña</span>`
        : `<span class="badge b-nopago">Sin seña</span>`)
    : `<span class="td-muted">-</span>`;

  if (contexto === 'entregadas') {
    const ent = (n.checklist || []).find(c => c.label === 'Entrega realizada' && c.done && c.fechaDone);
    const fEnt = ent ? new Date(ent.fechaDone).toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'2-digit'}) : '-';
    return `
    <tr>
      <td><span class="td-name">${escapeHtml(n.nombre)}</span>${arch}${n.resp ? `<br><span class="td-muted">${escapeHtml(n.resp)}</span>` : ''}</td>
      <td class="td-muted">${escapeHtml(n.fecha) || '-'}</td>
      <td class="td-muted">${escapeHtml(n.ciudad) || '-'}</td>
      ${piezasTd}
      <td class="td-muted">${fEnt}</td>
      <td class="amount">${n.total > 0 ? '$' + fmt(n.total) : '-'}</td>
      <td><div class="row-actions"><button class="row-btn" onclick="openFicha(${n.id})">Ficha</button></div></td>
    </tr>`;
  }

  return `
    <tr>
      <td>
        <span class="td-name">${escapeHtml(n.nombre)}</span>${urg}${arch}
        ${n.resp ? `<br><span class="td-muted">${escapeHtml(n.resp)}</span>` : ''}
      </td>
      <td class="td-muted">${escapeHtml(n.fecha) || '-'}</td>
      <td class="td-muted">${escapeHtml(n.ciudad) || '-'}</td>
      ${piezasTd}
      <td>${badge(n.estado)}${lastLine}</td>
      <td>${pagoBadge}</td>
      <td><div class="row-actions">
        <button class="row-btn" onclick="openFicha(${n.id})">Ficha</button>
      </div></td>
    </tr>`;
}

// ===== DASHBOARD =====
function renderDash() {
  const novias = window.AppState.novias.filter(n => !n.archivada && !isEntregada(n));
  const q = window.AppState.dashSearch.toLowerCase();
  const pend = novias.filter(n => n.estado === 'Pendiente').length;
  const conf = novias.filter(n => n.estado === 'Confirmado').length;
  const saldoTotal = novias.reduce((a, n) => a + (n.total > 0 ? Math.max(0, saldoDe(n)) : 0), 0);
  document.getElementById('dash-subtitle').textContent = `${novias.length} novias activas`;
  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Novias activas</div><div class="kpi-val rose">${novias.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pendientes accion</div><div class="kpi-val red">${pend}</div></div>
    <div class="kpi-card"><div class="kpi-label">Confirmadas</div><div class="kpi-val blue">${conf}</div></div>
    <div class="kpi-card admin-only"><div class="kpi-label">Saldo a cobrar</div><div class="kpi-val green">$${fmt(saldoTotal)}</div></div>
  `;
  const si = document.getElementById('dash-search');
  if (si && si.value !== window.AppState.dashSearch) si.value = window.AppState.dashSearch;

  // Ordenar: proximas primero (futuro cercano arriba), pasadas despues, sin fecha al final
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let filtered = [...novias].sort((a, b) => {
    const da = parseDate(a.fecha), db = parseDate(b.fecha);
    const aFut = da >= hoy && da.getFullYear() < 2099;
    const bFut = db >= hoy && db.getFullYear() < 2099;
    const aSin = da.getFullYear() >= 2099;
    const bSin = db.getFullYear() >= 2099;
    // Futuras primero, luego pasadas, luego sin fecha
    if (aFut && !bFut) return -1;
    if (!aFut && bFut) return 1;
    if (aSin && !bSin) return 1;
    if (!aSin && bSin) return -1;
    // Dentro del mismo grupo, las mas proximas primero
    return da - db;
  });
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
    tbody.insertAdjacentHTML('beforeend', renderRow(n, 'dashboard'));
  });
}

// ===== LISTA DE NOVIAS =====
function renderNovias() {
  const novias = window.AppState.novias.filter(n => !isEntregada(n));
  const q = (document.getElementById('search').value || '').toLowerCase();
  const est = document.getElementById('filter-estado').value;
  const { col, dir } = window.AppState.noviaSort;
  const filtered = [...novias]
    .filter(n => {
      const mq = !q || (n.nombre || '').toLowerCase().includes(q) || (n.ciudad || '').toLowerCase().includes(q) || (n.piezas || '').toLowerCase().includes(q);
      const me = !est || n.estado === est;
      return mq && me;
    })
    .sort((a, b) => {
      if (col === 'fecha')  return dir * (parseDate(a.fecha) - parseDate(b.fecha));
      if (col === 'estado') return dir * (a.estado || '').localeCompare(b.estado || '');
      if (col === 'saldo')  return dir * (saldoDe(a) - saldoDe(b));
      return 0;
    });
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
  filtered.forEach(n => tbody.insertAdjacentHTML('beforeend', renderRow(n, 'novias')));
}

// ===== PAGOS =====
function pagoCell(n, campo, tipo) {
  const v = n[campo];
  const val = tipo === 'num' ? (v ? v : '') : (v || '');
  return `<input class="cell-input${tipo === 'num' ? ' cell-num' : ''}" type="${tipo === 'num' ? 'number' : 'text'}" ${tipo === 'num' ? 'min="0" inputmode="numeric"' : ''} value="${escapeHtml(val)}" placeholder="${tipo === 'num' ? '0' : 'dd/mm'}" onchange="savePagoCell(${n.id}, '${campo}', this)">`;
}
async function savePagoCell(nid, campo, input) {
  const n = window.AppState.novias.find(x => x.id === nid);
  if (!n) return;
  const numeric = ['total', 'sena', 'sena_cita'].includes(campo);
  const nuevo = input.type === 'checkbox' ? !!input.checked : numeric ? (parseInt(input.value) || 0) : input.value.trim();
  const anterior = n[campo];
  if (nuevo === anterior) return;
  n[campo] = nuevo;
  input.classList.add('saving');
  const { error } = await apiUpdateNovia(nid, { [campo]: nuevo });
  input.classList.remove('saving');
  if (error) {
    n[campo] = anterior;
    showToast('Error guardando: ' + (error.message || ''), 'error');
  } else {
    showToast('Guardado');
  }
  renderPagos();
  renderDash();
  if (window.AppState.fichaId === nid && document.getElementById('overlay-ficha').classList.contains('open')) openFicha(nid, { fromHash: true });
}
window.savePagoCell = savePagoCell;

function renderPagos() {
  const novias = window.AppState.novias.filter(n => !n.archivada && !isEntregada(n));
  const withPago = novias.filter(n => (n.total || 0) > 0 || cobradoDe(n) > 0);
  const totalM = withPago.reduce((a, n) => a + (n.total || 0), 0);
  const totalC = withPago.reduce((a, n) => a + cobradoDe(n), 0);
  // Solo suma saldo de las que ya tienen presupuesto (una seña de cita sola no genera saldo)
  const totalS = withPago.reduce((a, n) => a + (n.total > 0 ? Math.max(0, saldoDe(n)) : 0), 0);
  document.getElementById('kpi-pagos').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total facturado</div><div class="kpi-val">$${fmt(totalM)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total cobrado</div><div class="kpi-val green">$${fmt(totalC)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Saldo pendiente</div><div class="kpi-val red">$${fmt(totalS)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Novias con pago</div><div class="kpi-val">${withPago.length}</div></div>
  `;
  const tbody = document.getElementById('pagos-tbody');
  // En Pagos se listan todas las activas, así se puede cargar la seña de la cita antes del presupuesto
  const lista = [...novias].sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No hay novias activas</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  lista.forEach(n => {
    const saldo = saldoDe(n);
    const estBadge = n.total > 0
      ? (saldo <= 0 ? `<span class="badge b-paid">Pagado</span>`
        : cobradoDe(n) > 0 ? `<span class="badge b-partial">Seña</span>`
        : `<span class="badge b-nopago">Sin seña</span>`)
      : (n.sena_cita > 0 ? `<span class="badge b-partial">Seña cita</span>` : `<span class="td-muted">-</span>`);
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="td-name">${escapeHtml(n.nombre)}</span><br><span class="td-muted">${escapeHtml(n.fecha) || '-'}</span></td>
        <td class="amount">${pagoCell(n, 'total', 'num')}</td>
        <td class="amount"><div class="cell-cita">${pagoCell(n, 'sena_cita', 'num')}<label class="pc-check" title="Seña de la cita pagada"><input type="checkbox" ${n.sena_cita_pagada ? 'checked' : ''} onchange="savePagoCell(${n.id}, 'sena_cita_pagada', this)"> pagada</label></div></td>
        <td class="amount paid">${pagoCell(n, 'sena', 'num')}</td>
        <td class="td-muted">${pagoCell(n, 'fsena', 'text')}</td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">${n.total > 0 ? '$' + fmt(saldo) : '-'}</td>
        <td>${estBadge}</td>
      </tr>`);
  });
  renderGrafico();
}
function renderGrafico() {
  const svg = document.getElementById('grafico-ingresos');
  if (!svg) return;
  const meses = ingresosUltimos6Meses(window.AppState.novias.filter(n => !n.archivada));
  const max = Math.max(1, ...meses.map(m => m.total));
  const W = 600, H = 200, pad = 24;
  const slot = (W - pad * 2) / meses.length;
  const barW = slot * 0.7, gap = slot * 0.3;
  let html = '';
  meses.forEach((m, i) => {
    const x = pad + i * (barW + gap);
    const h = (m.total / max) * (H - pad * 2);
    const y = H - pad - h;
    html += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#6B5847" rx="3"/>`;
    html += `<text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#8F7F72">${m.label}</text>`;
    if (m.total > 0) {
      html += `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="#6B5847">$${fmt(m.total)}</text>`;
    }
  });
  svg.innerHTML = html;
}

// ===== MODAL DE FORMULARIO =====
function openModal(mode, id) {
  window.AppState.editId = mode === 'edit' ? id : null;
  const editId = window.AppState.editId;
  const n = editId ? window.AppState.novias.find(x => x.id === editId) : null;
  document.getElementById('modal-form-title').textContent = n ? 'Editar novia' : 'Nueva novia';
  document.getElementById('f-nombre').value = n ? (n.nombre || '') : '';
  document.getElementById('f-fecha').value  = n ? (n.fecha || '')  : '';
  document.getElementById('f-tel').value    = n ? (n.tel || '')    : '';
  document.getElementById('f-ig').value     = n ? (n.ig || '')     : '';
  document.getElementById('f-ciudad').value = n ? (n.ciudad || '') : '';
  document.getElementById('f-tipo').value   = n ? (n.tipo || 'Iglesia y fiesta') : 'Iglesia y fiesta';
  document.getElementById('f-rol').value    = n ? (n.rol || 'Novia') : 'Novia';
  document.getElementById('f-resp').value   = n ? (n.resp || '')   : '';
  document.getElementById('f-estado').value = n ? (n.estado || 'Pendiente') : 'Pendiente';
  document.getElementById('f-total').value  = n && n.total ? n.total : '';
  document.getElementById('f-sena').value   = n && n.sena ? n.sena  : '';
  document.getElementById('f-fsena').value  = n ? (n.fsena || '')  : '';
  document.getElementById('f-sena-cita').value = n && n.sena_cita ? n.sena_cita : '';
  document.getElementById('f-trabajo').value = n ? (n.trabajo || '') : '';
  document.getElementById('f-piezas').value = n ? (n.piezas || '') : '';
  document.getElementById('f-notas').value  = n ? (n.notas || '')  : '';
  document.getElementById('overlay-form').classList.add('open');
}

function closeModal(which) {
  document.getElementById('overlay-' + which).classList.remove('open');
  if (which === 'ficha' && location.hash.startsWith('#/novia/')) {
    history.pushState(null, '', location.pathname + location.search);
    window.AppState.fichaId = null;
  }
}

async function saveNovia() {
  const nombre = document.getElementById('f-nombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
  const btn = document.querySelector('#overlay-form .btn-primary[onclick="saveNovia()"]');
  const txtOrig = btn ? btn.textContent : 'Guardar';
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
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
      sena_cita: parseInt(document.getElementById('f-sena-cita').value) || 0,
      trabajo: document.getElementById('f-trabajo').value,
      piezas: document.getElementById('f-piezas').value.trim(),
      notas:  document.getElementById('f-notas').value.trim(),
    };
    let res;
    const editId = window.AppState.editId;
    if (editId) {
      res = await apiUpdateNovia(editId, data);
    } else {
      data.checklist = mkCheck(0);
      data.archivada = false;
      data.pagos = [];
      res = await apiInsertNovia(data);
    }
    if (res.error) { showToast('Error guardando: ' + res.error.message, 'error'); return; }
    closeModal('form');
    showToast(editId ? 'Novia actualizada' : 'Novia agregada');
    // Reflejar en pantalla al instante, sin esperar a la recarga
    if (editId) {
      const n = window.AppState.novias.find(x => x.id === editId);
      if (n) Object.assign(n, data);
    } else if (res.data && res.data.id) {
      window.AppState.novias.push({ ...res.data, checklist: normalizeChecklist(res.data.checklist), pagos: [], sena_cita: Number(res.data.sena_cita) || 0, trabajo: res.data.trabajo || '' });
    }
    window.AppState.editId = null;
    renderDash(); renderNovias(); renderPagos();
  } catch (e) {
    console.error('Error en saveNovia:', e);
    const msg = e && e.message === 'timeout' ? 'La conexión no respondió. Revisá internet y probá de nuevo.' : 'Error guardando: ' + ((e && e.message) || 'error desconocido');
    showToast(msg, 'error');
    return;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = txtOrig; }
  }
  // Recarga completa en segundo plano (no bloquea el botón)
  loadNovias();
}

async function deleteNovia(id) {
  const n = window.AppState.novias.find(x => x.id === id);
  if (!n) return;
  if (!confirm(`¿Eliminar PERMANENTEMENTE a ${n.nombre}?\n\nEsta acción NO se puede deshacer.\nSi solo querés sacarla de la lista, usá "Archivar".`)) return;
  const { error } = await apiDeleteNovia(id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  closeModal('ficha');
  showToast(`${n.nombre} eliminada permanentemente`);
  await loadNovias();
}

async function toggleArchivada(id) {
  const n = window.AppState.novias.find(x => x.id === id);
  if (!n) return;
  const nuevoEstado = !n.archivada;
  const accion = nuevoEstado ? 'archivar' : 'desarchivar';
  if (!confirm(`¿Querés ${accion} a ${n.nombre}?`)) return;

  const { error } = await apiSetArchivada(id, nuevoEstado);
  if (error) { showToast('Error al ' + accion); return; }

  n.archivada = nuevoEstado;
  showToast(nuevoEstado ? 'Novia archivada' : 'Novia desarchivada');

  if (nuevoEstado && !window.AppState.showArchived) {
    window.AppState.novias = window.AppState.novias.filter(x => x.id !== id);
    closeModal('ficha');
  } else {
    openFicha(id);
  }
  renderDash();
  renderNovias();
  renderPagos();
  if (document.getElementById('view-entregadas').classList.contains('active')) renderEntregadas();
}
window.toggleArchivada = toggleArchivada;

// ===== FICHA =====
function fichaInput(n, campo, label, tipo = 'text', extra = '') {
  const v = n[campo];
  const val = tipo === 'number' ? (v ? v : '') : (v || '');
  return `<div class="fg"><label>${label}</label><input id="fi-${campo}" type="${tipo}" value="${escapeHtml(val)}" ${extra}></div>`;
}
function fichaSelect(n, campo, label, opciones, permitirVacio) {
  const v = n[campo] || '';
  const opts = (permitirVacio ? [''] : []).concat(opciones).map(o =>
    `<option value="${escapeHtml(o)}" ${o === v ? 'selected' : ''}>${o === '' ? '— Sin asignar —' : escapeHtml(o)}</option>`).join('');
  return `<div class="fg"><label>${label}</label><select id="fi-${campo}">${opts}</select></div>`;
}
function openFicha(id, opts = {}) {
  window.AppState.fichaId = id;
  const n = window.AppState.novias.find(x => x.id === id);
  if (!n) return;

  if (!opts.fromHash) {
    const targetHash = `#/novia/${id}`;
    if (location.hash !== targetHash) history.pushState(null, '', targetHash);
  }

  const done = n.checklist.filter(c => c.done).length;
  const saldo = saldoDe(n);
  const wa = waLink(n.tel);
  const ig = igLink(n.ig);
  const waMsg = wa ? waLinkWithMessage(n) : null;
  const entregada = isEntregada(n);

  document.getElementById('ficha-name').textContent = n.nombre;
  document.getElementById('ficha-body').innerHTML = `
   <div class="ficha-hero">
  <div>
    <div class="ficha-hero-name">${escapeHtml(n.nombre)} ${badge(n.estado)}${isUrgent(n) ? ' <span class="badge b-urgent">Urgente</span>' : ''}${n.archivada ? ' <span class="badge b-archived">Archivada</span>' : ''}${n.trabajo ? ' ' + trabajoChip(n.trabajo) : ''}</div>
    <div class="ficha-hero-sub">
      ${escapeHtml(n.fecha) || 'Fecha a confirmar'} - ${escapeHtml(n.ciudad) || '-'} - ${escapeHtml(n.tipo) || '-'}<br>
      ${escapeHtml(n.rol || '')}${n.resp ? ' - Responsable: ' + escapeHtml(n.resp) : ''}
    </div>
  </div>
</div>
    ${(wa || ig) ? `<div class="ficha-sec">Contacto</div>
      <div class="contact-row">
        ${wa ? `<a class="chip chip-link" href="${waMsg}" target="_blank" rel="noopener">WhatsApp · ${escapeHtml(n.tel)}</a>` : ''}
        ${wa ? `<button class="chip chip-action" type="button" onclick="copyWaMessage(${n.id})" title="Copiar mensaje con saldo, fecha y piezas">📋 Copiar mensaje</button>` : ''}
        ${ig ? `<a class="chip chip-link" href="${ig}" target="_blank" rel="noopener">Instagram · ${escapeHtml(n.ig)}</a>` : ''}
      </div>` : ''}

    <div class="ficha-sec">Proceso - ${done}/${n.checklist.length} etapas completadas${entregada ? ' · <span class="badge b-entr">Entregada</span>' : ''}</div>
    <div class="checklist" id="checklist-${id}"></div>

    <div class="ficha-sec">Pagos <span class="ficha-sec-hint">tocá un número para editarlo</span></div>
    <div class="pago-cards pago-cards-4">
      <div class="pago-card"><div class="pc-label">Presupuesto</div><input class="pc-input rose" type="number" min="0" inputmode="numeric" placeholder="0" value="${n.total || ''}" onchange="savePagoCell(${n.id}, 'total', this)"></div>
      <div class="pago-card">
        <div class="pc-label">Seña cita</div>
        <input class="pc-input" type="number" min="0" inputmode="numeric" placeholder="0" value="${n.sena_cita || ''}" onchange="savePagoCell(${n.id}, 'sena_cita', this)">
        <label class="pc-check"><input type="checkbox" ${n.sena_cita_pagada ? 'checked' : ''} onchange="savePagoCell(${n.id}, 'sena_cita_pagada', this)"> Pagada</label>
      </div>
      <div class="pago-card"><div class="pc-label">Cobrado</div><input class="pc-input green" type="number" min="0" inputmode="numeric" placeholder="0" value="${n.sena || ''}" onchange="savePagoCell(${n.id}, 'sena', this)"></div>
      <div class="pago-card"><div class="pc-label">Saldo</div><div class="pc-val ${saldo > 0 ? 'red' : ''}">${n.total > 0 ? '$' + fmt(saldo) : '-'}</div></div>
    </div>
    ${n.total > 0 ? `<div class="calc-row">
      <span>Seña 50 %: <b>$${fmt(senaSugerida(n))}</b></span>
      <span>Resta después de la seña: <b>$${fmt((n.total || 0) - senaSugerida(n))}</b></span>
      ${n.sena_cita > 0 ? `<span>Seña cita ${n.sena_cita_pagada ? 'pagada' : 'sin pagar'}: <b>${n.sena_cita_pagada ? '−' : ''}$${fmt(n.sena_cita)}</b></span>` : ''}
      <span>Saldo final: <b>$${fmt((n.total || 0) - senaSugerida(n) - citaPagada(n))}</b></span>
    </div>` : ''}
    ${(n.pagos && n.pagos.length > 0)
      ? '<div class="pagos-lista">' + n.pagos.map((p, i) =>
          '<div class="pago-item"><span class="pago-fecha">' + p.fecha + '</span><span class="pago-concepto">' + escapeHtml(p.concepto) + '</span><span class="pago-monto">$' + fmt(p.monto) + '</span><button class="pago-del" onclick="deletePago(' + n.id + ',' + i + ')">×</button></div>'
        ).join('') + '</div>'
      : '<p class="ck-date" style="margin:4px 0 8px">Sin pagos registrados</p>'}
    <div class="pago-add-row">
      <input class="pago-input" id="pago-monto-${n.id}" type="number" placeholder="Monto $" min="1">
      <input class="pago-input" id="pago-concepto-${n.id}" type="text" placeholder="Concepto">
      <button class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="addPago(${n.id})">+ Agregar</button>
    </div>

    <div class="ficha-sec">Datos <span class="ficha-sec-hint">editá y guardá abajo</span></div>
    <div class="form-grid ficha-form">
      ${fichaInput(n, 'nombre', 'Nombre completo *')}
      ${fichaInput(n, 'fecha', 'Fecha de boda', 'text', 'placeholder="15/08/2026"')}
      ${fichaInput(n, 'tel', 'Teléfono / WhatsApp')}
      ${fichaInput(n, 'ig', 'Instagram', 'text', 'placeholder="@usuario"')}
      ${fichaInput(n, 'ciudad', 'Ciudad')}
      ${fichaSelect(n, 'tipo', 'Tipo de boda', ['Iglesia y fiesta','Civil y fiesta','Civil','Fiesta','Civil, fiesta y post boda','Ceremonia judía y fiesta'])}
      ${fichaSelect(n, 'rol', 'Rol', ['Novia','Madrina','Hermana','Madre','Invitada'])}
      ${fichaSelect(n, 'resp', 'Responsable', ['Lucía','Marina','Equipo'], true)}
      ${fichaSelect(n, 'trabajo', 'Trabajo', TRABAJOS, true)}
      ${fichaSelect(n, 'estado', 'Estado', ['Pendiente','Propuesta enviada','Confirmado','Entregado','Cancelado'])}
      ${fichaInput(n, 'fsena', 'Fecha seña', 'text', 'placeholder="dd/mm"')}
      <div class="fg full"><label>Piezas encargadas</label><textarea id="fi-piezas" rows="3">${escapeHtml(n.piezas || '')}</textarea></div>
      <div class="fg full"><label>Notas internas</label><textarea id="fi-notas" rows="2">${escapeHtml(n.notas || '')}</textarea></div>
    </div>
    <div class="ficha-form-foot">
      <button class="btn-ghost" onclick="toggleArchivada(${n.id})" style="font-size:12px">${n.archivada ? '↩ Desarchivar' : 'Archivar'}</button>
      <button class="btn-primary" id="btn-save-ficha" onclick="saveFicha(${n.id})">Guardar cambios</button>
    </div>
  `;
  renderChecklist(n);
  document.getElementById('overlay-ficha').classList.add('open');
}

// Guardar los datos editados desde la ficha
async function saveFicha(id) {
  const n = window.AppState.novias.find(x => x.id === id);
  if (!n) return;
  const g = c => { const el = document.getElementById('fi-' + c); return el ? el.value : ''; };
  const nombre = g('nombre').trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
  const data = {
    nombre,
    fecha: g('fecha').trim(), tel: g('tel').trim(), ig: g('ig').trim(), ciudad: g('ciudad').trim(),
    tipo: g('tipo'), rol: g('rol'), resp: g('resp'), trabajo: g('trabajo'), estado: g('estado'),
    fsena: g('fsena').trim(),
    piezas: g('piezas').trim(), notas: g('notas').trim(),
  };
  const btn = document.getElementById('btn-save-ficha');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const { error } = await apiUpdateNovia(id, data);
    if (error) throw error;
    Object.assign(n, data);
    showToast('Cambios guardados');
    openFicha(id);
    renderDash(); renderNovias(); renderPagos();
    if (typeof renderEntregadas === 'function' && document.getElementById('view-entregadas').classList.contains('active')) renderEntregadas();
  } catch (e) {
    console.error(e);
    showToast(e && e.message === 'timeout' ? 'La conexión no respondió. Probá de nuevo.' : 'Error guardando: ' + ((e && e.message) || ''), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
  }
}
window.saveFicha = saveFicha;

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
  const n = window.AppState.novias.find(x => x.id === nid);
  const wasDone = n.checklist[idx].done;
  n.checklist[idx].done = !wasDone;
  n.checklist[idx].fechaDone = !wasDone ? new Date().toISOString() : null;
  renderChecklist(n);
  const patch = { checklist: n.checklist };
  // Entrega + pago listos -> pasa a Entregadas
  const ahoraEntregada = checkDone(n, 'Entrega realizada') && checkDone(n, 'Pago realizado');
  const estadoAnterior = n.estado;
  if (ahoraEntregada && n.estado !== 'Entregado' && n.estado !== 'Cancelado') { patch.estado = 'Entregado'; n.estado = 'Entregado'; }
  if (!ahoraEntregada && n.estado === 'Entregado') { patch.estado = 'Confirmado'; n.estado = 'Confirmado'; }
  const { error } = await apiUpdateNovia(nid, patch);
  if (error) {
    n.checklist[idx].done = wasDone;
    n.checklist[idx].fechaDone = wasDone ? n.checklist[idx].fechaDone : null;
    n.estado = estadoAnterior;
    renderChecklist(n);
    showToast('Error guardando cambio');
    return;
  }
  if (patch.estado) {
    showToast(patch.estado === 'Entregado' ? n.nombre + ' pasó a Entregadas' : n.nombre + ' volvió a activas');
    openFicha(nid);
  }
  renderDash(); renderNovias(); renderPagos();
  if (typeof renderEntregadas === 'function' && document.getElementById('view-entregadas').classList.contains('active')) renderEntregadas();
}

async function addPago(nid) {
  const montoEl = document.getElementById('pago-monto-' + nid);
  const concEl  = document.getElementById('pago-concepto-' + nid);
  const monto = parseInt(montoEl ? montoEl.value : 0) || 0;
  const concepto = concEl ? (concEl.value.trim() || 'Pago') : 'Pago';
  if (!monto) { showToast('Ingresa un monto'); return; }

  const n = window.AppState.novias.find(x => x.id === nid);
  const nuevoPago = { fecha: new Date().toISOString().slice(0,10), monto, concepto };
  const pagosActualizados = [...(n.pagos || []), nuevoPago];
  const senaAnterior = n.sena || 0;
  const totalCobrado = senaAnterior + monto;

  // Actualizar localmente PRIMERO (refresco visual inmediato)
  n.pagos = pagosActualizados;
  n.sena = totalCobrado;
  openFicha(nid);
  showToast('Pago registrado');

  // Después guardar en la base, sin bloquear la UI
  const { error } = await apiUpdateNovia(nid, { pagos: pagosActualizados, sena: totalCobrado });
  if (error) {
    showToast('Error guardando pago');
    n.pagos = (n.pagos || []).filter(p => p !== nuevoPago);
    n.sena = senaAnterior;
    openFicha(nid);
    return;
  }
  renderDash(); renderPagos();
}

async function deletePago(nid, idx) {
  if (!confirm('Eliminar este pago?')) return;

  const n = window.AppState.novias.find(x => x.id === nid);
  const pagoEliminado = n.pagos[idx];
  const pagosActualizados = (n.pagos || []).filter((_, i) => i !== idx);
  const senaAnterior = n.sena || 0;
  const totalCobrado = Math.max(0, senaAnterior - (pagoEliminado.monto || 0));

  // Actualizar localmente PRIMERO
  n.pagos = pagosActualizados;
  n.sena = totalCobrado;
  openFicha(nid);
  showToast('Pago eliminado');

  // Después guardar en la base
  const { error } = await apiUpdateNovia(nid, { pagos: pagosActualizados, sena: totalCobrado });
  if (error) {
    showToast('Error eliminando pago');
    n.pagos.splice(idx, 0, pagoEliminado);
    n.sena = senaAnterior;
    openFicha(nid);
    return;
  }
  renderDash(); renderPagos();
}

// ===== ENTREGADAS =====
async function renderEntregadas() {
  const tbody = document.getElementById('entregadas-tbody');
  const sub = document.getElementById('entregadas-sub');
  if (!tbody) return;
  // Traemos también las archivadas: una entregada vieja puede estar archivada
  let todas = window.AppState.novias;
  if (!window.AppState.showArchived) {
    try {
      todas = await apiLoadNovias({ includeArchived: true });
      // Sumar al estado las archivadas que no teníamos, para poder abrir su ficha
      const ids = new Set(window.AppState.novias.map(x => x.id));
      todas.filter(x => !ids.has(x.id)).forEach(x => window.AppState.novias.push(x));
      todas = window.AppState.novias;
    } catch (e) { console.error(e); }
  }
  const q = (document.getElementById('entregadas-search').value || '').toLowerCase();
  const lista = todas.filter(isEntregada)
    .filter(n => !q || (n.nombre || '').toLowerCase().includes(q) || (n.ciudad || '').toLowerCase().includes(q) || (n.piezas || '').toLowerCase().includes(q))
    .sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
  if (sub) sub.textContent = `${lista.length} novias entregadas · historial`;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Todavía no hay novias entregadas</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  lista.forEach(n => tbody.insertAdjacentHTML('beforeend', renderRow(n, 'entregadas')));
}
window.renderEntregadas = renderEntregadas;

// ===== EXPORT CSV =====
function exportCSV() {
  const noviasHeaders = ['ID','Nombre','Fecha Boda','Estado','Trabajo','Ciudad','Tipo','Rol','Responsable','Total','Seña cita','Cita pagada','Cobrado','Saldo','Tel','IG','Piezas','Notas'];
  const noviasRows = window.AppState.novias.map(n => [
    n.id, n.nombre, n.fecha, n.estado, n.trabajo, n.ciudad, n.tipo, n.rol, n.resp,
    n.total, n.sena_cita, n.sena_cita_pagada ? 'Sí' : 'No', n.sena, saldoDe(n), n.tel, n.ig, n.piezas,
    (n.notas||'').replace(/\n/g,' ')
  ].map(v => '"'+(String(v||'').replace(/"/g,'""'))+'"').join(','));
  const noviasCsv = [noviasHeaders.join(','), ...noviasRows].join('\n');

  const pagosHeaders = ['ID Novia','Nombre','Fecha Pago','Monto','Concepto'];
  const pagosRows = [];
  window.AppState.novias.forEach(n => {
    (n.pagos||[]).forEach(p => {
      pagosRows.push([
        n.id, n.nombre, p.fecha, p.monto, (p.concepto||'').replace(/\n/g,' ')
      ].map(v => '"'+(String(v||'').replace(/"/g,'""'))+'"').join(','));
    });
  });
  const pagosCsv = [pagosHeaders.join(','), ...pagosRows].join('\n');

  const dl = (content, filename) => {
    const blob = new Blob(['\uFEFF'+content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  dl(noviasCsv, 'delanuk-novias.csv');
  setTimeout(() => dl(pagosCsv, 'delanuk-pagos.csv'), 400);
  showToast('CSVs generados ✓');
}
// ===== ENVÍO =====
// Sección de despacho/logística. Todos los campos son opcionales.

// Helper local: devuelve true si un valor está "cargado" (no null, no undefined, no string vacío).
function envioHasValue(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  return true;
}

// Helper local: dado un objeto (ej. destinatario) devuelve true si al menos un campo tiene valor.
function envioSectionHasData(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return Object.values(obj).some(envioHasValue);
}

// Helper local: etiqueta legible del estado.
function envioEstadoLabel(estado) {
  const map = {
    pendiente: 'Pendiente',
    despachado: 'Despachado',
    en_transito: 'En tránsito',
    entregado: 'Entregado'
  };
  return map[estado] || 'Pendiente';
}

// Helper local: badge con clase de color para el estado.
function envioEstadoBadge(estado) {
  const clase = estado && ['pendiente','despachado','en_transito','entregado'].includes(estado)
    ? estado : 'pendiente';
  return `<span class="badge-envio ${clase}">${envioEstadoLabel(clase)}</span>`;
}

// ===== KPIs de Envío =====
function renderKpiEnvio() {
  const cont = document.getElementById('kpi-envio');
  if (!cont) return;
  const novias = (window.AppState && AppState.novias) || [];
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  let pendientes = 0, despMes = 0, entrMes = 0, totalConEnvio = 0;

  novias.forEach(n => {
    if (!n.envio) return;
    totalConEnvio++;
    const estado = n.envio?.estado || 'pendiente';
    if (estado === 'pendiente') pendientes++;

    const fd = n.envio?.fecha_despacho;
    if (fd) {
      const d = new Date(fd);
      if (!isNaN(d) && d.getMonth() === mesActual && d.getFullYear() === anioActual && estado !== 'pendiente') {
        despMes++;
      }
    }
    if (estado === 'entregado' && fd) {
      const d = new Date(fd);
      if (!isNaN(d) && d.getMonth() === mesActual && d.getFullYear() === anioActual) {
        entrMes++;
      }
    }
  });

  cont.innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Pendientes de despacho</div><div class="kpi-val">${pendientes}</div></div>
    <div class="kpi-card"><div class="kpi-label">Despachados este mes</div><div class="kpi-val">${despMes}</div></div>
    <div class="kpi-card"><div class="kpi-label">Entregados este mes</div><div class="kpi-val green">${entrMes}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total con envío</div><div class="kpi-val">${totalConEnvio}</div></div>
  `;
}

// ===== Vista Envío (tabla + KPIs) =====
function renderEnvio() {
  renderKpiEnvio();
  const tb = document.getElementById('envio-tbody');
  if (!tb) return;

  const novias = (window.AppState && AppState.novias) || [];
  const q = (document.getElementById('envio-search')?.value || '').toLowerCase().trim();
  const filtroEstado = document.getElementById('envio-filter-estado')?.value || '';

  const filtradas = novias.filter(n => {
    if (!n.envio) return false;
    const estado = n.envio?.estado || 'pendiente';
    if (filtroEstado && estado !== filtroEstado) return false;
    if (q) {
      const hayNombre = (n.nombre || '').toLowerCase().includes(q);
      const hayTracking = (n.envio?.tracking || '').toLowerCase().includes(q);
      if (!hayNombre && !hayTracking) return false;
    }
    return true;
  });

  if (!filtradas.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;opacity:.6;padding:24px">Sin envíos cargados todavía. Cargá datos desde la ficha de una novia.</td></tr>`;
    return;
  }

  tb.innerHTML = filtradas.map(n => {
    const estado = n.envio?.estado || 'pendiente';
    const correo = n.envio?.correo?.empresa || '—';
    const desp = n.envio?.fecha_despacho || '—';
    const trk = n.envio?.tracking || '—';
    return `
      <tr>
        <td>${escapeHtml(n.nombre || '')}</td>
        <td>${escapeHtml(n.fecha || '—')}</td>
        <td>${envioEstadoBadge(estado)}</td>
        <td>${escapeHtml(correo)}</td>
        <td>${escapeHtml(desp)}</td>
        <td>${escapeHtml(trk)}</td>
        <td>
          <div class="envio-row-actions">
            <button class="btn-ghost" onclick="openEnvio(${n.id})" aria-label="Editar envío de ${escapeHtml(n.nombre || '')}">Editar</button>
            <button class="btn-ghost" onclick="copiarMensajeEnvio(${n.id})" aria-label="Copiar mensaje de envío">Copiar</button>
            <button class="btn-primary" onclick="abrirWhatsAppLogistica(${n.id})" aria-label="Abrir WhatsApp logística">WhatsApp</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ===== Mensaje de WhatsApp para logística (omite líneas vacías) =====
function envioMessage(n) {
  if (!n) return '';
  const e = n.envio || {};
  const bullets = [];

  // Título
  const out = [];
  out.push(`📦 ENVÍO DELANUK · ${n.nombre || ''}`.trim());

  // Destinataria
  const dest = e.destinatario || {};
  if (envioSectionHasData(dest)) {
    out.push('');
    out.push('DESTINATARIA');
    if (envioHasValue(dest.nombre)) out.push(`• Nombre: ${dest.nombre}`);
    if (envioHasValue(dest.tel))    out.push(`• Tel: ${dest.tel}`);
    if (envioHasValue(dest.email))  out.push(`• Email: ${dest.email}`);
    if (envioHasValue(dest.dni))    out.push(`• DNI: ${dest.dni}`);
  }

  // Dirección
  const dir = e.direccion || {};
  if (envioSectionHasData(dir)) {
    out.push('');
    out.push('DIRECCIÓN');
    // Línea 1: calle + número + piso + depto (solo partes con valor)
    const l1parts = [];
    if (envioHasValue(dir.calle))  l1parts.push(dir.calle);
    if (envioHasValue(dir.numero)) l1parts.push(dir.numero);
    let l1 = l1parts.join(' ').trim();
    const pisoDepto = [];
    if (envioHasValue(dir.piso))  pisoDepto.push(`piso ${dir.piso}`);
    if (envioHasValue(dir.depto)) pisoDepto.push(`depto ${dir.depto}`);
    if (pisoDepto.length) l1 = l1 ? `${l1}, ${pisoDepto.join(' ')}` : pisoDepto.join(' ');
    if (l1) out.push(`• ${l1}`);

    // Línea 2: ciudad + provincia + cp
    const l2parts = [];
    if (envioHasValue(dir.ciudad))    l2parts.push(dir.ciudad);
    if (envioHasValue(dir.provincia)) l2parts.push(dir.provincia);
    let l2 = l2parts.join(', ');
    if (envioHasValue(dir.cp)) l2 = l2 ? `${l2} (CP ${dir.cp})` : `CP ${dir.cp}`;
    if (l2) out.push(`• ${l2}`);

    if (envioHasValue(dir.referencia)) out.push(`• Referencia: ${dir.referencia}`);
  }

  // Paquete
  const pq = e.paquete || {};
  const pqHasValue = envioHasValue(pq.descripcion) || envioHasValue(pq.peso_kg) ||
                     envioHasValue(pq.dimensiones) || envioHasValue(pq.valor_declarado) ||
                     pq.contenido_fragil === true;
  if (pqHasValue) {
    out.push('');
    out.push('PAQUETE');
    if (envioHasValue(pq.descripcion))     out.push(`• Contenido: ${pq.descripcion}`);
    const pesoDim = [];
    if (envioHasValue(pq.peso_kg))     pesoDim.push(`${pq.peso_kg} kg`);
    if (envioHasValue(pq.dimensiones)) pesoDim.push(pq.dimensiones);
    if (pesoDim.length) out.push(`• Peso: ${pesoDim.join(' · ')}`);
    if (envioHasValue(pq.valor_declarado)) out.push(`• Valor declarado: $${pq.valor_declarado}`);
    if (pq.contenido_fragil === true)      out.push(`• Frágil: sí`);
  }

  // Correo / Logística
  const co = e.correo || {};
  if (envioSectionHasData(co)) {
    out.push('');
    out.push('LOGÍSTICA');
    const correo = [];
    if (envioHasValue(co.empresa))  correo.push(co.empresa);
    if (envioHasValue(co.servicio)) correo.push(co.servicio);
    if (correo.length) out.push(`• Correo: ${correo.join(' · ')}`);
    if (envioHasValue(co.horario_entrega))         out.push(`• Horario preferido: ${co.horario_entrega}`);
    if (envioHasValue(co.instrucciones_especiales)) out.push(`• Instrucciones: ${co.instrucciones_especiales}`);
  }

  // Fecha entrega estimada
  if (envioHasValue(e.fecha_entrega_estimada)) {
    out.push('');
    out.push(`Entrega deseada antes del ${e.fecha_entrega_estimada}`);
  }

  // Notas
  if (envioHasValue(e.notas)) {
    out.push('');
    out.push(`Notas: ${e.notas}`);
  }

  // Limpieza: evitar dobles saltos de línea extra al inicio/final
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ===== URL de WhatsApp para logística =====
function envioWhatsAppUrl(n) {
  const numero = (window.DELANUK_CONFIG && window.DELANUK_CONFIG.LOGISTICA_WHATSAPP) || '';
  const limpio = String(numero).replace(/[^0-9]/g, '');
  if (!limpio) return null;
  const text = encodeURIComponent(envioMessage(n));
  return `https://wa.me/${limpio}?text=${text}`;
}

// ===== Copiar mensaje (con fallback) =====
async function copiarMensajeEnvio(id) {
  const n = (window.AppState?.novias || []).find(x => x.id === id);
  if (!n) return;
  const msg = envioMessage(n);
  try {
    await navigator.clipboard.writeText(msg);
    showToast('Mensaje de envío copiado ✓');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = msg;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Mensaje de envío copiado ✓');
  }
}

// ===== Abrir WhatsApp de logística =====
function abrirWhatsAppLogistica(id) {
  const n = (window.AppState?.novias || []).find(x => x.id === id);
  if (!n) { showToast('Novia no encontrada'); return; }
  const url = envioWhatsAppUrl(n);
  if (!url) { showToast('Falta configurar el número de logística'); return; }
  window.open(url, '_blank');
}

// ===== Sección Envío dentro de la ficha =====
// Inyecta el bloque "ENVÍO" al final de #ficha-body, sin tocar el resto.
function renderEnvioFicha(n) {
  const body = document.getElementById('ficha-body');
  if (!body || !n) return;

  // Quitar versión anterior (si openFicha se re-renderiza)
  const prev = body.querySelector('.ficha-envio');
  if (prev) prev.remove();

  const wrap = document.createElement('div');
  wrap.className = 'ficha-envio';

  if (!n.envio) {
    wrap.innerHTML = `
      <h4>Envío</h4>
      <button type="button" class="btn-empty" onclick="openEnvio(${n.id})" aria-label="Cargar datos de envío">
        + Cargar datos de envío
      </button>
    `;
    body.appendChild(wrap);
    return;
  }

  const estado = n.envio?.estado || 'pendiente';
  const correo = n.envio?.correo?.empresa || '—';
  const trk    = n.envio?.tracking || '—';
  const desp   = n.envio?.fecha_despacho || '—';

  wrap.innerHTML = `
    <h4>Envío</h4>
    <div class="envio-resumen">
      <div><span>Estado</span>${envioEstadoBadge(estado)}</div>
      <div><span>Correo</span>${escapeHtml(correo)}</div>
      <div><span>Tracking</span>${escapeHtml(trk)}</div>
      <div><span>Despacho</span>${escapeHtml(desp)}</div>
    </div>
    <div class="envio-acciones">
      <button class="btn-ghost" onclick="openEnvio(${n.id})">Editar</button>
      <button class="btn-ghost" onclick="copiarMensajeEnvio(${n.id})">Copiar mensaje</button>
      <button class="btn-primary" onclick="abrirWhatsAppLogistica(${n.id})">Abrir WhatsApp logística</button>
    </div>
  `;
  body.appendChild(wrap);
}
