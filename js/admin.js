/**
 * NEPEM/UFSC — Admin Module
 * Client-side CRUD for publications, members, projects, and blog posts via localStorage with server pre-loading
 */
const AdminModule = (() => {
  let currentTab = 'publications';
  let editingId = null;

  function normalizeTitle(title) {
    if (!title || typeof title !== 'string') return '';
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  function cleanText(text) {
    if (!text) return '';
    return (
      text
        // UTF-8 corrupted hyphens, dashes, and control codes
        .replace(/â\x80\x90/g, '-')
        .replace(/â\x80\x93/g, '-')
        .replace(/â\x80\x94/g, '-')
        .replace(/â€\x90/g, '-')
        .replace(/â€/g, '-')
        .replace(/\x90/g, '')
        // UTF-8 corrupted quotes/apostrophes
        .replace(/â\x80\x99/g, "'")
        .replace(/â\x80\x9c/g, '"')
        .replace(/â\x80\x9d/g, '"')
        // Standard accents and html-escaped values
        .replace(/Ã§Ã£/g, 'çã')
        .replace(/Ã£/g, 'ã')
        .replace(/Ã§/g, 'ç')
        .replace(/Ã©/g, 'é')
        .replace(/Ã´/g, 'ô')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã­/g, 'í')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã¢/g, 'â')
        .replace(/Ãµ/g, 'õ')
        .replace(/Ã¼/g, 'ü')
        .replace(/Ã/g, 'À')
        .replace(/\\u0026/g, '&')
    );
  }

  const getTrigrams = (str) => {
    const trigrams = new Set();
    for (let i = 0; i < str.length - 2; i++) {
      trigrams.add(str.substring(i, i + 3));
    }
    return trigrams;
  };

  const getJaccardSimilarity = (str1, str2) => {
    const t1 = getTrigrams(str1);
    const t2 = getTrigrams(str2);
    if (t1.size === 0 || t2.size === 0) return 0;
    let intersection = 0;
    for (const tri of t1) {
      if (t2.has(tri)) {
        intersection++;
      }
    }
    const union = t1.size + t2.size - intersection;
    return intersection / union;
  };

  async function init() {
    // Ensure all animation containers are visible immediately on the admin page
    document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right').forEach((el) => {
      el.classList.add('visible');
    });

    const container = document.getElementById('adminContent');
    if (!container) return;

    // Check Password Protection Gate
    if (localStorage.getItem('nepem-admin-authorized') !== 'true') {
      renderLoginGate(container);
      return;
    }

    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-3 text-secondary">Carregando banco de dados...</p>
      </div>`;

    // Preload base JSON data into localStorage if empty
    await preloadBaseData();

    renderTab(currentTab);
    setupEventListeners();
    setupSidebarLogout();
  }

  function renderLoginGate(container) {
    container.innerHTML = `
      <div class="row justify-content-center py-5">
        <div class="col-md-6 col-lg-5">
          <div class="admin-form-card text-center shadow-lg" style="border: 2px solid var(--nepem-green);">
            <div class="mb-4">
              <div class="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-circle p-3 mb-2" style="width: 70px; height: 70px;">
                <i class="bi bi-shield-lock fs-2"></i>
              </div>
              <h4 class="mt-2 fw-bold">Área restrita</h4>
              <p class="small text-secondary">Informe a senha de administrador para acessar o painel do NEPEM/UFSC.</p>
            </div>
            <form onsubmit="AdminModule.handleLogin(event)">
              <div class="mb-3">
                <input type="password" id="adminPassword" class="form-control form-control-nepem text-center" placeholder="Digite a senha" required autofocus>
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-nepem-primary">Acessar Painel</button>
              </div>
            </form>
            <div class="mt-3 text-start small border-top pt-3">
              <span class="text-secondary d-block mb-1">🔑 <strong>Nota de Segurança:</strong></span>
              <span class="text-muted d-block" style="font-size: 0.8rem; line-height: 1.4;">
                Este painel grava as alterações apenas neste navegador até que você exporte o JSON e publique a atualização no repositório. A senha é validada com hash SHA-256.
              </span>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    const pass = document.getElementById('adminPassword').value;
    const hash = await sha256(pass);
    // SHA-256 hash of 'nepem@flax2022'
    if (hash === '981ce567c534bf51407761e25bdfd0ccb34501730d84cd112f07eb6c13cd9619') {
      localStorage.setItem('nepem-admin-authorized', 'true');
      init();
    } else {
      alert('Senha incorreta! Tente novamente.');
      document.getElementById('adminPassword').value = '';
    }
  }

  async function preloadBaseData() {
    if (!localStorage.getItem('nepem-publications-loaded-v4')) {
      try {
        const res = await fetch('data/publications.json');
        let publications = await res.json();

        // Clean text encodings in publications database first
        publications = publications.map((p) => ({
          ...p,
          title: cleanText(p.title),
          journal: cleanText(p.journal),
          doi: p.doi === 'NA' ? '' : p.doi,
        }));

        // Load fallback-data.json (Google Scholar data) and dynamically auto-merge missing articles
        try {
          const fallbackResp = await fetch('data/fallback-data.json?t=' + Date.now());
          if (fallbackResp.ok) {
            const fallbackData = await fallbackResp.json();
            if (fallbackData && fallbackData.scholarData && fallbackData.scholarData.articles) {
              const existingDois = new Set();
              const existingTitles = new Set();
              publications.forEach((p) => {
                if (p.doi) existingDois.add(p.doi.toLowerCase().trim());
                const key = normalizeTitle(p.title);
                if (key) existingTitles.add(key);
              });

              fallbackData.scholarData.articles.forEach((art, idx) => {
                const artTitle = cleanText(art.title);
                const doiKey = art.doi && art.doi !== 'null' ? art.doi.toLowerCase().trim() : '';
                const titleKey = normalizeTitle(artTitle);

                const existsByDoi = doiKey && existingDois.has(doiKey);
                let existsByTitle = false;
                if (titleKey) {
                  if (existingTitles.has(titleKey)) {
                    existsByTitle = true;
                  } else {
                    for (const existing of existingTitles) {
                      // Substring prefix/suffix matching
                      if (
                        existing.length > 15 &&
                        titleKey.length > 15 &&
                        (existing.includes(titleKey) || titleKey.includes(existing))
                      ) {
                        existsByTitle = true;
                        break;
                      }
                      // Trigrams Jaccard fuzzy similarity
                      const sim = getJaccardSimilarity(titleKey, existing);
                      if (sim > 0.7) {
                        existsByTitle = true;
                        break;
                      }
                    }
                  }
                }

                if (!existsByDoi && !existsByTitle) {
                  const journalName =
                    art.journalTitle ||
                    (art.publication ? art.publication.split(',')[0] : 'Google Scholar');
                  const mergedPub = {
                    id: `scholar_auto_${idx}`,
                    title: artTitle,
                    authors: art.authors || '',
                    year: parseInt(art.year) || 2000,
                    type: 'journal',
                    doi: art.doi && art.doi !== 'null' ? art.doi : '',
                    journal: cleanText(journalName),
                    abstract: '',
                  };
                  publications.push(mergedPub);

                  if (doiKey) existingDois.add(doiKey);
                  if (titleKey) existingTitles.add(titleKey);
                }
              });
            }
          }
        } catch (err) {
          console.warn('Failed to load or merge fallback data in admin preload:', err);
        }

        localStorage.setItem('nepem-publications-v4', JSON.stringify(publications));
        localStorage.setItem('nepem-publications-loaded-v4', 'true');
      } catch (e) {
        console.error('Failed to preload publications:', e);
      }
    }
    if (!localStorage.getItem('nepem-members-loaded')) {
      try {
        const res = await fetch('data/members.json');
        const data = await res.json();
        localStorage.setItem('nepem-members', JSON.stringify(data));
        localStorage.setItem('nepem-members-loaded', 'true');
      } catch (e) {
        console.error('Failed to preload members:', e);
      }
    }
    if (!localStorage.getItem('nepem-projects-loaded')) {
      try {
        const res = await fetch('data/projects.json');
        const data = await res.json();
        localStorage.setItem('nepem-projects', JSON.stringify(data));
        localStorage.setItem('nepem-projects-loaded', 'true');
      } catch (e) {
        console.error('Failed to preload projects:', e);
      }
    }
    if (!localStorage.getItem('nepem-posts-loaded')) {
      try {
        const res = await fetch('data/posts.json');
        const data = await res.json();
        localStorage.setItem('nepem-posts', JSON.stringify(data));
        localStorage.setItem('nepem-posts-loaded', 'true');
      } catch (e) {
        console.error('Failed to preload posts:', e);
      }
    }
  }

  async function resetToDefault(type) {
    const labels = {
      publications: 'publicações',
      members: 'membros',
      projects: 'projetos',
      posts: 'postagens',
    };
    if (
      !confirm(
        `Tem certeza que deseja restaurar as ${labels[type]} para a versão padrão do servidor? Suas alterações locais não salvas em arquivo serão perdidas.`,
      )
    )
      return;

    try {
      if (type === 'publications') {
        localStorage.removeItem('nepem-publications-loaded-v4');
        localStorage.removeItem('nepem-publications-v4');
        await preloadBaseData();
      } else {
        const res = await fetch(`data/${type}.json?t=` + Date.now());
        const data = await res.json();
        localStorage.setItem(`nepem-${type}`, JSON.stringify(data));
        localStorage.setItem(`nepem-${type}-loaded`, 'true');
      }
      editingId = null;
      renderTab(type);
      alert(`Dados de ${labels[type]} restaurados com sucesso!`);
    } catch (e) {
      alert(`Erro ao restaurar dados: ` + e.message);
    }
  }

  function setTab(tab) {
    currentTab = tab;
    editingId = null;
    renderTab(tab);
    document.querySelectorAll('.admin-sidebar .nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.tab === tab);
    });
  }

  function renderTab(tab) {
    const container = document.getElementById('adminContent');
    if (!container) return;

    switch (tab) {
      case 'publications':
        renderPublicationsAdmin(container);
        break;
      case 'members':
        renderMembersAdmin(container);
        break;
      case 'projects':
        renderProjectsAdmin(container);
        break;
      case 'posts':
        renderPostsAdmin(container);
        break;
    }
  }

  /* ---- PUBLICATIONS ---- */
  function renderPublicationsAdmin(container) {
    const pubs = JSON.parse(localStorage.getItem('nepem-publications-v4') || '[]') || [];
    const sortedPubs = Array.isArray(pubs)
      ? [...pubs].sort((a, b) => (b.year || 0) - (a.year || 0))
      : [];

    container.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4><i class="bi bi-journal-text me-2"></i>Publicações (${pubs.length})</h4>
          <p class="small text-secondary mb-0">Gerencie a lista de publicações científicas.</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-nepem-primary" onclick="AdminModule.showPubForm()">
            <i class="bi bi-plus-lg me-1"></i>Adicionar
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="AdminModule.exportData('publications')">
            <i class="bi bi-download me-1"></i>Exportar JSON
          </button>
          <label class="btn btn-sm btn-outline-secondary mb-0">
            <i class="bi bi-upload me-1"></i>Importar JSON
            <input type="file" accept=".json" hidden onchange="AdminModule.importData(event, 'publications')">
          </label>
          <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.resetToDefault('publications')">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Resetar
          </button>
        </div>
      </div>
      <div class="mb-3">
        <input type="text" class="form-control form-control-nepem" id="adminSearch" placeholder="Pesquisar publicações por título, autores ou ano..." oninput="AdminModule.filterTable('pub-row')">
      </div>
      <div id="pubFormArea"></div>
      <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
        <table class="table admin-table table-hover align-middle">
          <thead class="sticky-top bg-body"><tr><th>Ano</th><th>Título</th><th>Autores</th><th>Tipo</th><th>Ações</th></tr></thead>
          <tbody>
            ${sortedPubs.length === 0 ? '<tr><td colspan="5" class="text-center text-muted py-4">Nenhuma publicação cadastrada.</td></tr>' : ''}
            ${sortedPubs
              .map((p) => {
                const pId = p.id || 'pub_' + Math.random().toString(36).substr(2, 9);
                const pTitle = p.title || 'Sem Título';
                const pYear = p.year || 'S/A';
                const pType = p.type || 'journal';

                // Safely handle authors as string, array or undefined
                let authorsArr = [];
                if (Array.isArray(p.authors)) {
                  authorsArr = p.authors;
                } else if (typeof p.authors === 'string') {
                  authorsArr = p.authors
                    .split(',')
                    .map((a) => a.trim())
                    .filter(Boolean);
                }
                const pAuthorsStr = authorsArr.join(', ') || 'Autores não especificados';

                return `
              <tr class="pub-row" data-search="${pTitle.replace(/"/g, '').toLowerCase()} ${pAuthorsStr.replace(/"/g, '').toLowerCase()} ${pYear}">
                <td><strong>${pYear}</strong></td>
                <td style="max-width:320px" class="text-truncate" title="${pTitle.replace(/"/g, '&quot;')}">${pTitle}</td>
                <td style="max-width:200px" class="text-truncate" title="${pAuthorsStr.replace(/"/g, '&quot;')}">${pAuthorsStr}</td>
                <td><span class="badge bg-secondary">${pType}</span></td>
                <td>
                  <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary" onclick="AdminModule.editItem('publications', '${pId}')" title="Editar">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.deleteItem('publications', '${pId}')" title="Excluir">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>`;
  }

  function showPubForm(id = null) {
    const area = document.getElementById('pubFormArea');
    if (!area) return;

    let pub = {
      id: '',
      title: '',
      year: new Date().getFullYear(),
      type: 'journal',
      authors: [],
      journal: '',
      doi: '',
      abstract: '',
    };
    if (id) {
      const pubs = JSON.parse(localStorage.getItem('nepem-publications-v4') || '[]') || [];
      const found = pubs.find((p) => p.id === id);
      if (found) pub = found;
    }

    editingId = id;

    const pTitle = pub.title || '';
    const pJournal = pub.journal || '';
    const pDoi = pub.doi || '';
    const pAbstract = pub.abstract || '';

    let authorsArr = [];
    if (Array.isArray(pub.authors)) {
      authorsArr = pub.authors;
    } else if (typeof pub.authors === 'string') {
      authorsArr = pub.authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    }
    const pAuthorsStr = authorsArr.join(', ');

    area.innerHTML = `
      <div class="admin-form-card mb-4 fade-in-up visible">
        <h5 class="mb-3">${id ? '<i class="bi bi-pencil me-1"></i>Editar Publicação' : '<i class="bi bi-plus-circle me-1"></i>Nova Publicação'}</h5>
        <form onsubmit="AdminModule.savePub(event)">
          <input type="hidden" id="pubId" value="${pub.id || ''}">
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label small mb-1">Título</label>
              <input class="form-control form-control-nepem" id="pubTitle" placeholder="Título da publicação" value="${pTitle.replace(/"/g, '&quot;')}" required>
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Ano</label>
              <input class="form-control form-control-nepem" id="pubYear" type="number" placeholder="Ano" value="${pub.year || new Date().getFullYear()}" required>
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Tipo</label>
              <select class="form-control form-control-nepem" id="pubType">
                <option value="journal" ${pub.type === 'journal' ? 'selected' : ''}>Journal</option>
                <option value="conference" ${pub.type === 'conference' ? 'selected' : ''}>Conference</option>
                <option value="book" ${pub.type === 'book' ? 'selected' : ''}>Book</option>
                <option value="book_chapter" ${pub.type === 'book_chapter' ? 'selected' : ''}>Book Chapter</option>
                <option value="other" ${pub.type === 'other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label small mb-1">Autores (separados por vírgula)</label>
              <input class="form-control form-control-nepem" id="pubAuthors" placeholder="Ex: Olivoto T., Assoni C., Silva J." value="${pAuthorsStr.replace(/"/g, '&quot;')}">
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1">Revista / Conferência</label>
              <input class="form-control form-control-nepem" id="pubJournal" placeholder="Nome da revista ou evento" value="${pJournal.replace(/"/g, '&quot;')}">
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1">DOI</label>
              <input class="form-control form-control-nepem" id="pubDoi" placeholder="Ex: 10.1016/j.heliyon..." value="${pDoi.replace(/"/g, '&quot;')}">
            </div>
            <div class="col-12">
              <label class="form-label small mb-1">Abstract</label>
              <textarea class="form-control form-control-nepem" id="pubAbstract" rows="3" placeholder="Resumo da publicação">${pAbstract}</textarea>
            </div>
            <div class="col-12 d-flex gap-2 mt-3">
              <button type="submit" class="btn btn-nepem-primary">Salvar</button>
              <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('pubFormArea').innerHTML=''">Cancelar</button>
            </div>
          </div>
        </form>
      </div>`;
    area.scrollIntoView({ behavior: 'smooth' });
  }

  function savePub(e) {
    e.preventDefault();
    const id = document.getElementById('pubId').value;
    const isEdit = !!id;

    const pub = {
      id: isEdit ? id : 'pub_' + Date.now(),
      title: document.getElementById('pubTitle').value.trim(),
      year: parseInt(document.getElementById('pubYear').value.trim()),
      type: document.getElementById('pubType').value,
      authors: document
        .getElementById('pubAuthors')
        .value.split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      journal: document.getElementById('pubJournal').value.trim() || 'NA',
      doi: document.getElementById('pubDoi').value.trim() || '',
      abstract: document.getElementById('pubAbstract').value.trim(),
    };

    const pubs = JSON.parse(localStorage.getItem('nepem-publications-v4') || '[]');

    if (isEdit) {
      const idx = pubs.findIndex((p) => p.id === id);
      if (idx !== -1) {
        pubs[idx] = pub;
      } else {
        pubs.push(pub);
      }
    } else {
      pubs.unshift(pub);
    }

    localStorage.setItem('nepem-publications-v4', JSON.stringify(pubs));
    editingId = null;
    renderTab('publications');
    saveLocally('publications');
  }

  /* ---- MEMBERS ---- */
  function renderMembersAdmin(container) {
    const members = JSON.parse(localStorage.getItem('nepem-members') || '[]');
    const sortedMembers = [...members].sort(
      (a, b) =>
        (a.weight || 99) - (b.weight || 99) ||
        a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }),
    );

    container.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4><i class="bi bi-people me-2"></i>Membros (${members.length})</h4>
          <p class="small text-secondary mb-0">Gerencie a equipe de professores, pesquisadores e estudantes.</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-nepem-primary" onclick="AdminModule.showMemberForm()">
            <i class="bi bi-plus-lg me-1"></i>Adicionar
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="AdminModule.exportData('members')">
            <i class="bi bi-download me-1"></i>Exportar JSON
          </button>
          <label class="btn btn-sm btn-outline-secondary mb-0">
            <i class="bi bi-upload me-1"></i>Importar JSON
            <input type="file" accept=".json" hidden onchange="AdminModule.importData(event, 'members')">
          </label>
          <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.resetToDefault('members')">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Resetar
          </button>
        </div>
      </div>
      <div class="mb-3">
        <input type="text" class="form-control form-control-nepem" id="adminSearch" placeholder="Pesquisar membros por nome, cargo ou categoria..." oninput="AdminModule.filterTable('member-row')">
      </div>
      <div id="memberFormArea"></div>
      <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
        <table class="table admin-table table-hover align-middle">
          <thead class="sticky-top bg-body"><tr><th>Foto</th><th>Nome</th><th>Categoria / Cargo</th><th>Status</th><th>Ordenação</th><th>Ações</th></tr></thead>
          <tbody>
            ${sortedMembers.length === 0 ? '<tr><td colspan="6" class="text-center text-muted py-4">Nenhum membro cadastrado.</td></tr>' : ''}
            ${sortedMembers
              .map(
                (m) => `
              <tr class="member-row" data-search="${(m.name || '').toLowerCase()} ${(m.role || '').toLowerCase()} ${(m.group || '').toLowerCase()}">
                <td>
                  <img src="${m.photo || 'img/members/admin.png'}" 
                       alt="${m.name}" 
                       style="width: 32px; height: 32px; object-fit: cover; border-radius: 50%;"
                       onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1AB281&color=fff&size=64'">
                </td>
                <td><strong>${m.name}</strong></td>
                <td>
                  <div class="small fw-semibold text-secondary">${m.group}</div>
                  <div class="small text-muted">${m.role}</div>
                </td>
                <td><span class="badge ${m.status === 'active' ? 'bg-success' : 'bg-secondary'}">${m.status}</span></td>
                <td><code>${m.weight || 50}</code></td>
                <td>
                  <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary" onclick="AdminModule.editItem('members', '${m.id}')" title="Editar">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.deleteItem('members', '${m.id}')" title="Excluir">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  }

  function showMemberForm(id = null) {
    const area = document.getElementById('memberFormArea');
    if (!area) return;

    let member = {
      id: '',
      name: '',
      role: '',
      group: 'Estudantes de Graduação',
      bio: { pt: '', en: '', es: '' },
      photo: '',
      email: '',
      interests: [],
      links: { lattes: '', github: '', linkedin: '', researchgate: '', orcid: '', scholar: '' },
      status: 'active',
      weight: 50,
    };

    if (id) {
      const members = JSON.parse(localStorage.getItem('nepem-members') || '[]');
      const found = members.find((m) => m.id === id);
      if (found) {
        member = found;
        if (typeof member.bio === 'string') {
          member.bio = { pt: member.bio, en: '', es: '' };
        }
        if (!member.links) member.links = {};
      }
    }

    editingId = id;

    area.innerHTML = `
      <div class="admin-form-card mb-4 fade-in-up visible">
        <h5 class="mb-3">${id ? '<i class="bi bi-pencil me-1"></i>Editar Membro' : '<i class="bi bi-plus-circle me-1"></i>Novo Membro'}</h5>
        <form onsubmit="AdminModule.saveMember(event)">
          <input type="hidden" id="memberId" value="${member.id}">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label small mb-1">Nome Completo</label>
              <input class="form-control form-control-nepem" id="memberName" placeholder="Nome do integrante" value="${member.name.replace(/"/g, '&quot;')}" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small mb-1">Cargo / Função (ex: Graduando em Agronomia)</label>
              <input class="form-control form-control-nepem" id="memberRole" placeholder="Ex: Professor Adjunto, Mestre em Agronomia" value="${member.role.replace(/"/g, '&quot;')}" required>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Categoria (Grupo)</label>
              <select class="form-control form-control-nepem" id="memberGroup">
                <option value="Professor" ${member.group === 'Professor' ? 'selected' : ''}>Professor</option>
                <option value="Pós-Doutorando" ${member.group === 'Pós-Doutorando' ? 'selected' : ''}>Pós-Doutorando</option>
                <option value="Doutorando" ${member.group === 'Doutorando' ? 'selected' : ''}>Doutorando</option>
                <option value="Mestrando" ${member.group === 'Mestrando' ? 'selected' : ''}>Mestrando</option>
                <option value="Graduando" ${member.group === 'Graduando' ? 'selected' : ''}>Graduando</option>
                <option value="TAE" ${member.group === 'TAE' ? 'selected' : ''}>TAE</option>
                <option value="Ex-alunos" ${member.group === 'Ex-alunos' ? 'selected' : ''}>Ex-alunos (Alumni)</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Email</label>
              <input class="form-control form-control-nepem" type="email" id="memberEmail" placeholder="Email institucional ou pessoal" value="${member.email || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Foto (Upload Local ou URL)</label>
              <div class="input-group">
                <input class="form-control form-control-nepem" id="memberPhoto" placeholder="Ex: img/members/nome.jpg" value="${member.photo || ''}">
                <label class="btn btn-outline-secondary mb-0 d-flex align-items-center" style="cursor: pointer;">
                  <i class="bi bi-image me-1"></i>Buscar
                  <input type="file" accept="image/*" class="d-none" onchange="AdminModule.handlePhotoUpload(event, 'member')">
                </label>
              </div>
              <div id="memberPhotoPreview" class="mt-2 text-center" style="display: ${member.photo ? 'block' : 'none'};">
                <img src="${member.photo || ''}" style="max-height: 80px; border-radius: 8px; border: 1px solid var(--border-color);" id="memberPhotoImg">
              </div>
            </div>

            <!-- Bios -->
            <div class="col-md-4">
              <label class="form-label small mb-1">Bio (Português)</label>
              <textarea class="form-control form-control-nepem" id="memberBioPt" rows="3" placeholder="Biografia curta em português">${member.bio?.pt || ''}</textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Bio (Inglês)</label>
              <textarea class="form-control form-control-nepem" id="memberBioEn" rows="3" placeholder="Bio in English">${member.bio?.en || ''}</textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Bio (Espanhol)</label>
              <textarea class="form-control form-control-nepem" id="memberBioEs" rows="3" placeholder="Bio en Español">${member.bio?.es || ''}</textarea>
            </div>

            <!-- Interests -->
            <div class="col-md-8">
              <label class="form-label small mb-1">Interesses de Pesquisa (separados por vírgula)</label>
              <input class="form-control form-control-nepem" id="memberInterests" placeholder="Ex: Plant Breeding, Remote Sensing, AI" value="${(member.interests || []).join(', ')}">
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Status</label>
              <select class="form-control form-control-nepem" id="memberStatus">
                <option value="active" ${member.status === 'active' ? 'selected' : ''}>Ativo</option>
                <option value="alumni" ${member.status === 'alumni' ? 'selected' : ''}>Alumni (Ex-integrante)</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Peso (Ordenação)</label>
              <input class="form-control form-control-nepem" type="number" id="memberWeight" placeholder="Ex: 10" value="${member.weight || 1}">
            </div>

            <!-- Links -->
            <div class="col-md-4">
              <label class="form-label small mb-1">Currículo Lattes (URL)</label>
              <input class="form-control form-control-nepem" id="memberLattes" placeholder="http://lattes.cnpq.br/..." value="${member.links?.lattes || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">LinkedIn (URL)</label>
              <input class="form-control form-control-nepem" id="memberLinkedin" placeholder="https://linkedin.com/in/..." value="${member.links?.linkedin || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">GitHub (URL)</label>
              <input class="form-control form-control-nepem" id="memberGithub" placeholder="https://github.com/..." value="${member.links?.github || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">ResearchGate (URL)</label>
              <input class="form-control form-control-nepem" id="memberResearchgate" placeholder="https://researchgate.net/..." value="${member.links?.researchgate || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">ORCID (URL)</label>
              <input class="form-control form-control-nepem" id="memberOrcid" placeholder="https://orcid.org/..." value="${member.links?.orcid || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Google Scholar (URL)</label>
              <input class="form-control form-control-nepem" id="memberScholar" placeholder="https://scholar.google.com/..." value="${member.links?.scholar || ''}">
            </div>

            <div class="col-12 d-flex gap-2 mt-3">
              <button type="submit" class="btn btn-nepem-primary">Salvar</button>
              <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('memberFormArea').innerHTML=''">Cancelar</button>
            </div>
          </div>
        </form>
      </div>`;
    area.scrollIntoView({ behavior: 'smooth' });
  }

  function saveMember(e) {
    e.preventDefault();
    const id = document.getElementById('memberId').value;
    const isEdit = !!id;

    const generateId = (name) => {
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    };

    const finalId = isEdit
      ? id
      : generateId(document.getElementById('memberName').value.trim()) || 'member_' + Date.now();

    const member = {
      id: finalId,
      name: document.getElementById('memberName').value.trim(),
      role: document.getElementById('memberRole').value.trim(),
      group: document.getElementById('memberGroup').value,
      bio: {
        pt: document.getElementById('memberBioPt').value.trim(),
        en: document.getElementById('memberBioEn').value.trim(),
        es: document.getElementById('memberBioEs').value.trim(),
      },
      photo: document.getElementById('memberPhoto').value.trim() || 'img/members/admin.png',
      email: document.getElementById('memberEmail').value.trim(),
      interests: document
        .getElementById('memberInterests')
        .value.split(',')
        .map((i) => i.trim())
        .filter(Boolean),
      links: {
        lattes: document.getElementById('memberLattes').value.trim(),
        linkedin: document.getElementById('memberLinkedin').value.trim(),
        github: document.getElementById('memberGithub').value.trim(),
        researchgate: document.getElementById('memberResearchgate').value.trim(),
        orcid: document.getElementById('memberOrcid').value.trim(),
        scholar: document.getElementById('memberScholar').value.trim(),
      },
      status: document.getElementById('memberStatus').value,
      weight: parseInt(document.getElementById('memberWeight').value.trim() || '50'),
    };

    const members = JSON.parse(localStorage.getItem('nepem-members') || '[]');

    if (isEdit) {
      const idx = members.findIndex((m) => m.id === id);
      if (idx !== -1) {
        members[idx] = member;
      } else {
        members.push(member);
      }
    } else {
      members.push(member);
    }

    localStorage.setItem('nepem-members', JSON.stringify(members));
    editingId = null;
    renderTab('members');
    saveLocally('members');
  }

  /* ---- PROJECTS ---- */
  function renderProjectsAdmin(container) {
    const projects = JSON.parse(localStorage.getItem('nepem-projects') || '[]');

    container.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4><i class="bi bi-folder me-2"></i>Projetos (${projects.length})</h4>
          <p class="small text-secondary mb-0">Gerencie os projetos de pesquisa, livros e softwares do grupo.</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-nepem-primary" onclick="AdminModule.showProjectForm()">
            <i class="bi bi-plus-lg me-1"></i>Adicionar
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="AdminModule.exportData('projects')">
            <i class="bi bi-download me-1"></i>Exportar JSON
          </button>
          <label class="btn btn-sm btn-outline-secondary mb-0">
            <i class="bi bi-upload me-1"></i>Importar JSON
            <input type="file" accept=".json" hidden onchange="AdminModule.importData(event, 'projects')">
          </label>
          <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.resetToDefault('projects')">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Resetar
          </button>
        </div>
      </div>
      <div class="mb-3">
        <input type="text" class="form-control form-control-nepem" id="adminSearch" placeholder="Pesquisar projetos por título ou tag..." oninput="AdminModule.filterTable('project-row')">
      </div>
      <div id="projectFormArea"></div>
      <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
        <table class="table admin-table table-hover align-middle">
          <thead class="sticky-top bg-body"><tr><th>Logo/Imagem</th><th>Título</th><th>Tipo</th><th>Registro/Link</th><th>Tags</th><th>Ações</th></tr></thead>
          <tbody>
            ${projects.length === 0 ? '<tr><td colspan="6" class="text-center text-muted py-4">Nenhum projeto cadastrado.</td></tr>' : ''}
            ${projects
              .map((p) => {
                const hasLink =
                  p.project_number &&
                  (p.project_number.startsWith('http://') ||
                    p.project_number.startsWith('https://'));
                const regDisplay = p.project_number
                  ? hasLink
                    ? `<a href="${p.project_number}" target="_blank" class="btn btn-xs btn-outline-info py-0 px-2" style="font-size:0.75rem;"><i class="bi bi-link-45deg"></i> Link</a>`
                    : `<code class="small bg-light border text-dark py-1 px-2 rounded">${p.project_number}</code>`
                  : '<span class="text-muted small">—</span>';

                return `
                <tr class="project-row" data-search="${(p.title || '').toLowerCase()} ${(p.tags || []).join(' ').toLowerCase()}">
                  <td>
                    ${
                      p.image
                        ? `<img src="${p.image}" alt="${p.title}" style="width: 32px; height: 32px; object-fit: contain;">`
                        : `<i class="bi bi-folder2-open text-success fs-5"></i>`
                    }
                  </td>
                  <td><strong>${p.title}</strong></td>
                  <td><span class="badge bg-secondary text-light">${p.tipo || 'Pesquisa'}</span></td>
                  <td>${regDisplay}</td>
                  <td>${(p.tags || []).map((t) => `<span class="badge bg-info me-1 text-dark">${t}</span>`).join('')}</td>
                  <td>
                    <div class="d-flex gap-1">
                      <button class="btn btn-sm btn-outline-primary" onclick="AdminModule.editItem('projects', '${p.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.deleteItem('projects', '${p.id}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>`;
  }

  function showProjectForm(id = null) {
    const area = document.getElementById('projectFormArea');
    if (!area) return;

    let project = {
      id: '',
      title: '',
      tags: [],
      description: { pt: '', en: '', es: '' },
      url: '',
      github: '',
      image: '',
      tipo: 'Pesquisa',
      project_number: '',
    };

    if (id) {
      const projects = JSON.parse(localStorage.getItem('nepem-projects') || '[]');
      const found = projects.find((p) => p.id === id);
      if (found) {
        project = { ...project, ...found };
        if (typeof project.description === 'string') {
          project.description = { pt: project.description, en: '', es: '' };
        }
      }
    }

    editingId = id;

    area.innerHTML = `
      <div class="admin-form-card mb-4 fade-in-up visible">
        <h5 class="mb-3">${id ? '<i class="bi bi-pencil me-1"></i>Editar Projeto' : '<i class="bi bi-plus-circle me-1"></i>Novo Projeto'}</h5>
        <form onsubmit="AdminModule.saveProject(event)">
          <input type="hidden" id="projId" value="${project.id}">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label small mb-1">Título</label>
              <input class="form-control form-control-nepem" id="projTitle" placeholder="Título do projeto" value="${project.title.replace(/"/g, '&quot;')}" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small mb-1">Tags (separadas por vírgula)</label>
              <input class="form-control form-control-nepem" id="projTags" placeholder="Ex: Pacotes R, Pesquisa, Livros, Aplicativos" value="${(project.tags || []).join(', ')}">
            </div>

            <!-- Descriptions -->
            <div class="col-md-4">
              <label class="form-label small mb-1">Descrição (Português)</label>
              <textarea class="form-control form-control-nepem" id="projDescPt" rows="3" placeholder="Descrição em português" required>${project.description?.pt || ''}</textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Descrição (Inglês)</label>
              <textarea class="form-control form-control-nepem" id="projDescEn" rows="3" placeholder="Description in English">${project.description?.en || ''}</textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Descrição (Espanhol)</label>
              <textarea class="form-control form-control-nepem" id="projDescEs" rows="3" placeholder="Descripción en Español">${project.description?.es || ''}</textarea>
            </div>

            <div class="col-md-4">
              <label class="form-label small mb-1">Tipo de Projeto</label>
              <select class="form-select form-control-nepem" id="projTipo">
                <option value="Pesquisa" ${project.tipo === 'Pesquisa' ? 'selected' : ''}>Pesquisa</option>
                <option value="Extensão" ${project.tipo === 'Extensão' ? 'selected' : ''}>Extensão</option>
                <option value="Aplicativos" ${project.tipo === 'Aplicativos' ? 'selected' : ''}>Aplicativos</option>
                <option value="Bibliotecas de código" ${project.tipo === 'Bibliotecas de código' ? 'selected' : ''}>Bibliotecas de código</option>
                <option value="Material didático" ${project.tipo === 'Material didático' ? 'selected' : ''}>Material didático</option>
                <option value="Livros" ${project.tipo === 'Livros' ? 'selected' : ''}>Livros</option>
                <option value="Outro" ${project.tipo === 'Outro' ? 'selected' : ''}>Outro</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Número de Registro ou Link para Página Oficial</label>
              <input class="form-control form-control-nepem" id="projNumber" placeholder="Ex: SIGPEX 2026... ou https://..." value="${project.project_number || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Imagem / Logo (Upload Local ou URL)</label>
              <div class="input-group">
                <input class="form-control form-control-nepem" id="projImage" placeholder="Ex: https://..." value="${project.image || ''}">
                <label class="btn btn-outline-secondary mb-0 d-flex align-items-center" style="cursor: pointer;">
                  <i class="bi bi-image me-1"></i>Buscar
                  <input type="file" accept="image/*" class="d-none" onchange="AdminModule.handlePhotoUpload(event, 'project')">
                </label>
              </div>
              <div id="projImagePreview" class="mt-2 text-center" style="display: ${project.image ? 'block' : 'none'};">
                <img src="${project.image || ''}" style="max-height: 80px; border-radius: 8px; border: 1px solid var(--border-color);" id="projImageImg">
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label small mb-1">URL do Site de Demonstração / Documentação</label>
              <input class="form-control form-control-nepem" id="projUrl" placeholder="Ex: https://..." value="${project.url || ''}">
            </div>
            <div class="col-md-6">
              <label class="form-label small mb-1">URL do GitHub (código)</label>
              <input class="form-control form-control-nepem" id="projGithub" placeholder="Ex: https://github.com/..." value="${project.github || ''}">
            </div>

            <div class="col-12 d-flex gap-2 mt-3">
              <button type="submit" class="btn btn-nepem-primary">Salvar</button>
              <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('projectFormArea').innerHTML=''">Cancelar</button>
            </div>
          </div>
        </form>
      </div>`;
    area.scrollIntoView({ behavior: 'smooth' });
  }

  function saveProject(e) {
    e.preventDefault();
    const id = document.getElementById('projId').value;
    const isEdit = !!id;

    const generateId = (title) => {
      return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    };

    const finalId = isEdit
      ? id
      : generateId(document.getElementById('projTitle').value.trim()) || 'proj_' + Date.now();

    const project = {
      id: finalId,
      title: document.getElementById('projTitle').value.trim(),
      tags: document
        .getElementById('projTags')
        .value.split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      description: {
        pt: document.getElementById('projDescPt').value.trim(),
        en: document.getElementById('projDescEn').value.trim(),
        es: document.getElementById('projDescEs').value.trim(),
      },
      url: document.getElementById('projUrl').value.trim(),
      github: document.getElementById('projGithub').value.trim(),
      image: document.getElementById('projImage').value.trim(),
      tipo: document.getElementById('projTipo').value,
      project_number: document.getElementById('projNumber').value.trim(),
    };

    const projects = JSON.parse(localStorage.getItem('nepem-projects') || '[]');

    if (isEdit) {
      const idx = projects.findIndex((p) => p.id === id);
      if (idx !== -1) {
        projects[idx] = project;
      } else {
        projects.push(project);
      }
    } else {
      projects.unshift(project);
    }

    localStorage.setItem('nepem-projects', JSON.stringify(projects));
    editingId = null;
    renderTab('projects');
    saveLocally('projects');
  }

  /* ---- BLOG POSTS ---- */
  function renderPostsAdmin(container) {
    const posts = JSON.parse(localStorage.getItem('nepem-posts') || '[]') || [];
    const sortedPosts = Array.isArray(posts)
      ? [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))
      : [];

    container.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4><i class="bi bi-postcard me-2"></i>Blog / Postagens (${posts.length})</h4>
          <p class="small text-secondary mb-0">Gerencie as postagens e notícias no blog do grupo.</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-nepem-primary" onclick="AdminModule.showPostForm()">
            <i class="bi bi-plus-lg me-1"></i>Adicionar Post
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="AdminModule.exportData('posts')">
            <i class="bi bi-download me-1"></i>Exportar JSON
          </button>
          <label class="btn btn-sm btn-outline-secondary mb-0">
            <i class="bi bi-upload me-1"></i>Importar JSON
            <input type="file" accept=".json" hidden onchange="AdminModule.importData(event, 'posts')">
          </label>
          <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.resetToDefault('posts')">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Resetar
          </button>
        </div>
      </div>
      <div class="mb-3">
        <input type="text" class="form-control form-control-nepem" id="adminSearch" placeholder="Pesquisar posts por título..." oninput="AdminModule.filterTable('post-row')">
      </div>
      <div id="postFormArea"></div>
      <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
        <table class="table admin-table table-hover align-middle">
          <thead class="sticky-top bg-body"><tr><th>Banner</th><th>Data</th><th>Título</th><th>Ações</th></tr></thead>
          <tbody>
            ${sortedPosts.length === 0 ? '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum post cadastrado.</td></tr>' : ''}
            ${sortedPosts
              .map(
                (p) => `
              <tr class="post-row" data-search="${(p.title || '').toLowerCase()}">
                <td>
                  <img src="${p.banner || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=64&q=80'}" 
                       alt="${p.title}" 
                       style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;"
                       onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}&background=1AB281&color=fff&size=64'">
                </td>
                <td><strong>${p.date || 'S/D'}</strong></td>
                <td><strong class="text-secondary">${p.title || 'Sem Título'}</strong></td>
                <td>
                  <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary" onclick="AdminModule.editItem('posts', '${p.id}')" title="Editar">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="AdminModule.deleteItem('posts', '${p.id}')" title="Excluir">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  }

  function showPostForm(id = null) {
    const area = document.getElementById('postFormArea');
    if (!area) return;

    let post = {
      id: '',
      title: '',
      date: new Date().toISOString().slice(0, 10),
      excerpt: '',
      banner: '',
      content: '',
    };

    if (id) {
      const posts = JSON.parse(localStorage.getItem('nepem-posts') || '[]');
      const found = posts.find((p) => p.id === id);
      if (found) post = found;
    }

    editingId = id;

    area.innerHTML = `
      <div class="admin-form-card mb-4 fade-in-up visible">
        <h5 class="mb-3">${id ? '<i class="bi bi-pencil me-1"></i>Editar Postagem' : '<i class="bi bi-plus-circle me-1"></i>Nova Postagem'}</h5>
        <form onsubmit="AdminModule.savePost(event)">
          <input type="hidden" id="postId" value="${post.id}">
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label small mb-1">Título</label>
              <input class="form-control form-control-nepem" id="postTitle" placeholder="Título da notícia/postagem" value="${(post.title || '').replace(/"/g, '&quot;')}" required>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Data de Publicação</label>
              <input class="form-control form-control-nepem" type="date" id="postDate" value="${post.date || new Date().toISOString().slice(0, 10)}" required>
            </div>
            <div class="col-12">
              <label class="form-label small mb-1">Resumo Curto (Aparece no card da página inicial)</label>
              <input class="form-control form-control-nepem" id="postExcerpt" placeholder="Um resumo curto do post" value="${(post.excerpt || '').replace(/"/g, '&quot;')}" required>
            </div>
            <div class="col-md-12">
              <label class="form-label small mb-1">Imagem de Banner (Upload Local ou URL)</label>
              <div class="input-group">
                <input class="form-control form-control-nepem" id="postBanner" placeholder="Ex: https://images.unsplash.com/..." value="${post.banner || ''}">
                <label class="btn btn-outline-secondary mb-0 d-flex align-items-center" style="cursor: pointer;">
                  <i class="bi bi-image me-1"></i>Buscar
                  <input type="file" accept="image/*" class="d-none" onchange="AdminModule.handlePhotoUpload(event, 'post')">
                </label>
              </div>
              <div id="postBannerPreview" class="mt-2 text-center" style="display: ${post.banner ? 'block' : 'none'};">
                <img src="${post.banner || ''}" style="max-height: 120px; border-radius: 8px; border: 1px solid var(--border-color);" id="postBannerImg">
              </div>
            </div>

            <!-- Formatting helpers and Rich Editor -->
            <div class="col-12 mt-4">
              <label class="form-label small mb-1 d-block">Conteúdo da Postagem (Formato Markdown)</label>
              
              <!-- Toolbar -->
              <div class="d-flex flex-wrap gap-2 mb-2 p-2 border rounded bg-secondary-subtle">
                <button type="button" class="btn btn-sm btn-light border" onclick="AdminModule.insertFormat('bold')" title="Negrito"><i class="bi bi-type-bold"></i></button>
                <button type="button" class="btn btn-sm btn-light border" onclick="AdminModule.insertFormat('italic')" title="Itálico"><i class="bi bi-type-italic"></i></button>
                <button type="button" class="btn btn-sm btn-light border" onclick="AdminModule.insertFormat('heading')" title="Título H3"><i class="bi bi-type-h3"></i></button>
                <button type="button" class="btn btn-sm btn-light border" onclick="AdminModule.insertFormat('link')" title="Inserir Link"><i class="bi bi-link-45deg"></i></button>
                <button type="button" class="btn btn-sm btn-light border" onclick="AdminModule.insertFormat('table')" title="Inserir Tabela"><i class="bi bi-table"></i></button>
                
                <!-- Emoji Selector -->
                <div class="dropdown d-inline-block">
                  <button type="button" class="btn btn-sm btn-light border dropdown-toggle" data-bs-toggle="dropdown" title="Inserir Emoji"><i class="bi bi-emoji-smile"></i></button>
                  <ul class="dropdown-menu p-2" style="min-width: 180px; max-height: 200px; overflow-y: auto;">
                    <li class="d-flex flex-wrap gap-1">
                      ${[
                        '🌾',
                        '🌱',
                        '🧬',
                        '📊',
                        '📈',
                        '🎓',
                        '🔬',
                        '💻',
                        '💚',
                        '🚀',
                        '🌻',
                        '💡',
                        '🔥',
                      ]
                        .map(
                          (emoji) => `
                        <button type="button" class="btn btn-sm btn-light p-1" style="font-size: 1.2rem; width: 32px; height: 32px;" onclick="AdminModule.insertFormat('${emoji}')">${emoji}</button>
                      `,
                        )
                        .join('')}
                    </li>
                  </ul>
                </div>
              </div>

              <textarea class="form-control form-control-nepem" id="postContent" rows="12" placeholder="Digite o conteúdo usando Markdown..." required oninput="AdminModule.updatePostPreview()">${post.content || ''}</textarea>
            </div>

            <!-- Real-time Preview Area -->
            <div class="col-12 mt-4">
              <label class="form-label small mb-1 fw-bold text-gradient"><i class="bi bi-eye me-1"></i>Pré-visualização em Tempo Real</label>
              <div id="postPreviewArea" class="p-3 border rounded text-secondary" style="background: var(--bg-secondary); min-height: 200px; max-height: 400px; overflow-y: auto; font-size: 0.95rem;">
                <!-- Rendered dynamically -->
              </div>
            </div>

            <div class="col-12 d-flex gap-2 mt-3">
              <button type="submit" class="btn btn-nepem-primary">Salvar Post</button>
              <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('postFormArea').innerHTML=''">Cancelar</button>
            </div>
          </div>
        </form>
      </div>`;

    updatePostPreview();
    area.scrollIntoView({ behavior: 'smooth' });
  }

  function savePost(e) {
    e.preventDefault();
    const id = document.getElementById('postId').value;
    const isEdit = !!id;

    const generateId = (title) => {
      return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    };

    const finalId = isEdit
      ? id
      : generateId(document.getElementById('postTitle').value.trim()) || 'post_' + Date.now();

    const post = {
      id: finalId,
      title: document.getElementById('postTitle').value.trim(),
      date: document.getElementById('postDate').value,
      excerpt: document.getElementById('postExcerpt').value.trim(),
      banner: document.getElementById('postBanner').value.trim(),
      content: document.getElementById('postContent').value,
    };

    const posts = JSON.parse(localStorage.getItem('nepem-posts') || '[]');

    if (isEdit) {
      const idx = posts.findIndex((p) => p.id === id);
      if (idx !== -1) {
        posts[idx] = post;
      } else {
        posts.push(post);
      }
    } else {
      posts.unshift(post);
    }

    localStorage.setItem('nepem-posts', JSON.stringify(posts));
    editingId = null;
    renderTab('posts');
    saveLocally('posts');
  }

  function insertFormat(tag) {
    const textarea = document.getElementById('postContent');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    switch (tag) {
      case 'bold':
        replacement = `**${selectedText || 'texto em negrito'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'texto em itálico'}*`;
        break;
      case 'heading':
        replacement = `\n### ${selectedText || 'Título'}\n`;
        break;
      case 'link':
        replacement = `[${selectedText || 'Link'}](https://url.com)`;
        break;
      case 'table':
        replacement = `\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Dado 1 | Dado 2 |\n`;
        break;
      default: // Emojis
        replacement = tag;
    }

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    textarea.selectionStart = start + replacement.length;
    textarea.selectionEnd = start + replacement.length;

    updatePostPreview();
  }

  function updatePostPreview() {
    const content = document.getElementById('postContent')?.value || '';
    const previewArea = document.getElementById('postPreviewArea');
    if (previewArea) {
      previewArea.innerHTML =
        parseMarkdown(content) ||
        '<p class="text-muted small">Digite o conteúdo acima para ver a pré-visualização...</p>';
    }
  }

  function parseMarkdown(text) {
    if (!text) return '';

    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1. Headings
    html = html.replace(/^### (.*?)$/gm, '<h5 class="fw-bold mt-4 mb-2 text-gradient">$1</h5>');
    html = html.replace(/^#### (.*?)$/gm, '<h6 class="fw-bold mt-3 mb-2">$1</h6>');

    // 2. Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 3. Lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(
      /(<li>.*?<\/li>)+/gs,
      (match) =>
        `<ul class="text-secondary ps-3 my-2" style="list-style-type: disc;">${match}</ul>`,
    );

    // 4. Tables
    html = html.replace(
      /\|(.*?)\|\r?\n\|[ -:|]*?\|\r?\n((?:\|.*?\|\r?\n?)*)/g,
      (match, header, body) => {
        const headers = header
          .split('|')
          .map((h) => h.trim())
          .filter(Boolean);
        const rows = body
          .trim()
          .split('\n')
          .map((r) =>
            r
              .split('|')
              .map((c) => c.trim())
              .filter(Boolean),
          );

        const thHtml = headers
          .map((h) => `<th class="bg-light text-secondary font-semibold p-2 border">${h}</th>`)
          .join('');
        const trHtml = rows
          .map((row) => {
            if (row.length === 0) return '';
            return `<tr>${row.map((cell) => `<td class="p-2 border text-secondary">${cell}</td>`).join('')}</tr>`;
          })
          .join('');

        return `<div class="table-responsive my-4"><table class="table border table-hover align-middle"><thead><tr>${thHtml}</tr></thead><tbody>${trHtml}</tbody></table></div>`;
      },
    );

    // 5. Paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs
      .map((p) => {
        const trimmed = p.trim();
        if (
          trimmed.startsWith('<ul') ||
          trimmed.startsWith('<div class="table-responsive') ||
          trimmed.startsWith('<h5') ||
          trimmed.startsWith('<h6')
        ) {
          return trimmed;
        }
        return `<p class="mb-3">${trimmed.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');

    return html;
  }

  /* ---- PHOTO FILE UPLOAD HANDLE ---- */
  async function handlePhotoUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic');

    let fileToProcess = file;
    if (isHeic) {
      alert(
        'Formato HEIC (iPhone) detectado. O sistema vai converter automaticamente para JPG, isso pode levar alguns segundos...',
      );
      try {
        if (!window.heic2any) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
          });
        }
        const conversionResult = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.85,
        });
        let blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        fileToProcess = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), {
          type: 'image/jpeg',
        });
      } catch (e) {
        console.error(e);
        alert('Erro ao converter arquivo HEIC. Por favor, envie como JPG ou PNG.');
        return;
      }
    }

    const processedBase64 = await resizeImage(fileToProcess);
    if (!processedBase64) return;

    // Show instant local preview in browser
    const imgElId =
      type === 'member' ? 'memberPhotoImg' : type === 'project' ? 'projImageImg' : 'postBannerImg';
    const previewElId =
      type === 'member'
        ? 'memberPhotoPreview'
        : type === 'project'
          ? 'projImagePreview'
          : 'postBannerPreview';
    const imgEl = document.getElementById(imgElId);
    const previewEl = document.getElementById(previewElId);
    if (imgEl) imgEl.src = processedBase64;
    if (previewEl) previewEl.style.display = 'block';

    // Generate unique name for the file
    const cleanExt = '.jpg';
    const baseName = fileToProcess.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 15);
    const uniqueFilename = `${type}_${baseName}_${Date.now()}${cleanExt}`;

    showToast('Fazendo upload da imagem...');

    let savedPath = null;

    // 1. Try local server endpoint first if running locally
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uniqueFilename,
          base64: processedBase64,
          type: type,
        }),
      });
      if (response.ok) {
        const resData = await response.json();
        savedPath = resData.path;
      }
    } catch (e) {
      console.log('Local upload not available. Checking GitHub Sync...');
    }

    // 2. Try GitHub API direct upload if GitHub Sync is configured
    if (!savedPath) {
      const configStr = localStorage.getItem('nepem-github-config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.token && config.owner && config.repo) {
          try {
            const rawBase64 = processedBase64.includes(',')
              ? processedBase64.split(',')[1]
              : processedBase64;
            const subfolder = type === 'member' ? 'members' : 'projects';
            const gitHubPath = `img/${subfolder}/${uniqueFilename}`;
            const putUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${gitHubPath}`;

            const putRes = await fetch(putUrl, {
              method: 'PUT',
              headers: {
                Authorization: `token ${config.token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Upload photo ${uniqueFilename} via Admin Panel`,
                content: rawBase64,
                branch: config.branch,
              }),
            });

            if (putRes.ok) {
              savedPath = `img/${subfolder}/${uniqueFilename}`;
            }
          } catch (gitErr) {
            console.error('GitHub upload failed:', gitErr);
          }
        }
      }
    }

    // 3. Set value of the corresponding text input field
    const inputElId =
      type === 'member' ? 'memberPhoto' : type === 'project' ? 'projImage' : 'postBanner';
    const inputEl = document.getElementById(inputElId);

    if (savedPath) {
      if (inputEl) inputEl.value = savedPath;
      showToast(`Imagem salva em ${savedPath}`);
    } else {
      // Fallback: use Base64 string directly inside JSON database if both offline & GitHub Sync are missing
      if (inputEl) inputEl.value = processedBase64;
      showToast('Imagem vinculada via base64 (plano de backup).');
    }
  }

  function resizeImage(fileToProcess) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileToProcess);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onerror = () => {
          alert(
            'O formato dessa imagem não é suportado pelo navegador ou o arquivo está corrompido. Tente enviar como JPG ou PNG.',
          );
          resolve(null);
        };
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Let's set MAX_DIM to 1000px for excellent sharpness and resolution
          const MAX_DIM = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height *= MAX_DIM / width));
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width *= MAX_DIM / height));
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.85; // 85% JPEG quality is excellent and not blurry!
          let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

          // Only iteratively compress if it is extremely huge to stay within 1.5MB for safety
          const MAX_SIZE = 1.5 * 1024 * 1024;
          let currentWidth = width;
          let currentHeight = height;
          while (compressedBase64.length > MAX_SIZE * 1.37 && quality > 0.4) {
            quality -= 0.15;
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressedBase64);
        };
      };
    });
  }

  async function saveLocally(type) {
    const key = type === 'publications' ? 'nepem-publications-v4' : `nepem-${type}`;
    const data = localStorage.getItem(key) || '[]';
    const formattedData = JSON.stringify(JSON.parse(data), null, 2);

    try {
      const response = await fetch(`/api/save/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: formattedData,
      });
      if (response.ok) {
        showToast(`Salvo localmente em data/${type}.json`);
      }
    } catch (e) {
      console.log('Local backend save not available. Data saved in localStorage.');
    }
  }

  /* ---- COMMON ---- */
  function deleteItem(type, id) {
    const labels = {
      publications: 'esta publicação',
      members: 'este membro',
      projects: 'este projeto',
      posts: 'esta postagem',
    };
    if (!confirm(`Tem certeza que deseja excluir ${labels[type]}?`)) return;
    const key = `nepem-${type}`;
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = items.filter((item) => item.id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
    renderTab(currentTab);
    saveLocally(type);
  }

  function editItem(type, id) {
    if (type === 'publications') showPubForm(id);
    if (type === 'members') showMemberForm(id);
    if (type === 'projects') showProjectForm(id);
    if (type === 'posts') showPostForm(id);
  }

  function filterTable(rowClass) {
    const q = document.getElementById('adminSearch')?.value.toLowerCase().trim() || '';
    document.querySelectorAll('.' + rowClass).forEach((row) => {
      const searchStr = row.dataset.search || '';
      row.style.display = searchStr.includes(q) ? '' : 'none';
    });
  }

  async function exportData(type) {
    const key = type === 'publications' ? 'nepem-publications-v4' : `nepem-${type}`;
    const data = localStorage.getItem(key) || '[]';
    // Format JSON with 2-space indentation to make it pretty and easy to replace in repository!
    const formattedData = JSON.stringify(JSON.parse(data), null, 2);

    // Try saving directly to our local python server first
    try {
      const response = await fetch(`/api/save/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: formattedData,
      });
      if (response.ok) {
        showToast(`Salvo diretamente em data/${type}.json`);
        console.log(`Successfully saved ${type}.json directly to local folder.`);
        return;
      }
    } catch (e) {
      console.log('Local backend save not available, falling back to download.');
    }

    // Fallback: standard browser download
    const blob = new Blob([formattedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('O arquivo JSON deve conter uma lista (array).');
        const key = type === 'publications' ? 'nepem-publications-v4' : `nepem-${type}`;
        const loadedKey =
          type === 'publications' ? 'nepem-publications-loaded-v4' : `nepem-${type}-loaded`;
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(loadedKey, 'true');
        renderTab(currentTab);
        alert(`Sucesso! ${data.length} itens importados.`);
      } catch (err) {
        alert('Erro ao importar JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function setupEventListeners() {
    // Language and theme toggles if present
    document.getElementById('themeToggle')?.addEventListener('click', () => ThemeManager.toggle());
    document.getElementById('langToggle')?.addEventListener('click', () => I18n.cycleLang());
  }

  function setupSidebarLogout() {
    const nav = document.querySelector('.admin-sidebar nav');
    if (nav && !document.getElementById('adminLogoutBtn')) {
      const btn = document.createElement('button');
      btn.id = 'adminLogoutBtn';
      btn.className = 'nav-link text-danger mt-3 border-top pt-3';
      btn.style.textAlign = 'left';
      btn.innerHTML = `<i class="bi bi-box-arrow-right me-2"></i>Bloquear Painel`;
      btn.onclick = () => {
        if (confirm('Deseja sair e bloquear o painel de administração?')) {
          localStorage.removeItem('nepem-admin-authorized');
          window.location.reload();
        }
      };
      nav.appendChild(btn);
    }
  }

  /* ---- GITHUB SYNC ---- */
  function openGithubSettings() {
    const config = JSON.parse(localStorage.getItem('nepem-github-config') || '{}');
    if (config.token) document.getElementById('ghToken').value = config.token;
    if (config.owner) document.getElementById('ghOwner').value = config.owner;
    if (config.repo) document.getElementById('ghRepo').value = config.repo;
    if (config.branch) document.getElementById('ghBranch').value = config.branch;

    new bootstrap.Modal(document.getElementById('githubConfigModal')).show();
  }

  function saveGithubSettings(e) {
    e.preventDefault();
    const config = {
      token: document.getElementById('ghToken').value.trim(),
      owner: document.getElementById('ghOwner').value.trim(),
      repo: document.getElementById('ghRepo').value.trim(),
      branch: document.getElementById('ghBranch').value.trim(),
    };
    localStorage.setItem('nepem-github-config', JSON.stringify(config));
    bootstrap.Modal.getInstance(document.getElementById('githubConfigModal')).hide();
    alert(
      'Configurações do GitHub salvas com sucesso! As próximas edições farão commit automático.',
    );
  }

  function clearGithubSettings() {
    if (
      confirm('Deseja realmente desvincular sua conta do GitHub? O auto-save deixará de funcionar.')
    ) {
      localStorage.removeItem('nepem-github-config');
      bootstrap.Modal.getInstance(document.getElementById('githubConfigModal')).hide();
      alert(
        'Configurações removidas. O sistema voltará a baixar o JSON no seu computador ao salvar.',
      );
    }
  }

  async function syncToGithub(type) {
    const configStr = localStorage.getItem('nepem-github-config');
    if (!configStr) {
      exportData(type);
      return;
    }

    const config = JSON.parse(configStr);
    if (!config.token || !config.owner || !config.repo) {
      exportData(type);
      return;
    }

    // Prepare data
    const key = type === 'publications' ? 'nepem-publications-v4' : `nepem-${type}`;
    const data = localStorage.getItem(key) || '[]';
    const formattedData = JSON.stringify(JSON.parse(data), null, 2);

    // GitHub API requires Base64 encoded content
    const contentEncoded = btoa(unescape(encodeURIComponent(formattedData)));
    const path = `data/${type}.json`;
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

    showToast(`Sincronizando ${type} com o GitHub...`);

    try {
      // 1. Get current SHA
      let currentSha = null;
      const getRes = await fetch(`${url}?ref=${config.branch}`, {
        headers: {
          Authorization: `token ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
      } else if (getRes.status !== 404) {
        throw new Error(`Erro ao acessar GitHub: ${getRes.statusText}`);
      }

      // 2. Update File
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Auto-update ${type}.json via Admin Panel`,
          content: contentEncoded,
          sha: currentSha, // Required if file exists
          branch: config.branch,
        }),
      });

      if (!putRes.ok) {
        const errorData = await putRes.json();
        throw new Error(errorData.message || 'Erro desconhecido');
      }

      showToast(`Sucesso! Atualizado no GitHub (${type}).`);
    } catch (err) {
      console.error(err);
      alert(
        `Falha ao sincronizar com o GitHub: ${err.message}\nBaixando o arquivo localmente como plano B.`,
      );
      exportData(type);
    }
  }

  async function deploySite() {
    const configStr = localStorage.getItem('nepem-github-config');
    if (!configStr) {
      alert(
        "Por favor, configure as credenciais do GitHub primeiro na opção 'Sincronização GitHub' na barra lateral.",
      );
      openGithubSettings();
      return;
    }

    const config = JSON.parse(configStr);
    if (!config.token || !config.owner || !config.repo) {
      alert(
        "Por favor, preencha as credenciais do GitHub na opção 'Sincronização GitHub' na barra lateral.",
      );
      openGithubSettings();
      return;
    }

    if (
      !confirm(
        'Deseja enviar todas as alterações salvas localmente para o GitHub e iniciar o deploy do site?',
      )
    )
      return;

    const types = ['publications', 'members', 'projects', 'posts'];
    let successCount = 0;

    showToast('Iniciando deploy de todas as alterações...');

    for (const type of types) {
      try {
        const key = type === 'publications' ? 'nepem-publications-v4' : `nepem-${type}`;
        const data = localStorage.getItem(key);
        if (!data) continue;

        const formattedData = JSON.stringify(JSON.parse(data), null, 2);
        const contentEncoded = btoa(unescape(encodeURIComponent(formattedData)));
        const path = `data/${type}.json`;
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

        showToast(`Enviando ${type}.json para o GitHub...`);

        // 1. Get current SHA
        let currentSha = null;
        const getRes = await fetch(`${url}?ref=${config.branch}`, {
          headers: {
            Authorization: `token ${config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (getRes.ok) {
          const fileInfo = await getRes.json();
          currentSha = fileInfo.sha;
        }

        // 2. Update File
        const putRes = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `token ${config.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Deploy updates for ${type}.json via Admin Panel`,
            content: contentEncoded,
            sha: currentSha,
            branch: config.branch,
          }),
        });

        if (putRes.ok) {
          successCount++;
        } else {
          const errorData = await putRes.json();
          console.error(`Error deploying ${type}:`, errorData);
        }
      } catch (err) {
        console.error(`Failed to deploy ${type}:`, err);
      }
    }

    if (successCount > 0) {
      showToast(`Sucesso! Deploy concluído com ${successCount} arquivos atualizados.`);
      alert(
        `Deploy enviado com sucesso! O GitHub foi atualizado com ${successCount} arquivos de dados e o Netlify iniciará a publicação em instantes.`,
      );
    } else {
      alert(
        'Nenhum arquivo pôde ser enviado. Verifique se as credenciais do GitHub estão corretas ou se há conexão com a internet.',
      );
    }
  }

  function showToast(msg) {
    const toastEl = document.getElementById('githubToast');
    const msgEl = document.getElementById('githubToastMsg');
    if (toastEl && msgEl) {
      msgEl.textContent = msg;
      new bootstrap.Toast(toastEl).show();
    }
  }

  return {
    init,
    setTab,
    showPubForm,
    savePub,
    showMemberForm,
    saveMember,
    showProjectForm,
    saveProject,
    showPostForm,
    savePost,
    deleteItem,
    editItem,
    filterTable,
    exportData,
    importData,
    resetToDefault,
    handlePhotoUpload,
    handleLogin,
    insertFormat,
    updatePostPreview,
    openGithubSettings,
    saveGithubSettings,
    clearGithubSettings,
    deploySite,
  };
})();
