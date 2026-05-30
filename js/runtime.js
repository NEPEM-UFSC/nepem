(() => {
  const hostname = window.location.hostname;
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.test');
  const isDev = isLocalHost;
  const isAdminPath =
    window.location.pathname.endsWith('/admin.html') || window.location.pathname === '/admin';

  document.documentElement.classList.toggle('nepem-dev', isDev);
  document.documentElement.classList.toggle('nepem-prod', !isDev);

  if (!isDev && isAdminPath) {
    window.location.replace('404.html');
  }

  window.NEPEM_ENV = { isDev };
})();
