// ===== CONSTANTES VISUALES =====
const BADGE_CLASS = {
  'Pendiente': 'b-pend',
  'Propuesta enviada': 'b-prop',
  'Confirmado': 'b-conf',
  'Produccion': 'b-prod',
  'Entregado': 'b-entr',
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
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
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
  const saldo = (n.total || 0) - (n.sena || 0);
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
  const saldo = n.total > 0 ? n.total - n.sena : null;
  const next = nextAction(n);
  const urg = isUrgent(n) ? ' <span class="badge b-urgent">Urgente</span>' : '';
  const arch = n.archivada ? ' <span class="badge b-archived">Archivada</span>' : '';
  const piezasTd = `<td class="td-piezas td-muted" title="${escapeHtml(n.piezas || '')}">${escapeHtml(n.piezas) || '-'}</td>`;
  const nextLine = next ? `<br><span class="next-action">▶ ${escapeHtml(next)}</span>` : '';

  if (contexto === 'dashboard') {
    return `
      <tr>
<td><span class="td-name">${escapeHtml(n.nombre)}</span>${urg}${arch}</td>        <td><span class="td-muted">${escapeHtml(n.fecha) || '-'}</span></td>
        <td>${badge(n.estado)}${nextLine}</td>
        ${piezasTd}
        <td><span class="td-muted">${escapeHtml(n.resp) || '-'}</span></td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">${saldo !== null ? '$' + fmt(saldo) : '-'}</td>
        <td><div class="row-actions"><button class="row-btn" onclick="openFicha(${n.id})">Ver ficha</button></div></td>
      </tr>`;
  }

  const pagoBadge = n.total > 0
    ? (saldo === 0 ? `<span class="badge b-paid">Pagado</span>`
        : n.sena > 0 ? `<span class="badge b-partial">Sena</span>`
        : `<span class="badge b-nopago">Sin sena</span>`)
    : `<span class="td-muted">-</span>`;

  return `
    <tr>
      <td>
        <span class="td-name">${escapeHtml(n.nombre)}</span>${urg}${arch}
        ${n.resp ? `<br><span class="td-muted">${escapeHtml(n.resp)}</span>` : ''}
      </td>
      <td class="td-muted">${escapeHtml(n.fecha) || '-'}</td>
      <td class="td-muted">${escapeHtml(n.ciudad) || '-'}</td>
      ${piezasTd}
      <td>${badge(n.estado)}${nextLine}</td>
      <td>${pagoBadge}</td>
      <td><div class="row-actions">
        <button class="row-btn" onclick="openFicha(${n.id})">Ficha</button>
        <button class="row-btn" onclick="openModal('edit',${n.id})">Editar</button>
      </div></td>
    </tr>`;
}

// ===== DASHBOARD =====
function renderDash() {
  const novias = window.AppState.novias.filter(n => !n.archivada);
  const q = window.AppState.dashSearch.toLowerCase();
  const pend = novias.filter(n => n.estado === 'Pendiente').length;
  const conf = novias.filter(n => n.estado === 'Confirmado').length;
  const saldoTotal = novias.reduce((a, n) => a + ((n.total || 0) - (n.sena || 0)), 0);
  document.getElementById('dash-subtitle').textContent = `${novias.length} novias activas`;
  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Novias activas</div><div class="kpi-val rose">${novias.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pendientes accion</div><div class="kpi-val red">${pend}</div></div>
    <div class="kpi-card"><div class="kpi-label">Confirmadas</div><div class="kpi-val blue">${conf}</div></div>
    <div class="kpi-card admin-only"><div class="kpi-label">Saldo a cobrar</div><div class="kpi-val green">$${fmt(saldoTotal)}</div></div>
  `;
  const si = document.getElementById('dash-search');
  if (si && si.value !== window.AppState.dashSearch) si.value = window.AppState.dashSearch;

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
    tbody.insertAdjacentHTML('beforeend', renderRow(n, 'dashboard'));
  });
}

// ===== LISTA DE NOVIAS =====
function renderNovias() {
  const novias = window.AppState.novias;
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
      if (col === 'saldo')  return dir * (((a.total||0)-(a.sena||0)) - ((b.total||0)-(b.sena||0)));
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
function renderPagos() {
  const novias = window.AppState.novias.filter(n => !n.archivada);
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
    const estBadge = saldo === 0 ? `<span class="badge b-paid">Pagado</span>`
      : n.sena > 0 ? `<span class="badge b-partial">Sena</span>`
      : `<span class="badge b-nopago">Sin sena</span>`;
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="td-name">${escapeHtml(n.nombre)}</span><br><span class="td-muted">${escapeHtml(n.fecha) || '-'}</span></td>
        <td class="amount">$${fmt(n.total)}</td>
        <td class="amount paid">$${fmt(n.sena)}</td>
        <td class="td-muted">${escapeHtml(n.fsena) || '-'}</td>
        <td class="amount ${saldo > 0 ? 'due' : ''}">$${fmt(saldo)}</td>
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
  let res;
  if (window.AppState.editId) {
    res = await apiUpdateNovia(window.AppState.editId, data);
  } else {
    data.checklist = mkCheck(0);
    res = await apiInsertNovia(data);
  }
  if (res.error) { alert('Error guardando: ' + res.error.message); return; }
  closeModal('form');
  showToast(window.AppState.editId ? 'Novia actualizada' : 'Novia agregada');
  await loadNovias();
}

async function deleteNovia(id) {
  const n = window.AppState.novias.find(x => x.id === id);
  if (!n) return;
  if (!confirm(`¿Eliminar a ${n.nombre}? Esta acción no se puede deshacer.`)) return;
  const { error } = await apiDeleteNovia(id);
  if (error) { showToast('Error al eliminar'); return; }
  closeModal('ficha');
  showToast(`${n.nombre} eliminada`);
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
}
window.toggleArchivada = toggleArchivada;

// ===== FICHA =====
function openFicha(id, opts = {}) {
  window.AppState.fichaId = id;
  const n = window.AppState.novias.find(x => x.id === id);
  if (!n) return;

  if (!opts.fromHash) {
    const targetHash = `#/novia/${id}`;
    if (location.hash !== targetHash) history.pushState(null, '', targetHash);
  }

  const done = n.checklist.filter(c => c.done).length;
  const saldo = (n.total || 0) - (n.sena || 0);
  const wa = waLink(n.tel);
  const ig = igLink(n.ig);
  const waMsg = wa ? waLinkWithMessage(n) : null;

  document.getElementById('ficha-name').textContent = n.nombre;
  document.getElementById('ficha-body').innerHTML = `
   <div class="ficha-hero">
  <div>
    <div class="ficha-hero-name">${escapeHtml(n.nombre)} ${badge(n.estado)}${isUrgent(n) ? ' <span class="badge b-urgent">Urgente</span>' : ''}${n.archivada ? ' <span class="badge b-archived">Archivada</span>' : ''}</div>
    <div class="ficha-hero-sub">
      ${escapeHtml(n.fecha) || 'Fecha a confirmar'} - ${escapeHtml(n.ciudad) || '-'} - ${escapeHtml(n.tipo) || '-'}<br>
      ${escapeHtml(n.rol || '')}${n.resp ? ' - Responsable: ' + escapeHtml(n.resp) : ''}
    </div>
  </div>
</div>
<div style="margin-top:8px">
  <button class="btn-ghost" onclick="toggleArchivada(${n.id})" style="font-size:12px;padding:6px 12px">
    ${n.archivada ? '↩ Desarchivar' : '🗄 Archivar'}
  </button>
</div>
    ${(wa || ig) ? `<div class="ficha-sec">Contacto</div>
      <div class="contact-row">
        ${wa ? `<a class="chip chip-link" href="${waMsg}" target="_blank" rel="noopener">WhatsApp · ${escapeHtml(n.tel)}</a>` : ''}
        ${wa ? `<button class="chip chip-action" type="button" onclick="copyWaMessage(${n.id})" title="Copiar mensaje con saldo, fecha y piezas">📋 Copiar mensaje</button>` : ''}
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
    <div class="ficha-sec">Proceso - ${done}/${n.checklist.length} etapas completadas</div>
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
  const n = window.AppState.novias.find(x => x.id === nid);
  const wasDone = n.checklist[idx].done;
  n.checklist[idx].done = !wasDone;
  n.checklist[idx].fechaDone = !wasDone ? new Date().toISOString() : null;
  renderChecklist(n);
  const { error } = await apiUpdateNovia(nid, { checklist: n.checklist });
  if (error) {
    n.checklist[idx].done = wasDone;
    n.checklist[idx].fechaDone = wasDone ? n.checklist[idx].fechaDone : null;
    renderChecklist(n);
    showToast('Error guardando cambio');
  }
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
  const totalCobrado = pagosActualizados.reduce((a, p) => a + p.monto, 0);

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
    n.sena = (n.pagos || []).reduce((a, p) => a + p.monto, 0);
    openFicha(nid);
  }
}

async function deletePago(nid, idx) {
  if (!confirm('Eliminar este pago?')) return;

  const n = window.AppState.novias.find(x => x.id === nid);
  const pagoEliminado = n.pagos[idx];
  const pagosActualizados = (n.pagos || []).filter((_, i) => i !== idx);
  const totalCobrado = pagosActualizados.reduce((a, p) => a + p.monto, 0);

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
    n.sena = n.pagos.reduce((a, p) => a + p.monto, 0);
    openFicha(nid);
  }
}

function editFromFicha() {
  closeModal('ficha');
  openModal('edit', window.AppState.fichaId);
}

// ===== EXPORT CSV =====
function exportCSV() {
  const noviasHeaders = ['ID','Nombre','Fecha Boda','Estado','Ciudad','Tipo','Rol','Responsable','Total','Cobrado','Saldo','Tel','IG','Piezas','Notas'];
  const noviasRows = window.AppState.novias.map(n => [
    n.id, n.nombre, n.fecha, n.estado, n.ciudad, n.tipo, n.rol, n.resp,
    n.total, n.sena, n.total - n.sena, n.tel, n.ig, n.piezas,
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
