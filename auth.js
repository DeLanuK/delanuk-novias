async function initAuth() {
  // Escuchamos los cambios de sesion SIEMPRE, pase lo que pase con el hash.
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showResetScreen();
      return;
    }
    if (event === 'SIGNED_IN' && session) {
      // Si esta eligiendo su nueva contrasena, no la metemos al app todavia.
      if (enPantallaDeReset()) return;
      await showApp(session);
      return;
    }
    if (event === 'SIGNED_OUT') {
      if (window.AppState.realtimeChannel) {
        sb.removeChannel(window.AppState.realtimeChannel);
        window.AppState.realtimeChannel = null;
      }
      showLogin();
    }
  });

  // Si venimos del link de recuperacion del mail, mostramos la pantalla de nueva contrasena.
  if (detectRecoveryFromHash()) {
    showResetScreen();
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session) await showApp(session);
  else showLogin();
}

function enPantallaDeReset() {
  const r = document.getElementById('reset-screen');
  return !!r && !r.classList.contains('hidden');
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

    // Auto-archivar novias entregadas con fecha de evento ya pasada
    await autoArchivarEntregadas(window.AppState.novias);

    renderDash();
    if (document.getElementById('view-novias').classList.contains('active')) renderNovias();
    if (document.getElementById('view-pagos').classList.contains('active')) renderPagos();
    resolveHashRoute();
  } catch (e) {
    console.error('Error cargando novias:', e);
    showToast('Error cargando datos');
  }
}
// ============ MENSAJES DE ERROR EN CASTELLANO ============
// Supabase devuelve el motivo real; antes lo tapabamos con un mensaje generico
// y era imposible saber que estaba pasando.
function mensajeDeError(error) {
  if (!error) return '';
  const code = (error.code || '').toLowerCase();
  const msg = (error.message || '').toLowerCase();
  console.error('[auth]', error.status, error.code, error.message);

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
    return 'Email o contrasena incorrectos. Revisa que el email sea exactamente el que figura en el panel.';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return 'Ese usuario todavia no confirmo su email. Hay que confirmarlo desde Supabase.';
  if (code === 'user_not_found' || msg.includes('user not found'))
    return 'No existe ninguna cuenta con ese email.';
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit'))
    return 'Se enviaron demasiados mails en poco tiempo. Espera una hora y volve a intentar.';
  if (code === 'over_request_rate_limit' || error.status === 429)
    return 'Demasiados intentos seguidos. Espera unos minutos y volve a probar.';
  if (code === 'same_password' || msg.includes('should be different'))
    return 'La contrasena nueva tiene que ser distinta a la anterior.';
  if (code === 'weak_password' || msg.includes('password should be'))
    return 'La contrasena es muy debil. Usa al menos 6 caracteres.';
  if (code === 'signup_disabled' || msg.includes('signups not allowed'))
    return 'El registro esta deshabilitado. Los usuarios se crean desde Supabase.';
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return 'No se pudo conectar con el servidor. Revisa tu conexion a internet.';
  if (msg.includes('error sending'))
    return 'El servidor no pudo enviar el mail. Hay que configurar un SMTP propio en Supabase.';

  return 'Error: ' + (error.message || 'no se pudo completar la operacion') +
         (error.code ? ' (' + error.code + ')' : '');
}

// ============ RECOVERY / RESET PASSWORD ============

function detectRecoveryFromHash() {
  const hash = window.location.hash || '';
  // OJO: solo el link de recuperacion. Antes tambien entraba con 'access_token='
  // a secas, y eso dejaba a la usuaria trabada en la pantalla de reset.
  return hash.includes('type=recovery');
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
        msg.textContent = mensajeDeError(error);
      } else {
        msg.style.color = '#0a7';
        msg.textContent = '✅ Si ese email tiene cuenta, te llega el link en unos minutos. Revisá también spam.';
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
        msg.textContent = mensajeDeError(error);
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
