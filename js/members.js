/**
 * NEPEM/UFSC — Members Module
 * Fetches members.json and renders member cards with filtering
 */
const MembersModule = (() => {
  let members = [];
  let currentFilter = 'all';
  let currentPage = 0;

  const groupOrder = [
    'Coordenador geral',
    'Pesquisadores',
    'Estudantes de Pós-Doutorado',
    'Estudantes de Doutorado',
    'Estudantes de Mestrado',
    'Estudantes de Graduação',
    'Ex-alunos',
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

    // Set dynamic 3D badge count
    const badge = document.getElementById('badgeMembersCount');
    if (badge) {
      badge.textContent = members.filter((m) => m.status === 'active').length;
    }

    // Re-render on lang change
    document.addEventListener('langChanged', () => render());
  }

  function setFilter(filter) {
    const grid = document.getElementById('membersGrid');
    if (grid) {
      grid.classList.add('filter-exit');
      setTimeout(() => {
        currentFilter = filter;
        currentPage = 0;
        render();
        grid.classList.remove('filter-exit');
        grid.classList.add('filter-enter');
        void grid.offsetWidth; // force reflow
        grid.classList.remove('filter-enter');
      }, 400);
    } else {
      currentFilter = filter;
      currentPage = 0;
      render();
    }
    // Update filter button states
    document.querySelectorAll('#teamFilters .btn-filter').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  function getFilteredMembers() {
    if (currentFilter === 'all') return members.filter((m) => m.status === 'active');
    return members.filter((m) => m.group === currentFilter);
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

    // Sort by weight first, then alphabetically by name within the same group
    filtered.sort(
      (a, b) =>
        (a.weight || 99) - (b.weight || 99) ||
        a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }),
    );

    // Pagination logic: limit to 8 items (exactly 2 rows of 4 cards on desktop)
    const itemsPerPage = 8;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);

    const pageMembers = filtered.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage,
    );

    let html = pageMembers
      .map((m, i) => {
        const globalIndex = currentPage * itemsPerPage + i;
        const bio = typeof m.bio === 'object' ? m.bio[lang] || m.bio.pt || '' : m.bio || '';
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
            <span class="member-role">${m.group}</span>
            <p class="member-bio">${bio}</p>
            <div class="member-links">${links}</div>
            <button class="btn btn-sm btn-nepem-outline mt-3 w-100" style="font-size: 0.8rem; padding: 0.4rem;" onclick="MembersModule.showMemberModal(${globalIndex})">
              Ver mais
            </button>
          </div>
        </div>`;
      })
      .join('');

    // Update side pagination buttons dynamically
    const prevBtn = document.getElementById('teamPrevBtn');
    const nextBtn = document.getElementById('teamNextBtn');
    if (prevBtn && nextBtn) {
      if (totalPages > 1) {
        prevBtn.classList.remove('d-none');
        nextBtn.classList.remove('d-none');
        prevBtn.disabled = currentPage === 0;
        nextBtn.disabled = currentPage === totalPages - 1;
      } else {
        prevBtn.classList.add('d-none');
        nextBtn.classList.add('d-none');
      }
    }

    // Append beautiful page indicator if totalPages > 1
    if (totalPages > 1) {
      html += `
        <div class="col-12 text-center mt-2 fade-in visible">
          <span class="fw-semibold text-secondary" style="font-size: 0.85rem; letter-spacing: 0.05em; opacity: 0.8;">
            ${currentPage + 1} / ${totalPages}
          </span>
        </div>`;
    }

    container.innerHTML = html;

    // Trigger animations
    requestAnimationFrame(() => {
      container.querySelectorAll('.fade-in-up').forEach((el) => {
        el.classList.add('visible');
      });
    });
  }

  function nextPage() {
    const grid = document.getElementById('membersGrid');
    if (grid) {
      grid.classList.add('slide-out-left');
      setTimeout(() => {
        currentPage++;
        render();
        grid.classList.remove('slide-out-left');
        grid.classList.add('slide-in-right');
        void grid.offsetWidth; // force reflow
        grid.classList.remove('slide-in-right');
      }, 600);
    } else {
      currentPage++;
      render();
    }
  }

  function prevPage() {
    const grid = document.getElementById('membersGrid');
    if (grid) {
      grid.classList.add('slide-out-right');
      setTimeout(() => {
        currentPage--;
        render();
        grid.classList.remove('slide-out-right');
        grid.classList.add('slide-in-left');
        void grid.offsetWidth; // force reflow
        grid.classList.remove('slide-in-left');
      }, 600);
    } else {
      currentPage--;
      render();
    }
  }

  function buildMemberLinks(links) {
    const iconMap = {
      lattes: { icon: 'ai ai-lattes', label: 'Lattes' },
      researchgate: { icon: 'ai ai-researchgate', label: 'ResearchGate' },
      orcid: { icon: 'ai ai-orcid', label: 'ORCID' },
      scholar: { icon: 'ai ai-google-scholar', label: 'Google Scholar' },
      github: { icon: 'bi bi-github', label: 'GitHub' },
      linkedin: { icon: 'bi bi-linkedin', label: 'LinkedIn' },
      email: { icon: 'bi bi-envelope', label: 'Email' },
    };

    return Object.entries(links)
      .filter(([, url]) => url)
      .map(([key, url]) => {
        const info = iconMap[key] || { icon: 'bi bi-link-45deg', label: key };
        const href = key === 'email' ? `mailto:${url}` : url;
        return `<a href="${href}" target="_blank" rel="noopener" title="${info.label}">
                  <i class="${info.icon}"></i>
                </a>`;
      })
      .join('');
  }

  function showMemberModal(index) {
    const filtered = getFilteredMembers();
    // Sort logic identical to render() so indices match (weight then alphabetical)
    filtered.sort(
      (a, b) =>
        (a.weight || 99) - (b.weight || 99) ||
        a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }),
    );

    const m = filtered[index];
    if (!m) return;

    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'pt';
    const bio = typeof m.bio === 'object' ? m.bio[lang] || m.bio.pt || '' : m.bio || '';
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
      <div style="color: var(--text-accent); font-weight: 600; font-size: 0.95rem; margin-bottom: 1.5rem;">${m.group}</div>
      <div class="text-start mb-4" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;">
        ${
          bio
            ? bio
                .split('\n')
                .map((p) => `<p>${p}</p>`)
                .join('')
            : '<p>Sem descrição detalhada disponível.</p>'
        }
      </div>
      <div class="member-links justify-content-center" style="gap: 0.75rem;">${links}</div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('memberModal'));
    modal.show();
  }

  return { init, setFilter, showMemberModal, nextPage, prevPage };
})();
