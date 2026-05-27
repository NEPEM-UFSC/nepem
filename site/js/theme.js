/**
 * NEPEM/UFSC — Theme Switching Module
 * Supports: light, dark, auto
 */
const ThemeManager = (() => {
  let currentTheme = 'light';

  function init() {
    const saved = localStorage.getItem('nepem-theme');
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      currentTheme = saved;
    } else {
      currentTheme = 'auto';
    }
    applyTheme();
    updateIcon();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentTheme === 'auto') applyTheme();
    });
  }

  function toggle() {
    const themes = ['light', 'dark', 'auto'];
    const idx = themes.indexOf(currentTheme);
    currentTheme = themes[(idx + 1) % themes.length];
    localStorage.setItem('nepem-theme', currentTheme);
    applyTheme();
    updateIcon();
  }

  function applyTheme() {
    let effectiveTheme = currentTheme;
    if (currentTheme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    // Update Bootstrap's color mode attribute
    document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
  }

  function updateIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const icons = { light: 'bi-sun-fill', dark: 'bi-moon-stars-fill', auto: 'bi-circle-half' };
    btn.innerHTML = `<i class="bi ${icons[currentTheme]}"></i>`;
    btn.title = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
  }

  return { init, toggle };
})();
