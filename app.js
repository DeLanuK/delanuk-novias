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