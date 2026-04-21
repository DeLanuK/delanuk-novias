// ===== EVENTOS DE LOGIN =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit');
  const err = document.getElementById('login-error');
  err.textContent = '';
  btn.textContent = 'Ingresando...'; btn.disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Ingresar';
  if (error) err.textContent = 'Email o contrasena incorrectos';
});

['btn-logout', 'btn-logout-mobile'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', async () => {
    if (!confirm('Cerrar sesion?')) return;
    await sb.auth.signOut();
  });
});

// ===== NAVEGACIÓN ENTRE VISTAS =====
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

// ===== BOTONES DE "AGREGAR NOVIA" =====
['btn-add-dash', 'btn-add-novias', 'btn-add-side'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => openModal('add'));
});

// ===== CIERRE DE OVERLAYS AL HACER CLIC AFUERA =====
document.querySelectorAll('.overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// ===== DEEP-LINK: REACCIONAR A CAMBIOS DE URL =====
window.addEventListener('hashchange', resolveHashRoute);
window.addEventListener('popstate', resolveHashRoute);

// ===== ARRANQUE =====
initAuth();
// ===== ENVÍO =====

// Abrir modal de envío (crea registro vacío en memoria si no existe)
function openEnvio(id) {
  const n = (window.AppState?.novias || []).find(x => x.id === id);
  if (!n) return;

  const e = n.envio || {};
  const dest = e.destinatario || {};
  const dir  = e.direccion || {};
  const pq   = e.paquete || {};
  const co   = e.correo || {};

  document.getElementById('env-novia-id').value = n.id;

  // Destinataria
  document.getElementById('env-dest-nombre').value = dest.nombre || '';
  document.getElementById('env-dest-tel').value    = dest.tel    || '';
  document.getElementById('env-dest-email').value  = dest.email  || '';
  document.getElementById('env-dest-dni').value    = dest.dni    || '';

  // Dirección
  document.getElementById('env-dir-calle').value      = dir.calle      || '';
  document.getElementById('env-dir-numero').value     = dir.numero     || '';
  document.getElementById('env-dir-piso').value       = dir.piso       || '';
  document.getElementById('env-dir-depto').value      = dir.depto      || '';
  document.getElementById('env-dir-ciudad').value     = dir.ciudad     || '';
  document.getElementById('env-dir-provincia').value  = dir.provincia  || '';
  document.getElementById('env-dir-cp').value         = dir.cp         || '';
  document.getElementById('env-dir-referencia').value = dir.referencia || '';

  // Paquete
  document.getElementById('env-pq-desc').value   = pq.descripcion     || '';
  document.getElementById('env-pq-peso').value   = pq.peso_kg         || '';
  document.getElementById('env-pq-dim').value    = pq.dimensiones     || '';
  document.getElementById('env-pq-valor').value  = pq.valor_declarado || '';
  document.getElementById('env-pq-fragil').checked = pq.contenido_fragil === true;

  // Correo
  document.getElementById('env-co-empresa').value       = co.empresa                  || '';
  document.getElementById('env-co-servicio').value      = co.servicio                 || '';
  document.getElementById('env-co-horario').value       = co.horario_entrega          || '';
  document.getElementById('env-co-instrucciones').value = co.instrucciones_especiales || '';

  // Estado y seguimiento
  document.getElementById('env-estado').value         = e.estado                || 'pendiente';
  document.getElementById('env-tracking').value       = e.tracking              || '';
  document.getElementById('env-fecha-despacho').value = e.fecha_despacho        || '';
  document.getElementById('env-fecha-entrega').value  = e.fecha_entrega_estimada|| '';
  document.getElementById('env-notas').value          = e.notas                 || '';

  document.getElementById('overlay-envio').classList.add('open');
}

// Helper: leer input y devolver null si está vacío (para no guardar "" en la BD)
function _envVal(idInput) {
  const el = document.getElementById(idInput);
  if (!el) return null;
  const v = (el.value || '').trim();
  return v === '' ? null : v;
}
function _envNum(idInput) {
  const v = _envVal(idInput);
  if (v === null) return null;
  const num = Number(v);
  return isNaN(num) ? null : num;
}

// Guardar envío
async function saveEnvio() {
  const id = Number(document.getElementById('env-novia-id').value);
  if (!id) { showToast('ID de novia no válido'); return; }
  const n = (window.AppState?.novias || []).find(x => x.id === id);
  if (!n) { showToast('Novia no encontrada'); return; }

  const btn = document.getElementById('btn-save-envio');
  const txtOrig = btn ? btn.textContent : 'Guardar';
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const envio = {
    destinatario: {
      nombre: _envVal('env-dest-nombre'),
      tel:    _envVal('env-dest-tel'),
      email:  _envVal('env-dest-email'),
      dni:    _envVal('env-dest-dni'),
    },
    direccion: {
      calle:      _envVal('env-dir-calle'),
      numero:     _envVal('env-dir-numero'),
      piso:       _envVal('env-dir-piso'),
      depto:      _envVal('env-dir-depto'),
      ciudad:     _envVal('env-dir-ciudad'),
      provincia:  _envVal('env-dir-provincia'),
      cp:         _envVal('env-dir-cp'),
      referencia: _envVal('env-dir-referencia'),
    },
    paquete: {
      descripcion:      _envVal('env-pq-desc'),
      peso_kg:          _envNum('env-pq-peso'),
      dimensiones:      _envVal('env-pq-dim'),
      valor_declarado:  _envNum('env-pq-valor'),
      contenido_fragil: document.getElementById('env-pq-fragil').checked === true,
    },
    correo: {
      empresa:                  _envVal('env-co-empresa'),
      servicio:                 _envVal('env-co-servicio'),
      horario_entrega:          _envVal('env-co-horario'),
      instrucciones_especiales: _envVal('env-co-instrucciones'),
    },
    estado:                 _envVal('env-estado') || 'pendiente',
    tracking:               _envVal('env-tracking'),
    fecha_despacho:         _envVal('env-fecha-despacho'),
    fecha_entrega_estimada: _envVal('env-fecha-entrega'),
    notas:                  _envVal('env-notas'),
  };

  try {
    const { error } = await apiUpdateNovia(id, { envio });
    if (error) throw error;
    // Reflejar en memoria local
    n.envio = envio;
    showToast('Envío guardado ✓');
    closeModal('envio');
    // Refrescar UI
    if (typeof renderEnvio === 'function') renderEnvio();
    if (typeof renderEnvioFicha === 'function' && window.AppState?.fichaId === id) {
      renderEnvioFicha(n);
    }
  } catch (err) {
    console.error(err);
    showToast('Error al guardar envío');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = txtOrig; }
  }
}

// Enganche: cuando se cambia a la vista Envío, renderizarla
document.querySelectorAll('.nav-item[data-view="envio"]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (typeof renderEnvio === 'function') renderEnvio();
  });
});

// Enganche: inyectar sección Envío dentro de la ficha cada vez que se abre
(function patchOpenFichaForEnvio() {
  if (typeof window.openFicha !== 'function') return;
  const _openFichaOriginal = window.openFicha;
  window.openFicha = function(id, opts) {
    const ret = _openFichaOriginal.apply(this, arguments);
    try {
      const n = (window.AppState?.novias || []).find(x => x.id === id);
      if (n && typeof renderEnvioFicha === 'function') renderEnvioFicha(n);
    } catch (e) { console.error(e); }
    return ret;
  };
})();
