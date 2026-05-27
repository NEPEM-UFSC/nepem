/**
 * NEPEM/UFSC — Internationalization Module
 * Supports: pt (default), en, es
 */
const I18n = (() => {
  let translations = {};
  let currentLang = 'pt';

  async function init() {
    const saved = localStorage.getItem('nepem-lang');
    if (saved && ['pt', 'en', 'es'].includes(saved)) {
      currentLang = saved;
    }
    try {
      const res = await fetch('data/translations.json');
      translations = await res.json();
    } catch (e) {
      console.error('Failed to load translations:', e);
    }
    updateUI();
    updateLangSelector();
  }

  function setLang(lang) {
    if (!['pt', 'en', 'es'].includes(lang)) return;
    currentLang = lang;
    localStorage.setItem('nepem-lang', lang);
    updateUI();
    updateLangSelector();
    // Dispatch event for other modules
    document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
  }

  function t(key) {
    return translations[currentLang]?.[key] || translations['pt']?.[key] || key;
  }

  function getLang() {
    return currentLang;
  }

  function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
    document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : currentLang;
  }

  function updateLangSelector() {
    const flags = { pt: '🇧🇷', en: '🇺🇸', es: '🇪🇸' };
    const btn = document.getElementById('langToggle');
    if (btn) {
      btn.textContent = flags[currentLang] || '🇧🇷';
      btn.title = currentLang.toUpperCase();
    }
  }

  function cycleLang() {
    const langs = ['pt', 'en', 'es'];
    const idx = langs.indexOf(currentLang);
    setLang(langs[(idx + 1) % langs.length]);
  }

  return { init, setLang, t, getLang, cycleLang };
})();
