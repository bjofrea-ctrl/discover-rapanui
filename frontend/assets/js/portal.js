(function() {
  const PASSWORD = 'RAPANUI2025';
  const loginScreen = document.getElementById('loginScreen');
  const portalContent = document.getElementById('portalContent');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  function checkAuth() {
    const session = sessionStorage.getItem('discover_portal_auth');
    if (session === 'true') {
      loginScreen.classList.add('hidden');
      portalContent.classList.add('active');
      if (logoutBtn) logoutBtn.style.display = 'block';
      return true;
    }
    return false;
  }

  function login() {
    const value = passwordInput.value.trim();
    if (value.toUpperCase() === PASSWORD) {
      sessionStorage.setItem('discover_portal_auth', 'true');
      loginScreen.classList.add('hidden');
      portalContent.classList.add('active');
      if (logoutBtn) logoutBtn.style.display = 'block';
      loginError.style.display = 'none';
      passwordInput.value = '';
    } else {
      loginError.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  }

  function logout() {
    sessionStorage.removeItem('discover_portal_auth');
    loginScreen.classList.remove('hidden');
    portalContent.classList.remove('active');
    if (logoutBtn) logoutBtn.style.display = 'none';
    passwordInput.value = '';
    loginError.style.display = 'none';
  }

  if (checkAuth()) return;

  loginBtn.addEventListener('click', login);
  passwordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
  passwordInput.focus();

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
})();
