/**
 * NEPEM/UFSC — Main Application Module
 * Handles navigation, animations, and initialization
 */
const App = (() => {
  function init() {
    setupNavbarScroll();
    setupSmoothScroll();
    setupScrollAnimations();
    setupHeroParticles();
    setupActiveNavTracking();
    setupProjectsFilter();
    loadProjects();
  }

  /* --- Navbar shrink on scroll --- */
  function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar-nepem');
    if (!navbar) return;
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Smooth scrolling for anchor links --- */
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        // Close mobile navbar
        const navCollapse = document.getElementById('navbarContent');
        if (navCollapse?.classList.contains('show')) {
          bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
        }
      });
    });
  }

  /* --- IntersectionObserver for fade-in animations --- */
  function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right').forEach(el => {
      observer.observe(el);
    });
  }

  /* --- Hero floating particles --- */
  function setupHeroParticles() {
    const container = document.querySelector('.hero-particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'hero-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.width = (Math.random() * 4 + 2) + 'px';
      particle.style.height = particle.style.width;
      particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
      particle.style.animationDelay = (Math.random() * 10) + 's';
      particle.style.opacity = Math.random() * 0.5 + 0.1;
      container.appendChild(particle);
    }
  }

  /* --- Active nav link tracking on scroll --- */
  function setupActiveNavTracking() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nepem .nav-link[href^="#"]');

    if (sections.length === 0 || navLinks.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(section => observer.observe(section));
  }

  /* --- Projects --- */
  let projects = [];
  let githubRepos = [];
  let projectFilter = 'all';

  async function loadProjects() {
    let loadedProjects = [];

    try {
      const res = await fetch('data/projects.json?t=' + Date.now());
      if (res.ok) {
        loadedProjects = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch data/projects.json:', e);
    }

    try {
      const localStr = localStorage.getItem('nepem-projects');
      if (localStr) {
        const local = JSON.parse(localStr);
        if (Array.isArray(local) && local.length > 0) {
          if (loadedProjects.length === 0) {
            loadedProjects = local;
          } else {
            const existingIds = new Set(loadedProjects.map(p => p.id));
            local.forEach(p => {
              if (p.id && !existingIds.has(p.id)) loadedProjects.push(p);
            });
          }
        }
      }
    } catch (err) {}

    projects = Array.isArray(loadedProjects) ? loadedProjects : [];

    // Dynamic loading of GitHub Repositories from fallback-data.json
    try {
      const fallbackResp = await fetch('data/fallback-data.json?t=' + Date.now());
      if (fallbackResp.ok) {
        const fallbackData = await fallbackResp.json();
        if (fallbackData && fallbackData.githubRepos) {
          githubRepos = fallbackData.githubRepos;

          // Inject a dynamic "Repositórios GitHub" button into filters
          const filters = document.getElementById('projectFilters');
          if (filters && !document.getElementById('btnFilterGithub')) {
            const btn = document.createElement('button');
            btn.className = 'btn-filter';
            btn.id = 'btnFilterGithub';
            btn.dataset.filter = 'GitHub';
            btn.setAttribute('onclick', "App.setProjectFilter('GitHub')");
            btn.textContent = 'Repositórios GitHub';
            filters.appendChild(btn);
          }
        }
      }
    } catch (err) {
      // Ignore gracefully if fallback-data.json does not exist yet
    }

    renderProjects();
    
    // Set dynamic 3D badge count
    const badge = document.getElementById('badgeProjectsCount');
    if (badge) {
      badge.textContent = projects.length;
    }

    document.addEventListener('langChanged', () => renderProjects());
  }

  function setupProjectsFilter() {
    // Will be called from HTML onclick
  }

  function setProjectFilter(filter) {
    projectFilter = filter;
    renderProjects();
    document.querySelectorAll('#projectFilters .btn-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  function renderProjects() {
    const container = document.getElementById('projectsGrid');
    if (!container) return;

    // Handle GitHub repositories filter dynamically
    if (projectFilter === 'GitHub') {
      if (githubRepos.length === 0) {
        container.innerHTML = `<div class="col-12 no-results"><i class="bi bi-github"></i><p>Nenhum repositório GitHub carregado.</p></div>`;
        return;
      }

      container.innerHTML = githubRepos.map((repo, i) => {
        const stagger = `stagger-${(i % 6) + 1}`;
        const desc = repo.description !== 'null' && repo.description ? repo.description : 'Sem descrição disponível no momento.';
        const lang = repo.language !== 'null' && repo.language ? repo.language : 'Outro';
        const stars = repo.stargazers_count || 0;
        const forks = repo.forks_count || 0;

        return `
          <div class="col-lg-3 col-md-4 col-sm-6 mb-4 fade-in-up ${stagger}">
            <div class="project-card d-flex flex-column h-100">
              <div class="project-card-image d-flex align-items-center justify-content-center" style="height: 120px; background: rgba(26, 178, 129, 0.04) !important;">
                <i class="bi bi-github text-gradient" style="font-size: 3.5rem;"></i>
              </div>
              <div class="project-card-body d-flex flex-column flex-grow-1">
                <h5 class="fw-bold mb-2 text-truncate">${repo.name}</h5>
                <p class="text-secondary small flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; height: 4.5rem;">${desc}</p>
                
                <div class="d-flex align-items-center gap-3 my-2 text-muted small">
                  <span><i class="bi bi-circle-fill me-1" style="color: var(--nepem-green); font-size: 0.65rem;"></i> ${lang}</span>
                  <span><i class="bi bi-star-fill text-warning me-1"></i> ${stars}</span>
                  <span><i class="bi bi-diagram-2 me-1"></i> ${forks}</span>
                </div>
                
                <div class="project-links mt-auto pt-2 border-top">
                  <a href="${repo.html_url}" target="_blank" style="font-size: 0.85rem;"><i class="bi bi-github me-1"></i>Ver no GitHub</a>
                  ${repo.homepage !== 'null' && repo.homepage ? `<a href="${repo.homepage}" target="_blank" style="font-size: 0.85rem;"><i class="bi bi-box-arrow-up-right me-1"></i>Site</a>` : ''}
                </div>
              </div>
            </div>
          </div>`;
      }).join('');

      requestAnimationFrame(() => {
        container.querySelectorAll('.fade-in-up').forEach(el => el.classList.add('visible'));
      });
      return;
    }

    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'pt';
    let filtered = projects;
    if (projectFilter !== 'all') {
      filtered = projects.filter(p => p.tipo === projectFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="col-12 no-results"><i class="bi bi-folder-x"></i><p>Nenhum projeto encontrado.</p></div>`;
      return;
    }

    container.innerHTML = filtered.map((p, i) => {
      const desc = typeof p.description === 'object' ? (p.description[lang] || p.description.pt || '') : (p.description || '');
      const stagger = `stagger-${(i % 6) + 1}`;
      const imgSrc = p.image || '';
      const imgHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${p.title}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'bi bi-folder2-open\\' style=\\'font-size:3rem;color:var(--nepem-green)\\'></i>'">`
        : `<i class="bi bi-folder2-open" style="font-size:3rem;color:var(--nepem-green)"></i>`;

      const links = [];
      if (p.url) links.push(`<a href="${p.url}" target="_blank"><i class="bi bi-box-arrow-up-right me-1"></i>Site</a>`);
      if (p.github) links.push(`<a href="${p.github}" target="_blank"><i class="bi bi-github me-1"></i>GitHub</a>`);
      
      // If project_number is an HTTP/S link, add it as a button link
      if (p.project_number && (p.project_number.startsWith('http://') || p.project_number.startsWith('https://'))) {
        links.push(`<a href="${p.project_number}" target="_blank"><i class="bi bi-info-circle me-1"></i>Página Oficial</a>`);
      }

      return `
        <div class="col-lg-3 col-md-4 col-sm-6 mb-4 fade-in-up ${stagger}">
          <div class="project-card">
            <div class="project-card-image">${imgHtml}</div>
            <div class="project-card-body">
              ${p.tipo ? `<div class="small text-nepem fw-bold text-uppercase mb-1" style="font-size: 0.72rem; letter-spacing: 0.5px;"><i class="bi bi-tag-fill me-1"></i>${p.tipo}</div>` : ''}
              <h5>${p.title}</h5>
              
              <!-- If project_number is a simple registration number, display it under title -->
              ${p.project_number && !(p.project_number.startsWith('http://') || p.project_number.startsWith('https://'))
                ? `<div class="small text-muted mb-2" style="font-size: 0.78rem;"><i class="bi bi-hash me-1"></i>Reg: ${p.project_number}</div>`
                : ''
              }
              
              <p>${desc}</p>
              <div class="project-tags">
                ${(p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('')}
              </div>
              ${links.length ? `<div class="project-links">${links.join('')}</div>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    // Animate
    requestAnimationFrame(() => {
      container.querySelectorAll('.fade-in-up').forEach(el => el.classList.add('visible'));
    });
  }

  return { init, setProjectFilter };
})();

/* ========== BLOG MODULE ========== */
const BlogModule = (() => {
  let posts = [];

  async function init() {
    let loadedPosts = [];

    try {
      const res = await fetch('data/posts.json?t=' + Date.now());
      if (res.ok) {
        loadedPosts = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch data/posts.json:', e);
    }

    try {
      const localStr = localStorage.getItem('nepem-posts');
      if (localStr) {
        const local = JSON.parse(localStr);
        if (Array.isArray(local) && local.length > 0) {
          if (loadedPosts.length === 0) {
            loadedPosts = local;
          } else {
            const existingIds = new Set(loadedPosts.map(p => p.id));
            local.forEach(p => {
              if (p.id && !existingIds.has(p.id)) loadedPosts.push(p);
            });
          }
        }
      }
    } catch (err) {}

    posts = Array.isArray(loadedPosts) ? loadedPosts : [];
    renderGrid();
    
    // Set dynamic 3D badge count
    const badge = document.getElementById('badgePostsCount');
    if (badge) {
      badge.textContent = posts.length;
    }
  }

  function getPendingImageData(src) {
    if (!src) return null;
    const filename = src.split('/').pop().split('?')[0];
    try {
      const pending = JSON.parse(localStorage.getItem('nepem-pending-images') || '[]');
      const found = pending.find(img => img.filename === filename || (img.filename && src.endsWith(img.filename)));
      if (found && found.base64) {
        return found.base64.startsWith('data:') ? found.base64 : `data:image/jpeg;base64,${found.base64}`;
      }
    } catch (e) {}
    return null;
  }

  function renderGrid() {
    const container = document.getElementById('blogGrid');
    if (!container) return;

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center text-secondary py-5">
          <i class="bi bi-journal-x fs-1 mb-2"></i>
          <p>Nenhuma postagem no blog ainda.</p>
        </div>`;
      return;
    }

    // Sort posts by date desc
    const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sortedPosts.map((post, i) => {
      const excerpt = post.excerpt || '';
      const date = post.date || '';
      const title = post.title || '';
      const fallbackImg = getPendingImageData(post.banner) || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80';
      const banner = post.banner || fallbackImg;
      const stagger = `stagger-${(i % 6) + 1}`;
      const postUrl = `post.html?id=${post.id}`;

      return `
        <div class="col-md-6 col-lg-4 mb-4 fade-in-up ${stagger} visible">
          <a href="${postUrl}" target="_blank" class="text-decoration-none color-inherit d-block h-100">
            <div class="project-card d-flex flex-column h-100" style="cursor: pointer; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-card);">
              <div class="project-card-image p-0" style="height: 180px; overflow: hidden; background: #e2e8f0; position: relative;">
                <img src="${banner}" 
                     alt="${title.replace(/"/g, '&quot;')}" 
                     style="width: 100%; height: 100%; object-fit: cover; max-width: none;"
                     onerror="const f = App.getPendingImageData('${post.banner}'); if(f) { this.src = f; this.onerror = null; }">
                <div class="position-absolute bottom-0 start-0 m-3 px-2 py-1 bg-dark text-white rounded text-xs fw-semibold small" style="opacity: 0.85; z-index: 10;">
                  ${date}
                </div>
              </div>
              <div class="project-card-body p-3 d-flex flex-column flex-grow-1">
                <h5 class="fw-bold mb-2 text-truncate-2" style="font-size: 1.1rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 3.1rem; color: var(--text-primary);">${title}</h5>
                <p class="text-secondary small mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6; height: 4.8rem;">${excerpt}</p>
                <div class="text-gradient fw-semibold small mt-auto d-flex align-items-center justify-content-between">
                  <span>Ler post completo <i class="bi bi-arrow-right ms-1"></i></span>
                  <i class="bi bi-box-arrow-up-right text-secondary small" title="Abre em nova página com link próprio"></i>
                </div>
              </div>
            </div>
          </a>
        </div>`;
    }).join('');
  }

  function openPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const modalBody = document.getElementById('blogModalBody');
    if (!modalBody) return;

    const date = post.date || '';
    const title = post.title || '';
    const banner = post.banner || '';
    const content = post.content || '';
    const postUrl = `post.html?id=${post.id}`;

    let bannerHtml = '';
    if (banner) {
      bannerHtml = `
        <div class="mb-4 rounded overflow-hidden" style="max-height: 350px; width: 100%;">
          <img src="${banner}" 
               alt="${title.replace(/"/g, '&quot;')}" 
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="const f = App.getPendingImageData('${banner}'); if(f) { this.src = f; this.onerror = null; }">
        </div>`;
    }

    let attachmentsHtml = '';
    let attachments = Array.isArray(post.attachments) ? [...post.attachments] : [];
    
    // Auto-extract from content if empty or merge any file links from markdown
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const label = match[1];
      const url = match[2];
      const isFile = url.match(/\.(pdf|docx?|doc|xlsx?|xls|pptx?|ppt|zip|rar|7z|gz|tar|txt|csv|json|png|jpe?g|gif|svg|mp4|mp3)($|\?)/i) || url.startsWith('files/');
      if (isFile && !attachments.some(a => a.url === url)) {
        attachments.push({
          name: label.replace(/^Baixar\s+/i, '').trim() || label,
          url: url
        });
      }
    }

    if (attachments.length > 0) {
      attachmentsHtml = `
        <div class="mt-4 pt-3 border-top">
          <h6 class="fw-bold mb-3 text-primary d-flex align-items-center gap-2">
            <i class="bi bi-paperclip fs-5"></i> Arquivos & Documentos Anexados:
          </h6>
          <div class="d-flex flex-column gap-2">
            ${attachments.map(att => `
              <a href="${att.url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-nepem-outline d-inline-flex align-items-center justify-content-between p-2 text-decoration-none">
                <span><i class="bi bi-file-earmark-arrow-down me-2"></i>${att.name || 'Arquivo Anexo'}</span>
                <i class="bi bi-download"></i>
              </a>
            `).join('')}
          </div>
        </div>`;
    }

    modalBody.innerHTML = `
      ${bannerHtml}
      <div class="d-flex align-items-center justify-content-between gap-2 mb-2 text-secondary small">
        <div><i class="bi bi-calendar3 me-1"></i><span>${date}</span></div>
        <a href="${postUrl}" target="_blank" class="btn btn-sm btn-nepem-outline rounded-pill px-3">
          <i class="bi bi-box-arrow-up-right me-1"></i> Abrir em nova página
        </a>
      </div>
      <h3 class="fw-bold text-gradient mb-3" style="font-size: 1.8rem; line-height: 1.3;">${title}</h3>
      <hr class="my-3">
      <div class="post-markdown-content text-secondary" style="font-size: 1rem; line-height: 1.8;">
        ${parseMarkdown(content)}
      </div>
      ${attachmentsHtml}`;

    const modal = new bootstrap.Modal(document.getElementById('blogPostModal'));
    modal.show();
  }

  function parseMarkdown(text) {
    if (!text) return '';

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Headings
    html = html.replace(/^### (.*?)$/gm, '<h5 class="fw-bold mt-4 mb-2 text-gradient">$1</h5>');
    html = html.replace(/^#### (.*?)$/gm, '<h6 class="fw-bold mt-3 mb-2">$1</h6>');

    // 2. Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 3. Lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul class="text-secondary ps-3 my-2" style="list-style-type: disc;">${match}</ul>`);

    // 4. Tables
    const tableBlockRegex = /(?:(?:^|\n)\|[^\n]+\|\r?\n\|[-:\s|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
    html = html.replace(tableBlockRegex, (match) => {
      const lines = match.trim().split(/\r?\n/);
      if (lines.length < 2) return match;

      const headerLine = lines[0];
      const bodyLines = lines.slice(2);

      const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
      const thHtml = headers.map(h => `<th class="p-3 border fw-bold" style="background: var(--bg-secondary); color: var(--text-primary);">${h}</th>`).join('');

      const trHtml = bodyLines.map(line => {
        const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.length === 0) return '';
        return `<tr>${cells.map(cell => `<td class="p-3 border" style="color: var(--text-primary);">${cell}</td>`).join('')}</tr>`;
      }).join('');

      return `<div class="table-responsive my-4"><table class="table border table-hover align-middle mb-0" style="color: var(--text-primary);"><thead><tr>${thHtml}</tr></thead><tbody>${trHtml}</tbody></table></div>`;
    });

    // 5. Links & Attachments: [Texto](URL)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
      const isFile = url.match(/\.(pdf|docx?|doc|xlsx?|xls|pptx?|ppt|zip|rar|7z|gz|tar|txt|csv|json|png|jpe?g|gif|svg|mp4|mp3)$/i);
      let icon = 'bi bi-box-arrow-up-right';
      if (url.match(/\.pdf$/i)) icon = 'bi bi-file-earmark-pdf';
      else if (url.match(/\.docx?$/i)) icon = 'bi bi-file-earmark-word';
      else if (url.match(/\.(xlsx?|csv)$/i)) icon = 'bi bi-file-earmark-excel';
      else if (url.match(/\.pptx?$/i)) icon = 'bi bi-file-earmark-slides';
      else if (url.match(/\.(zip|rar|7z|gz|tar)$/i)) icon = 'bi bi-file-earmark-zip';
      else if (url.match(/\.(png|jpe?g|gif|svg)$/i)) icon = 'bi bi-file-earmark-image';
      else if (url.match(/\.(mp4|mp3)$/i)) icon = 'bi bi-file-earmark-play';
      else if (isFile) icon = 'bi bi-paperclip';

      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-nepem-outline d-inline-flex align-items-center gap-1 my-1 me-1 text-decoration-none fw-semibold"><i class="${icon}"></i> ${label}</a>`;
    });

    // 6. Paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('<ul') || trimmed.startsWith('<div class="table-responsive') || trimmed.startsWith('<h5') || trimmed.startsWith('<h6')) {
        return trimmed;
      }
      return `<p class="mb-3">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  return { init, openPost };
})();

/* ========== GOOGLE SCHOLAR / OPENALEX STATS INTEGRATION ========== */
const ScholarStats = (() => {
  const DEFAULT_STATS = {
    citations: 3680,
    hIndex: 23,
    worksCount: 135
  };
  const ORCID = '0000-0002-0241-9636';
  const API_URL = `https://api.openalex.org/authors/https://orcid.org/0000-0002-0241-9636`;
  const STORAGE_KEY = 'nepem-scholar-stats';

  function init() {
    // 1. Load cached stats first for instant rendering
    const cached = getCachedStats();
    if (cached) {
      updateUI(cached);
    } else {
      updateUI(DEFAULT_STATS);
    }

    // 2. Fetch fresh stats in the background every time the page is opened
    fetchFreshStats();
  }

  function getCachedStats() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse cached scholar stats:', e);
    }
    return null;
  }

  async function fetchFreshStats() {
    // 1. Try to load from the rich fallback-data.json generated by R script first
    try {
      const fallbackResp = await fetch('data/fallback-data.json?t=' + Date.now());
      if (fallbackResp.ok) {
        const data = await fallbackResp.json();
        if (data && data.scholarData && data.scholarData.profile) {
          const table = data.scholarData.profile.cited_by.table || [];
          let citations = DEFAULT_STATS.citations;
          let hIndex = DEFAULT_STATS.hIndex;

          table.forEach(item => {
            if (item.citations) citations = item.citations.all || citations;
            if (item.h_index) hIndex = item.h_index.all || hIndex;
          });

          const worksCount = (data.scholarData.articles && data.scholarData.articles.length) || DEFAULT_STATS.worksCount;

          const newStats = {
            citations,
            hIndex,
            worksCount,
            timestamp: Date.now()
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
          updateUI(newStats);
          return; // Exit successfully!
        }
      }
    } catch (e) {
      console.log('fallback-data.json not loaded, falling back to live OpenAlex API.', e);
    }

    // 2. Live API fallback (OpenAlex) if R script data is not present
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('API response not ok');
      const data = await response.json();

      const newStats = {
        citations: data.cited_by_count || DEFAULT_STATS.citations,
        hIndex: (data.summary_stats && data.summary_stats.h_index) || DEFAULT_STATS.hIndex,
        worksCount: data.works_count || DEFAULT_STATS.worksCount,
        timestamp: Date.now()
      };

      // Save to cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));

      // Update UI with fresh stats
      updateUI(newStats);
    } catch (e) {
      console.warn('Could not fetch live citation stats from OpenAlex. Using offline/cached data.', e);
    }
  }

  function updateUI(stats) {
    const formattedCitations = stats.citations.toLocaleString('pt-BR');
    const formattedWorks = stats.worksCount.toLocaleString('pt-BR');
    const formattedHIndex = String(stats.hIndex);

    // Update index.html hero stats
    updateElementText(document.getElementById('heroStatPubs'), `${formattedWorks}+`);
    updateElementText(document.getElementById('heroStatCitations'), `${formattedCitations}+`);
    updateElementText(document.getElementById('heroStatHIndex'), formattedHIndex);

    // Update publications.html header metric cards
    updateElementText(document.getElementById('pageStatPubs'), `${formattedWorks}+`);
    updateElementText(document.getElementById('pageStatCitations'), `${formattedCitations}+`);
    updateElementText(document.getElementById('pageStatHIndex'), formattedHIndex);

    // Update index.html publications section metrics
    updateElementText(document.getElementById('homepageStatPubs'), `${formattedWorks}+`);
    updateElementText(document.getElementById('homepageStatCitations'), `${formattedCitations}+`);
    updateElementText(document.getElementById('homepageStatHIndex'), formattedHIndex);

    // Also sync the local publication total count elements if present
    const pubTotalCount = document.getElementById('pubTotalCount');
    if (pubTotalCount) {
      updateElementText(pubTotalCount, String(stats.worksCount));
    }
    const pubTotalCountHeader = document.getElementById('pubTotalCountHeader');
    if (pubTotalCountHeader) {
      updateElementText(pubTotalCountHeader, `${formattedWorks}+`);
    }

    // Set dynamic 3D badge count
    const badgePubs = document.getElementById('badgePublicationsCount');
    if (badgePubs) {
      badgePubs.textContent = stats.worksCount;
    }
  }

  function updateElementText(el, newValue) {
    if (!el || el.textContent === newValue) return;
    el.style.transition = 'opacity 0.25s ease-in-out';
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = newValue;
      el.style.opacity = '1';
    }, 250);
  }

  return { init, getCachedStats, getPendingImageData };
})();

/* --- Global initialization --- */
document.addEventListener('DOMContentLoaded', async () => {
  // Init modules
  ThemeManager.init();
  await I18n.init();
  App.init();
  MembersModule.init();
  ScholarStats.init();

  // Load blog grid if present
  if (document.getElementById('blogGrid')) {
    BlogModule.init();
  }

  // Initialize publications module
  if (document.getElementById('publicationsList')) {
    PublicationsModule.init({ fullPage: true });
  } else if (document.getElementById('publicationsPreview')) {
    PublicationsModule.init({ fullPage: false });
  }
});
