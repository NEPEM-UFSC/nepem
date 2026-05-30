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
    document.querySelectorAll('[data-i18n]').forEach((el) => {
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
    const flags = {
      pt: 'https://flagcdn.com/w40/br.png',
      en: 'https://flagcdn.com/w40/us.png',
      es: 'https://flagcdn.com/w40/es.png',
    };
    const btn = document.getElementById('langToggle');
    if (btn) {
      btn.innerHTML = `<img src="${flags[currentLang]}" alt="${currentLang}" style="width: 18px; height: auto; border-radius: 2px; vertical-align: middle; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">`;
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
