async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await showApp(session);
  else showLogin();

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) await showApp(session);
    else if (event === 'SIGNED_OUT') {
      if (window.AppState.realtimeChannel) {
        sb.removeChannel(window.AppState.realtimeChannel);
        window.AppState.realtimeChannel = null;
      }
      showLogin();
    }
  });
}

function showLogin() {
  // 🔖 Si llegó con un link tipo #/novia/42, lo guardamos
  // para llevarla ahí después de que se loguee.
  if (location.hash.startsWith('#/novia/')) {
    sessionStorage.setItem('pendingHash', location.hash);
  }
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
}

async function showApp(session) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').style.display = 'flex';
  document.getElementById('user-email').textContent = session.user.email;
  window.AppState.userEmail = session.user.email;
window.AppState.isAdmin = (window.DELANUK_CONFIG.ADMIN_EMAILS || [])
  .map(e => e.toLowerCase())
  .includes((session.user.email || '').toLowerCase());
document.body.classList.toggle('is-admin', window.AppState.isAdmin);
document.body.classList.toggle('is-staff', !window.AppState.isAdmin);

  // 🎯 Si había un destino pendiente (link compartido antes del login),
  // lo restauramos en la URL antes de cargar los datos.
  const pending = sessionStorage.getItem('pendingHash');
  if (pending) {
    sessionStorage.removeItem('pendingHash');
    history.replaceState(null, '', location.pathname + location.search + pending);
  }

  await loadNovias();
  apiSubscribeRealtime(() => loadNovias());
}

async function loadNovias() {
  try {
    window.AppState.novias = await apiLoadNovias({ includeArchived: window.AppState.showArchived });
    window._novias = window.AppState.novias; // compatibilidad con exportCSV
    renderDash();
    if (document.getElementById('view-novias').classList.contains('active')) renderNovias();
    if (document.getElementById('view-pagos').classList.contains('active')) renderPagos();
    resolveHashRoute();
  } catch (e) {
    console.error('Error cargando novias:', e);
    showToast('Error cargando datos');
  }
}