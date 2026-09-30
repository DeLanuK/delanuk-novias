// ===== CLIENTE SUPABASE =====
const sb = supabase.createClient(
  window.DELANUK_CONFIG.SUPABASE_URL,
  window.DELANUK_CONFIG.SUPABASE_KEY
, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'sb-pecldmaxcqrgjmljpqmx-auth-token', lock: async (name, acquireTimeout, fn) => { return await fn(); } } });

// ===== ESTADO COMPARTIDO =====
window.AppState = {
  novias: [],
  editId: null,
  fichaId: null,
  realtimeChannel: null,
  noviaSort: { col: 'fecha', dir: 1 },
  dashSearch: '',
  showArchived: false,
};

// ===== CONSTANTES DE DOMINIO =====
const ETAPAS = [
  'Mandar presupuesto','Pago la seña','Pieza terminada',
  'Entrega realizada','Pago realizado',
];
// Etapas viejas -> etapa nueva equivalente (para migrar checklists ya cargados)
const ETAPAS_LEGACY = {
  'Mandar presupuesto': 'Mandar presupuesto',
  'Confirmo presupuesto': 'Mandar presupuesto',
  'Pago la seña': 'Pago la seña',
  'Pieza terminada': 'Pieza terminada',
  'Entrega realizada': 'Entrega realizada',
  'Saldo cobrado': 'Pago realizado',
};
function mkCheck(doneTo) {
  return ETAPAS.map((label, i) => ({ label, done: i < doneTo }));
}
// Lleva cualquier checklist (viejo o nuevo) al formato de 5 etapas
function normalizeChecklist(list) {
  const old = Array.isArray(list) ? list : [];
  return ETAPAS.map(label => {
    const matches = old.filter(c => c && (c.label === label || ETAPAS_LEGACY[c.label] === label));
    const done = matches.some(c => c.done);
    const fechaDone = done ? (matches.filter(c => c.done && c.fechaDone).map(c => c.fechaDone).sort().pop() || null) : null;
    return { label, done, fechaDone };
  });
}
function checkDone(n, label) {
  return !!(n.checklist || []).find(c => c.label === label && c.done);
}
// Saldo real: presupuesto - cobrado (pagos) - seña de la cita
function saldoDe(n) {
  return (n.total || 0) - (n.sena || 0) - (n.sena_cita || 0);
}
function cobradoDe(n) {
  return (n.sena || 0) + (n.sena_cita || 0);
}
// Entregada = entrega realizada y pago realizado (o estado Entregado)
function isEntregada(n) {
  return n.estado === 'Entregado' || (checkDone(n, 'Entrega realizada') && checkDone(n, 'Pago realizado'));
}

// ===== TIMEOUT + REINTENTO =====
// Si una llamada a Supabase se cuelga (token vencido, red dormida en el celu),
// cortamos a los 12 s, refrescamos la sesión y probamos una vez más.
const API_TIMEOUT_MS = 12000;
function withTimeout(promiseLike, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promiseLike).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
async function sbCall(makeQuery) {
  try {
    return await withTimeout(makeQuery(), API_TIMEOUT_MS);
  } catch (e) {
    console.warn('Llamada lenta o cortada, reintentando:', e && e.message);
    try { await withTimeout(sb.auth.refreshSession(), 6000); } catch (_) {}
    return await withTimeout(makeQuery(), API_TIMEOUT_MS);
  }
}

// ===== OPERACIONES SOBRE NOVIAS =====
async function apiLoadNovias({ includeArchived = false } = {}) {
  const { data, error } = await sbCall(() => {
    let q = sb.from('novias').select('*').order('id');
    if (!includeArchived) q = q.eq('archivada', false);
    return q;
  });
  if (error) throw error;
  return data.map(n => ({
    ...n,
    archivada: !!n.archivada,
    checklist: normalizeChecklist(n.checklist),
    pagos: Array.isArray(n.pagos) ? n.pagos : [],
    sena_cita: Number(n.sena_cita) || 0,
    trabajo: n.trabajo || '',
  }));
}
async function apiInsertNovia(data)     { return sbCall(() => sb.from('novias').insert(data).select().single()); }
async function apiUpdateNovia(id, data) { return sbCall(() => sb.from('novias').update(data).eq('id', id)); }
async function apiDeleteNovia(id)       { return sbCall(() => sb.from('novias').delete().eq('id', id)); }
async function apiSetArchivada(id, archivada) {
  return sbCall(() => sb.from('novias').update({ archivada }).eq('id', id));
}

function apiSubscribeRealtime(onChange) {
  if (window.AppState.realtimeChannel) sb.removeChannel(window.AppState.realtimeChannel);
  window.AppState.realtimeChannel = sb.channel('novias-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'novias' }, onChange)
    .subscribe();
}

// ===== OPERACIONES SOBRE COMPRAS (facturas de proveedores) =====
async function apiLoadCompras() {
  const { data, error } = await sb.from('compras')
    .select('*')
    .order('fecha', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;
  return (data || []).map(c => ({
    ...c,
    pagado: !!c.pagado,
    monto: Number(c.monto) || 0,
    items: Array.isArray(c.items) ? c.items : [],
  }));
}
async function apiInsertCompra(data)     { return sb.from('compras').insert(data); }
async function apiUpdateCompra(id, data) { return sb.from('compras').update(data).eq('id', id); }
async function apiDeleteCompra(id)       { return sb.from('compras').delete().eq('id', id); }
