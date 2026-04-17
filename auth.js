async function initAuth() {
  // Si venimos de un link de recuperación del mail, mostramos la pantalla de nueva contraseña
  if (detectRecoveryFromHash()) {
    showResetScreen();
    // escuchamos los eventos igual por si cambia el estado
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') showResetScreen();
    });
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session) await showApp(session);
  else showLogin();

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showResetScreen();
    } else if (event === 'SIGNED_IN' && session) {
      // Si el usuario está en la pantalla de reset, NO lo metemos al app
      const resetScreen = document.getElementById('reset-screen');
      if (resetScreen && !resetScreen.classList.contains('hidden')) return;
      await showApp(session);
    } else if (event === 'SIGNED_OUT') {
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
// ============ RECOVERY / RESET PASSWORD ============

function detectRecoveryFromHash() {
  const hash = window.location.hash || '';
  return hash.includes('type=recovery') || hash.includes('access_token=');
}

function showForgotScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('reset-screen').classList.add('hidden');
  document.getElementById('forgot-screen').classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
  document.getElementById('forgot-msg').textContent = '';
  document.getElementById('forgot-email').value = '';
}

function showResetScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('forgot-screen').classList.add('hidden');
  document.getElementById('reset-screen').classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
  document.getElementById('reset-msg').textContent = '';
}

function backToLogin() {
  document.getElementById('forgot-screen').classList.add('hidden');
  document.getElementById('reset-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

async function sendRecoveryEmail(email) {
  const redirectTo = 'https://delanuk.github.io/delanuk-novias/';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  return error;
}

async function updatePassword(newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return error;
}

// Cablear eventos del DOM
document.addEventListener('DOMContentLoaded', () => {
  const forgotLink = document.getElementById('forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showForgotScreen();
    });
  }

  const back = document.getElementById('forgot-back');
  if (back) {
    back.addEventListener('click', (e) => {
      e.preventDefault();
      backToLogin();
    });
  }

  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      const msg = document.getElementById('forgot-msg');
      msg.style.color = '';
      msg.textContent = 'Enviando...';
      const error = await sendRecoveryEmail(email);
      if (error) {
        msg.style.color = '#c00';
        msg.textContent = 'Error: ' + error.message;
      } else {
        msg.style.color = '#0a7';
        msg.textContent = '✅ Te enviamos un mail con el link para restablecer tu contraseña. Revisá también spam.';
      }
    });
  }

  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('reset-password').value;
      const p2 = document.getElementById('reset-password2').value;
      const msg = document.getElementById('reset-msg');
      msg.style.color = '';
      if (p1 !== p2) {
        msg.style.color = '#c00';
        msg.textContent = 'Las contraseñas no coinciden.';
        return;
      }
      if (p1.length < 6) {
        msg.style.color = '#c00';
        msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        return;
      }
      msg.textContent = 'Guardando...';
      const error = await updatePassword(p1);
      if (error) {
        msg.style.color = '#c00';
        msg.textContent = 'Error: ' + error.message;
      } else {
        msg.style.color = '#0a7';
        msg.textContent = '✅ Contraseña actualizada. Redirigiendo al login...';
        setTimeout(async () => {
          await sb.auth.signOut();
          // Limpiar el hash de la URL
          history.replaceState(null, '', location.pathname + location.search);
          backToLogin();
        }, 1500);
      }
    });
  }
});