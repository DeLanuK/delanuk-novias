// ===== COMPRAS · Facturas de proveedores =====
// Fase 1: registro manual de facturas (gratis, sin IA).
// Flujo tipo reel: (1) foto opcional → (2) datos → (3) factura registrada.

window.AppState.compras = [];
window.AppState.comprasLoaded = false;

// Estado temporal del formulario "Nueva factura"
const CompraForm = {
  editId: null,
  foto: null,       // dataURL comprimido, o null
  proveedor: '',    // proveedor elegido de los chips
  pagado: false,
};

// ---------- Carga de datos ----------
async function loadCompras() {
  try {
    window.AppState.compras = await apiLoadCompras();
    window.AppState.comprasLoaded = true;
    renderCompras();
  } catch (e) {
    console.error('Error cargando compras:', e);
    const tb = document.getElementById('compras-tbody');
    if (tb) tb.innerHTML = `<tr><td colspan="6" class="empty">No se pudieron cargar las compras.<br><span style="font-size:11px">¿Ya creaste la tabla en Supabase? Ver SETUP_COMPRAS.md</span></td></tr>`;
    showToast('Error cargando compras');
  }
}

// ---------- Helpers ----------
function comprasFmtMoneda(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2,
  }).format(Number(n) || 0);
}
function comprasFmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return escapeHtml(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
function proveedoresUsados() {
  const set = new Set();
  (window.AppState.compras || []).forEach(c => {
    if (c.proveedor && c.proveedor.trim()) set.add(c.proveedor.trim());
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

// Comprime una imagen a JPEG chico (para no saturar la base de datos)
function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height > width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        try { resolve(canvas.toDataURL('image/jpeg', quality)); }
        catch (err) { reject(err); }
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- KPIs ----------
function renderComprasKpis(list) {
  const cont = document.getElementById('kpi-compras');
  if (!cont) return;
  const hoy = new Date();
  const mes = hoy.getMonth(), anio = hoy.getFullYear();
  let gastoMes = 0, cantMes = 0, sinPagar = 0;
  list.forEach(c => {
    const d = c.fecha ? new Date(c.fecha + 'T00:00:00') : null;
    if (d && !isNaN(d) && d.getMonth() === mes && d.getFullYear() === anio) {
      gastoMes += c.monto; cantMes++;
    }
    if (!c.pagado) sinPagar += c.monto;
  });
  cont.innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Gastado este mes</div><div class="kpi-val rose">${comprasFmtMoneda(gastoMes)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Sin pagar</div><div class="kpi-val red">${comprasFmtMoneda(sinPagar)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Facturas del mes</div><div class="kpi-val">${cantMes}</div></div>
    <div class="kpi-card"><div class="kpi-label">Proveedores</div><div class="kpi-val">${proveedoresUsados().length}</div></div>
  `;
}

// ---------- Tabla ----------
function renderCompras() {
  if (!window.AppState.comprasLoaded) { loadCompras(); return; }
  const list = window.AppState.compras || [];
  renderComprasKpis(list);

  const q = (document.getElementById('compras-search')?.value || '').toLowerCase().trim();
  const filtroPago = document.getElementById('compras-filter-pago')?.value || '';
  const filtradas = list.filter(c => {
    if (filtroPago === 'pagado' && !c.pagado) return false;
    if (filtroPago === 'nopago' && c.pagado) return false;
    if (q) {
      const hay = (c.proveedor || '').toLowerCase().includes(q) ||
                  (c.nro_factura || '').toLowerCase().includes(q);
      if (!hay) return false;
    }
    return true;
  });

  const tb = document.getElementById('compras-tbody');
  if (!tb) return;
  if (!filtradas.length) {
    tb.innerHTML = `<tr><td colspan="6" class="empty">${list.length ? 'No hay facturas que coincidan con la búsqueda.' : 'Todavía no cargaste facturas. Tocá “+ Nueva factura”.'}</td></tr>`;
    return;
  }
  tb.innerHTML = filtradas.map(c => {
    const pagoBadge = c.pagado
      ? `<span class="badge b-paid">Pagado</span>`
      : `<span class="badge b-nopago">No pagado</span>`;
    const foto = c.foto ? ` <span class="compra-foto-dot" title="Tiene foto adjunta">📎</span>` : '';
    return `
      <tr>
        <td class="td-muted">${comprasFmtFecha(c.fecha)}</td>
        <td><span class="td-name">${escapeHtml(c.proveedor)}</span>${foto}</td>
        <td class="td-muted">${escapeHtml(c.nro_factura) || '—'}</td>
        <td class="amount">${comprasFmtMoneda(c.monto)}</td>
        <td>${pagoBadge}</td>
        <td><div class="row-actions">
          <button class="row-btn" onclick="toggleCompraPagado(${c.id})">${c.pagado ? 'Marcar impago' : 'Marcar pagado'}</button>
          <button class="row-btn" onclick="openCompraEdit(${c.id})">Editar</button>
          <button class="row-btn" onclick="deleteCompra(${c.id})" title="Eliminar">✕</button>
        </div></td>
      </tr>`;
  }).join('');
}

// ---------- Modal: control de pasos ----------
function compraStep(n) {
  document.querySelectorAll('#overlay-compra .compra-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('compra-step-' + n);
  if (el) el.classList.add('active');
  const foot = document.getElementById('compra-foot');
  if (foot) foot.style.display = (n === 2) ? 'flex' : 'none';
}

function openCompra() {
  CompraForm.editId = null;
  CompraForm.foto = null;
  CompraForm.proveedor = '';
  CompraForm.pagado = false;
  document.getElementById('compra-modal-title').textContent = 'Nueva factura';
  const camInput = document.getElementById('compra-foto-input-cam');
  const galInput = document.getElementById('compra-foto-input');
  if (camInput) camInput.value = '';
  if (galInput) galInput.value = '';
  document.getElementById('compra-fecha').value = hoyISO();
  document.getElementById('compra-nro').value = '';
  document.getElementById('compra-monto').value = '';
  document.getElementById('compra-otro').value = '';
  updateMontoPreview();
  renderThumb();
  renderProveedorChips();
  setCompraPagado(false);
  compraStep(1);
  document.getElementById('overlay-compra').classList.add('open');
}

function openCompraEdit(id) {
  const c = (window.AppState.compras || []).find(x => x.id === id);
  if (!c) return;
  CompraForm.editId = id;
  CompraForm.foto = c.foto || null;
  CompraForm.proveedor = c.proveedor || '';
  CompraForm.pagado = !!c.pagado;
  document.getElementById('compra-modal-title').textContent = 'Editar factura';
  document.getElementById('compra-fecha').value = c.fecha || hoyISO();
  document.getElementById('compra-nro').value = c.nro_factura || '';
  document.getElementById('compra-monto').value = c.monto || '';
  document.getElementById('compra-otro').value = '';
  updateMontoPreview();
  renderThumb();
  renderProveedorChips();
  setCompraPagado(!!c.pagado);
  compraStep(2);
  document.getElementById('overlay-compra').classList.add('open');
}

function closeCompra() {
  document.getElementById('overlay-compra').classList.remove('open');
}

// ---------- Foto ----------
function renderThumb() {
  const wrap = document.getElementById('compra-thumb-wrap');
  if (!wrap) return;
  wrap.innerHTML = CompraForm.foto
    ? `<img src="${CompraForm.foto}" alt="Foto de la factura" class="compra-thumb"><button type="button" class="compra-thumb-x" onclick="quitarFotoCompra()" title="Quitar foto">×</button>`
    : '';
}
async function onCompraFoto(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    showToast('Procesando foto…');
    CompraForm.foto = await compressImage(file, 1400, 0.7);
    renderThumb();
    compraStep(2);
  } catch (e) {
    console.error(e);
    showToast('No se pudo procesar la foto');
  }
}
function quitarFotoCompra() {
  CompraForm.foto = null;
  renderThumb();
}
function compraSinFoto() {
  CompraForm.foto = null;
  renderThumb();
  compraStep(2);
}

// ---------- Proveedor (chips + "otro") ----------
function renderProveedorChips() {
  const cont = document.getElementById('compra-proveedores');
  if (!cont) return;
  const usados = proveedoresUsados();
  if (!usados.length) {
    cont.innerHTML = '<span class="chip-empty">Todavía no cargaste proveedores. Escribí uno nuevo abajo 👇</span>';
    return;
  }
  cont.innerHTML = usados.map(p =>
    `<button type="button" class="chip-opt${CompraForm.proveedor === p ? ' active' : ''}" data-prov="${escapeHtml(p)}">${escapeHtml(p)}</button>`
  ).join('');
}
function selectProveedor(name) {
  CompraForm.proveedor = name;
  const otro = document.getElementById('compra-otro');
  if (otro) otro.value = '';
  renderProveedorChips();
}
function onOtroInput() {
  const v = (document.getElementById('compra-otro').value || '').trim();
  if (v && CompraForm.proveedor) { CompraForm.proveedor = ''; renderProveedorChips(); }
}
// Delegación: un solo listener para todos los chips de proveedor
document.addEventListener('click', (e) => {
  const chip = e.target.closest('#compra-proveedores .chip-opt');
  if (chip) selectProveedor(chip.dataset.prov);
});

// ---------- Pago (segmentado) ----------
function setCompraPagado(v) {
  CompraForm.pagado = !!v;
  document.querySelectorAll('#compra-pago-seg .seg-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.pago === 'si') === CompraForm.pagado);
  });
}

// ---------- Monto (preview formateado) ----------
function updateMontoPreview() {
  const el = document.getElementById('compra-monto-preview');
  if (!el) return;
  const v = parseFloat(document.getElementById('compra-monto').value);
  el.textContent = (v > 0) ? comprasFmtMoneda(v) : '';
}

// ---------- Guardar ----------
async function saveCompra() {
  const otro = (document.getElementById('compra-otro').value || '').trim();
  const proveedor = otro || CompraForm.proveedor;
  if (!proveedor) { showToast('Elegí o escribí un proveedor'); return; }

  const monto = parseFloat(document.getElementById('compra-monto').value) || 0;
  if (!monto || monto <= 0) { showToast('Ingresá el monto total'); return; }

  const data = {
    proveedor,
    fecha: document.getElementById('compra-fecha').value || hoyISO(),
    nro_factura: (document.getElementById('compra-nro').value || '').trim() || null,
    monto,
    pagado: CompraForm.pagado,
    foto: CompraForm.foto || null,
  };

  const btn = document.getElementById('compra-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  try {
    if (CompraForm.editId) {
      const { error } = await apiUpdateCompra(CompraForm.editId, data);
      if (error) throw error;
      await loadCompras();
      showToast('Factura actualizada ✓');
      closeCompra();
    } else {
      const { error } = await apiInsertCompra(data);
      if (error) throw error;
      await loadCompras();
      showSuccess(data);
    }
  } catch (e) {
    console.error(e);
    showToast('Error al guardar: ' + (e.message || 'revisá la conexión'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✓ Registrar factura'; }
  }
}

// ---------- Pantalla de éxito ----------
function showSuccess(c) {
  document.getElementById('compra-success-prov').textContent = c.proveedor;
  document.getElementById('compra-success-detalle').innerHTML = `
    <div class="success-row"><span>Fecha</span><b>${comprasFmtFecha(c.fecha)}</b></div>
    <div class="success-row"><span>N° Factura</span><b>${escapeHtml(c.nro_factura) || '—'}</b></div>
    <div class="success-row"><span>Monto total</span><b class="rose">${comprasFmtMoneda(c.monto)}</b></div>
    <div class="success-row"><span>Pago</span><b class="${c.pagado ? 'green' : 'yellow'}">${c.pagado ? 'Pagado' : 'No pagado'}</b></div>
  `;
  compraStep(3);
}
function compraOtra() { openCompra(); }
function finishCompra() { closeCompra(); }

// ---------- Acciones de fila ----------
async function toggleCompraPagado(id) {
  const c = (window.AppState.compras || []).find(x => x.id === id);
  if (!c) return;
  const nuevo = !c.pagado;
  c.pagado = nuevo; // optimista
  renderCompras();
  const { error } = await apiUpdateCompra(id, { pagado: nuevo });
  if (error) {
    c.pagado = !nuevo;
    renderCompras();
    showToast('Error al actualizar el pago');
  } else {
    showToast(nuevo ? 'Marcada como pagada ✓' : 'Marcada como impaga');
  }
}
async function deleteCompra(id) {
  const c = (window.AppState.compras || []).find(x => x.id === id);
  if (!c) return;
  if (!confirm(`¿Eliminar la factura de ${c.proveedor} (${comprasFmtMoneda(c.monto)})? Esta acción no se puede deshacer.`)) return;
  const { error } = await apiDeleteCompra(id);
  if (error) { showToast('Error al eliminar'); return; }
  window.AppState.compras = window.AppState.compras.filter(x => x.id !== id);
  renderCompras();
  showToast('Factura eliminada');
}

// ---------- Enganche de navegación ----------
document.querySelectorAll('.nav-item[data-view="compras"]').forEach(btn => {
  btn.addEventListener('click', () => renderCompras());
});
