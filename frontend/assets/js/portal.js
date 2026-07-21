// Discover Rapa Nui — guard de sesión del portal de clientes.
// Reemplaza la antigua password hardcodeada por autenticación real
// (Supabase Auth, magic link). El renderizado de datos vive en portal-data.js.
import { supabase } from './supabaseClient.js';

(function () {
  const loginScreen = document.getElementById('loginScreen');
  const portalContent = document.getElementById('portalContent');
  const emailInput = document.getElementById('emailInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const loginSuccess = document.getElementById('loginSuccess');
  const logoutBtn = document.getElementById('logoutBtn');

  function showPortal() {
    loginScreen.classList.add('hidden');
    portalContent.classList.add('active');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  }

  function showLogin() {
    loginScreen.classList.remove('hidden');
    portalContent.classList.remove('active');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }

  async function sendMagicLink() {
    const email = emailInput.value.trim();
    loginError.style.display = 'none';
    loginSuccess.style.display = 'none';

    if (!email) {
      loginError.textContent = 'Ingresa tu email para continuar.';
      loginError.style.display = 'block';
      return;
    }

    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Enviando...';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });

    loginBtn.disabled = false;
    loginBtn.textContent = originalText;

    if (error) {
      console.error('signInWithOtp failed', error);
      loginError.textContent = 'No pudimos enviar el enlace. Verifica tu email e intenta nuevamente.';
      loginError.style.display = 'block';
      return;
    }

    loginSuccess.style.display = 'block';
    emailInput.value = '';
  }

  async function logout() {
    await supabase.auth.signOut();
    showLogin();
  }

  loginBtn.addEventListener('click', sendMagicLink);
  emailInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMagicLink();
  });
  emailInput.focus();
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Cambios de sesión futuros (login en otra pestaña, expiración, logout, etc.)
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) showPortal();
    else showLogin();
  });

  // Estado inicial al cargar la página.
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) showPortal();
    else showLogin();
  })();
})();
