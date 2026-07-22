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
  'Primer contacto respondido','Presentacion enviada','Reunion de descubrimiento',
  'Bocetos enviados','Diseno aprobado','Sena abonada','Produccion iniciada',
  'Update semana 1','Update semana 2','Prueba final realizada','Ajustes aplicados',
  'Saldo cobrado','Packaging preparado','Entrega realizada',
];
function mkCheck(doneTo) {
  return ETAPAS.map((label, i) => ({ label, done: i < doneTo }));
}

// ===== OPERACIONES SOBRE NOVIAS =====
async function apiLoadNovias({ includeArchived = false } = {}) {
  let q = sb.from('novias').select('*').order('id');
  if (!includeArchived) q = q.eq('archivada', false);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(n => ({
    ...n,
    archivada: !!n.archivada,
    checklist: Array.isArray(n.checklist) && n.checklist.length ? n.checklist : mkCheck(0),
    pagos: Array.isArray(n.pagos) ? n.pagos : [],
  }));
}
async function apiInsertNovia(data)     { return sb.from('novias').insert(data); }
async function apiUpdateNovia(id, data) { return sb.from('novias').update(data).eq('id', id); }
async function apiDeleteNovia(id)       { return sb.from('novias').delete().eq('id', id); }
async function apiSetArchivada(id, archivada) {
  return sb.from('novias').update({ archivada }).eq('id', id);
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