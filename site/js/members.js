/**
 * NEPEM/UFSC — Members Module
 * Fetches members.json and renders member cards with filtering
 */
const MembersModule = (() => {
  let members = [];
  let currentFilter = 'all';

  const groupOrder = [
    'Coordenador geral',
    'Pesquisadores',
    'Estudantes de Pós-Doutorado',
    'Estudantes de Doutorado',
    'Estudantes de Mestrado',
    'Estudantes de Graduação',
    'Ex-alunos'
  ];

  async function init() {
    try {
      // Always fetch fresh members database from the server for public pages
      members = await (await fetch('data/members.json')).json();
    } catch (e) {
      console.error('Failed to load members:', e);
      members = [];
    }
    render();
    // Re-render on lang change
    document.addEventListener('langChanged', () => render());
  }

  function setFilter(filter) {
    currentFilter = filter;
    render();
    // Update filter button states
    document.querySelectorAll('#teamFilters .btn-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  function getFilteredMembers() {
    if (currentFilter === 'all') return members.filter(m => m.status === 'active');
    if (currentFilter === 'alumni') return members.filter(m => m.status === 'alumni' || m.group === 'Ex-alunos');

    const groupMap = {
      'coordinator': 'Coordenador geral',
      'postdoc': 'Estudantes de Pós-Doutorado',
      'phd': 'Estudantes de Doutorado',
      'masters': 'Estudantes de Mestrado',
      'undergrad': 'Estudantes de Graduação',
      'researchers': 'Pesquisadores'
    };
    const target = groupMap[currentFilter];
    if (target) return members.filter(m => m.group === target);
    return members;
  }

  function render() {
    const container = document.getElementById('membersGrid');
    if (!container) return;

    const filtered = getFilteredMembers();
    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'pt';

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-12 no-results">
          <i class="bi bi-people"></i>
          <p>Nenhum membro encontrado nesta categoria.</p>
        </div>`;
      return;
    }

    // Sort by weight
    filtered.sort((a, b) => (a.weight || 99) - (b.weight || 99));

    container.innerHTML = filtered.map((m, i) => {
      const bio = typeof m.bio === 'object' ? (m.bio[lang] || m.bio.pt || '') : (m.bio || '');
      const links = buildMemberLinks(m.links || {});
      const stagger = `stagger-${(i % 6) + 1}`;

      return `
        <div class="col-lg-3 col-md-4 col-sm-6 mb-4 fade-in-up ${stagger}" data-group="${m.group}">
          <div class="member-card">
            <img src="${m.photo || 'img/members/admin.png'}"
                 alt="${m.name}"
                 class="member-photo"
                 loading="lazy"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1AB281&color=fff&size=200'">
            <h5 class="member-name">${m.name}</h5>
            <span class="member-role">${m.role}</span>
            <div class="member-group">${m.group}</div>
            <p class="member-bio">${bio}</p>
            <div class="member-links">${links}</div>
            <button class="btn btn-sm btn-nepem-outline mt-3 w-100" style="font-size: 0.8rem; padding: 0.4rem;" onclick="MembersModule.showMemberModal(${i})">
              Ver mais
            </button>
          </div>
        </div>`;
    }).join('');

    // Trigger animations
    requestAnimationFrame(() => {
      container.querySelectorAll('.fade-in-up').forEach(el => {
        el.classList.add('visible');
      });
    });
  }

  function buildMemberLinks(links) {
    const iconMap = {
      lattes: { icon: 'ai ai-lattes', label: 'Lattes' },
      researchgate: { icon: 'ai ai-researchgate', label: 'ResearchGate' },
      orcid: { icon: 'ai ai-orcid', label: 'ORCID' },
      scholar: { icon: 'ai ai-google-scholar', label: 'Google Scholar' },
      github: { icon: 'bi bi-github', label: 'GitHub' },
      linkedin: { icon: 'bi bi-linkedin', label: 'LinkedIn' },
      email: { icon: 'bi bi-envelope', label: 'Email' }
    };

    return Object.entries(links)
      .filter(([, url]) => url)
      .map(([key, url]) => {
        const info = iconMap[key] || { icon: 'bi bi-link-45deg', label: key };
        const href = key === 'email' ? `mailto:${url}` : url;
        return `<a href="${href}" target="_blank" rel="noopener" title="${info.label}">
                  <i class="${info.icon}"></i>
                </a>`;
      }).join('');
  }

  function showMemberModal(index) {
    const filtered = getFilteredMembers();
    // Sort logic identical to render() so indices match
    filtered.sort((a, b) => (a.weight || 99) - (b.weight || 99));
    
    const m = filtered[index];
    if (!m) return;

    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'pt';
    const bio = typeof m.bio === 'object' ? (m.bio[lang] || m.bio.pt || '') : (m.bio || '');
    const links = buildMemberLinks(m.links || {});
    
    const modalBody = document.getElementById('memberModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <img src="${m.photo || 'img/members/admin.png'}"
           alt="${m.name}"
           class="member-photo mx-auto d-block mt-2"
           style="width: 140px; height: 140px; margin-bottom: 1.5rem;"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1AB281&color=fff&size=200'">
      <h4 class="mb-1 fw-bold">${m.name}</h4>
      <div style="color: var(--text-accent); font-weight: 600; font-size: 0.95rem; margin-bottom: 0.5rem;">${m.role}</div>
      <div class="member-group mb-4">${m.group}</div>
      <div class="text-start mb-4" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;">
        ${bio ? bio.split('\n').map(p => `<p>${p}</p>`).join('') : '<p>Sem descrição detalhada disponível.</p>'}
      </div>
      <div class="member-links justify-content-center" style="gap: 0.75rem;">${links}</div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('memberModal'));
    modal.show();
  }

  return { init, setFilter, showMemberModal };
})();
