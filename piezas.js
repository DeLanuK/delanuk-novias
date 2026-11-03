// ===== PIEZAS · Catálogo de piezas presupuestadas =====
// Cada pieza que se presupuesta queda registrada acá con su costo y su precio,
// para tenerla a mano la próxima vez que aparezca una parecida.
// Tabla: piezas_catalogo (ver SETUP_PIEZAS.md). El presupuesto la alimenta solo.

window.AppState.piezas = [];
window.AppState.piezasLoaded = false;

const PIEZA_CATEGORIAS = ['Rosario','Tocado','Tiara','Aros','Collar','Pulsera','Anillo','Tobillera','Prendedor','Otro'];

// ---------- Carga ----------
async function loadPiezas() {
  try {
    window.AppState.piezas = await apiLoadPiezas();
    window.AppState.piezasLoaded = true;
    renderPiezas();
  } catch (e) {
    console.error('Error cargando piezas:', e);
    const tb = document.getElementById('piezas-tbody');
    if (tb) tb.innerHTML = `<tr><td colspan="8" class="empty">No se pudo cargar el catálogo de piezas.<br><span style="font-size:11px">¿Ya corriste el script de SETUP_PIEZAS.md en Supabase?</span></td></tr>`;
    showToast('Error cargando el catálogo de piezas');
  }
}

// ---------- Helpers ----------
function piezaNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}
function piezaFmtFecha(iso) {
  if (!iso) return '—';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : escapeHtml(iso);
}
function piezaMargen(p) {
  if (!(p.precio > 0) || !(p.costo > 0)) return null;
  return Math.round((p.precio - p.costo) / p.precio * 100);
}
function piezaCategoriaAuto(nombre) {
  const n = piezaNorm(nombre);
  if (/rosario/.test(n)) return 'Rosario';
  if (/tocado|peinet/.test(n)) return 'Tocado';
  if (/tiara|corona|vincha/.test(n)) return 'Tiara';
  if (/\baro\b|\baros\b|argolla|pendiente/.test(n)) return 'Aros';
  if (/collar|gargantilla|cadena|choker/.test(n)) return 'Collar';
  if (/pulsera|brazalete/.test(n)) return 'Pulsera';
  if (/anillo|alianza/.test(n)) return 'Anillo';
  if (/tobillera/.test(n)) return 'Tobillera';
  if (/prendedor|broche|\bpin\b/.test(n)) return 'Prendedor';
  return 'Otro';
}
function piezaCategorias() {
  const set = new Set(PIEZA_CATEGORIAS);
  (window.AppState.piezas || []).forEach(p => { if (p.categoria) set.add(p.categoria); });
  return [...set];
}

// ---------- KPIs ----------
function renderPiezasKpis(list) {
  const cont = document.getElementById('kpi-piezas');
  if (!cont) return;
  const activas = list.filter(p => p.activo);
  const sinCosto = activas.filter(p => !(p.costo > 0)).length;
  const conMargen = activas.filter(p => piezaMargen(p) !== null);
  const margenProm = conMargen.length
    ? Math.round(conMargen.reduce((a, p) => a + piezaMargen(p), 0) / conMargen.length)
    : null;
  const masUsada = activas.slice().sort((a, b) => (b.veces || 0) - (a.veces || 0))[0];
  cont.innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Piezas en catálogo</div><div class="kpi-val">${activas.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Sin costo cargado</div><div class="kpi-val ${sinCosto ? 'red' : ''}">${sinCosto}</div></div>
    <div class="kpi-card"><div class="kpi-label">Margen promedio</div><div class="kpi-val rose">${margenProm === null ? '—' : margenProm + '%'}</div></div>
    <div class="kpi-card"><div class="kpi-label">Más presupuestada</div><div class="kpi-val" style="font-size:13px;line-height:1.3" title="${escapeHtml(masUsada ? masUsada.nombre : '')}">${masUsada ? escapeHtml(masUsada.nombre).slice(0, 40) + (masUsada.veces > 1 ? ' · ' + masUsada.veces + ' veces' : '') : '—'}</div></div>
  `;
}

// ---------- Tabla ----------
function renderPiezas() {
  if (!window.AppState.piezasLoaded) { loadPiezas(); return; }
  const list = window.AppState.piezas || [];
  renderPiezasKpis(list);

  // Filtro de categorías: mantener selección al re-renderizar
  const selCat = document.getElementById('piezas-filter-cat');
  if (selCat) {
    const actual = selCat.value;
    const opts = ['<option value="">Todas las categorías</option>']
      .concat(piezaCategorias().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`));
    if (selCat.innerHTML !== opts.join('')) selCat.innerHTML = opts.join('');
    selCat.value = actual;
  }

  const q = piezaNorm(document.getElementById('piezas-search')?.value || '');
  const palabras = q.split(' ').filter(Boolean);
  const cat = selCat?.value || '';
  const fCosto = document.getElementById('piezas-filter-costo')?.value || '';

  const filtradas = list.filter(p => {
    if (!p.activo) return false;
    if (cat && p.categoria !== cat) return false;
    if (fCosto === 'sin' && p.costo > 0) return false;
    if (fCosto === 'con' && !(p.costo > 0)) return false;
    if (palabras.length) {
      const key = piezaNorm([p.nombre, p.categoria, p.descripcion, p.notas, p.novia_nombre].join(' '));
      if (!palabras.every(w => key.includes(w))) return false;
    }
    return true;
  });

  const sub = document.getElementById('piezas-sub');
  if (sub) sub.textContent = `${filtradas.length} de ${list.filter(p => p.activo).length} piezas · se suman solas al guardar un presupuesto`;

  const tb = document.getElementById('piezas-tbody');
  if (!tb) return;
  if (!filtradas.length) {
    tb.innerHTML = `<tr><td colspan="8" class="empty">${list.length
      ? 'No hay piezas que coincidan con la búsqueda.'
      : 'El catálogo está vacío. Se llena solo cuando guardás un presupuesto desde la ficha de una novia, o tocá “+ Nueva pieza”.'}</td></tr>`;
    return;
  }
  tb.innerHTML = filtradas.map(p => {
    const m = piezaMargen(p);
    const margenHtml = m === null
      ? '<span class="td-muted">—</span>'
      : `<span class="amount ${m < 40 ? 'due' : 'paid'}">${m}%</span>`;
    const costoHtml = p.costo > 0
      ? `<span class="amount">$${fmt(Math.round(p.costo))}</span>`
      : `<button class="row-btn" onclick="openPieza(${p.id})" title="Cargar costo">cargar</button>`;
    const detalle = p.descripcion ? `<br><span class="td-muted" style="font-size:11px">${escapeHtml(p.descripcion)}</span>` : '';
    const ultima = p.novia_nombre
      ? `${escapeHtml(p.novia_nombre)}<br><span class="td-muted" style="font-size:11px">${piezaFmtFecha(p.fecha)}</span>`
      : `<span class="td-muted">${piezaFmtFecha(p.fecha)}</span>`;
    return `
      <tr>
        <td><span class="td-name">${escapeHtml(p.nombre)}</span>${detalle}</td>
        <td><span class="badge b-pend">${escapeHtml(p.categoria || 'Otro')}</span></td>
        <td>${costoHtml}</td>
        <td class="amount">$${fmt(Math.round(p.precio))}</td>
        <td>${margenHtml}</td>
        <td>${ultima}</td>
        <td class="td-muted">${p.veces || 1}</td>
        <td><div class="row-actions">
          <button class="row-btn" onclick="openPieza(${p.id})">Editar</button>
          <button class="row-btn" onclick="deletePieza(${p.id})" title="Eliminar del catálogo">✕</button>
        </div></td>
      </tr>`;
  }).join('');
}

// ---------- Modal nueva / editar ----------
function openPieza(id) {
  const p = id ? (window.AppState.piezas || []).find(x => x.id === id) : null;
  document.getElementById('pieza-modal-title').textContent = p ? 'Editar pieza' : 'Nueva pieza';
  document.getElementById('pz-id').value = p ? p.id : '';
  document.getElementById('pz-nombre').value = p ? (p.nombre || '') : '';
  document.getElementById('pz-categoria').value = p ? (p.categoria || 'Otro') : 'Otro';
  document.getElementById('pz-fecha').value = p && p.fecha ? String(p.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10);
  document.getElementById('pz-costo').value = p && p.costo > 0 ? Math.round(p.costo) : '';
  document.getElementById('pz-precio').value = p && p.precio > 0 ? Math.round(p.precio) : '';
  document.getElementById('pz-descripcion').value = p ? (p.descripcion || '') : '';
  document.getElementById('pz-notas').value = p ? (p.notas || '') : '';
  const origen = document.getElementById('pz-origen');
  if (origen) {
    origen.textContent = p
      ? `Presupuestada ${p.veces || 1} ${p.veces === 1 ? 'vez' : 'veces'}${p.novia_nombre ? ' · última: ' + p.novia_nombre : ''}. Cambiar el nombre acá no modifica los presupuestos ya guardados en las fichas.`
      : 'Las piezas también se agregan solas cuando guardás un presupuesto desde la ficha de una novia.';
  }
  document.getElementById('overlay-pieza').classList.add('open');
  setTimeout(() => document.getElementById('pz-nombre').focus(), 50);
}

// Categoría automática mientras se escribe el nombre (solo si no la tocó a mano)
document.addEventListener('DOMContentLoaded', () => {
  const nombre = document.getElementById('pz-nombre');
  const cat = document.getElementById('pz-categoria');
  if (!nombre || !cat) return;
  let manual = false;
  cat.addEventListener('change', () => { manual = true; });
  nombre.addEventListener('focus', () => { manual = !!document.getElementById('pz-id').value; });
  nombre.addEventListener('input', () => { if (!manual) cat.value = piezaCategoriaAuto(nombre.value); });
});

async function savePieza() {
  const id = Number(document.getElementById('pz-id').value) || null;
  const nombre = document.getElementById('pz-nombre').value.trim();
  if (!nombre) { showToast('Falta el nombre de la pieza'); return; }
  const data = {
    nombre,
    categoria: document.getElementById('pz-categoria').value || 'Otro',
    fecha: document.getElementById('pz-fecha').value || null,
    costo: Number(document.getElementById('pz-costo').value) || 0,
    precio: Number(document.getElementById('pz-precio').value) || 0,
    descripcion: document.getElementById('pz-descripcion').value.trim() || null,
    notas: document.getElementById('pz-notas').value.trim() || null,
    activo: true,
  };
  // Evitar duplicados por nombre (la base tiene índice único sin mayúsculas ni espacios de más)
  const dup = (window.AppState.piezas || []).find(p => p.id !== id && piezaNorm(p.nombre) === piezaNorm(nombre));
  if (dup) { showToast(`Ya existe una pieza con ese nombre (${dup.categoria}). Editala desde la lista.`); return; }

  const btn = document.getElementById('btn-save-pieza');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    const res = id ? await apiUpdatePieza(id, data) : await apiInsertPieza(data);
    if (res.error) throw res.error;
    const saved = res.data;
    const list = window.AppState.piezas;
    const i = list.findIndex(p => p.id === saved.id);
    const norm = { ...saved, costo: Number(saved.costo) || 0, precio: Number(saved.precio) || 0, veces: Number(saved.veces) || 0, activo: saved.activo !== false };
    if (i >= 0) list[i] = norm; else list.unshift(norm);
    closeModal('pieza');
    renderPiezas();
    showToast(id ? 'Pieza actualizada ✓' : 'Pieza agregada al catálogo ✓');
  } catch (e) {
    console.error(e);
    showToast('No se pudo guardar la pieza: ' + (e.message || e));
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

async function deletePieza(id) {
  const p = (window.AppState.piezas || []).find(x => x.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.nombre}" del catálogo?\nLos presupuestos ya guardados en las fichas no se tocan.`)) return;
  try {
    const { error } = await apiDeletePieza(id);
    if (error) throw error;
    window.AppState.piezas = window.AppState.piezas.filter(x => x.id !== id);
    renderPiezas();
    showToast('Pieza eliminada');
  } catch (e) {
    console.error(e);
    showToast('No se pudo eliminar la pieza');
  }
}
