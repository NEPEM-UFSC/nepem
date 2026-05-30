/**
 * NEPEM/UFSC — Publications Module
 * Fetches publications.json and renders with filtering, search, and pagination
 */
const PublicationsModule = (() => {
  let publications = [];
  let currentFilter = 'all';
  let currentSearch = '';
  let currentPage = 1;
  const perPage = 20;
  let pubChartInstance = null;
  let citesChartInstance = null;
  let citationGraph = [];
  let citationMapByDoi = {};
  let citationMapByTitle = {};
  let currentSort = 'citations_desc';

  function normalizeTitle(title) {
    if (!title || typeof title !== 'string') return '';
    return title
      .toLowerCase()
      .normalize('NFD') // Decomposes accented characters into base + accent
      .replace(/[\u0300-\u036f]/g, '') // Strips all accents
      .replace(/[^a-z0-9]/g, '') // Strips everything except a-z and 0-9
      .trim();
  }

  async function init(options = {}) {
    try {
      // Always fetch fresh publications database from the server for public pages
      publications = await (await fetch('data/publications.json?t=' + Date.now())).json();
      // Fix encoding issues & clean up
      publications = publications.map((p) => ({
        ...p,
        title: cleanText(p.title),
        journal: cleanText(p.journal),
        doi: p.doi === 'NA' ? '' : p.doi,
      }));
      // Default sorting is applied after citation maps are loaded

      // Attempt to load rich citation counts from fallback-data.json (Scholar data)
      try {
        const fallbackResp = await fetch('data/fallback-data.json?t=' + Date.now());
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          if (fallbackData && fallbackData.scholarData) {
            if (fallbackData.scholarData.profile && fallbackData.scholarData.profile.cited_by) {
              citationGraph = fallbackData.scholarData.profile.cited_by.graph || [];
            }
            if (fallbackData.scholarData.articles) {
              // Build lookups for existing curated publications to avoid duplicates
              const existingDois = new Set();
              const existingTitles = new Set();
              publications.forEach((p) => {
                if (p.doi) existingDois.add(p.doi.toLowerCase().trim());
                const key = normalizeTitle(p.title);
                if (key) existingTitles.add(key);
              });

              // Trigrams and Jaccard similarity helpers for fuzzy matching
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

              fallbackData.scholarData.articles.forEach((art, idx) => {
                const artTitle = cleanText(art.title);
                const doiKey = art.doi && art.doi !== 'null' ? art.doi.toLowerCase().trim() : '';
                const titleKey = normalizeTitle(artTitle);
                const citesVal = (art.cited_by && art.cited_by.value) || 0;

                // 1. Map citations by DOI (case-insensitive, clean)
                if (doiKey) {
                  citationMapByDoi[doiKey] = citesVal;
                }
                // 2. Map citations by Title (fallback)
                if (titleKey) {
                  citationMapByTitle[titleKey] = citesVal;
                }

                // Check if this article exists in publications.json
                const existsByDoi = doiKey && existingDois.has(doiKey);

                let existsByTitle = false;
                let matchedCuratedKey = '';
                if (titleKey) {
                  if (existingTitles.has(titleKey)) {
                    existsByTitle = true;
                    matchedCuratedKey = titleKey;
                  } else {
                    for (const existing of existingTitles) {
                      // 2a. Substring matching for truncation or prefixes (minimum 15 characters overlap)
                      if (
                        existing.length > 15 &&
                        titleKey.length > 15 &&
                        (existing.includes(titleKey) || titleKey.includes(existing))
                      ) {
                        existsByTitle = true;
                        matchedCuratedKey = existing;
                        break;
                      }
                      // 2b. Jaccard similarity of 3-grams for slight spelling or phrasing differences
                      const sim = getJaccardSimilarity(titleKey, existing);
                      if (sim > 0.7) {
                        existsByTitle = true;
                        matchedCuratedKey = existing;
                        break;
                      }
                    }
                  }
                }

                if (existsByTitle && matchedCuratedKey) {
                  // Keep the highest citation count if multiple Scholar records match the curated publication
                  const currentMax = citationMapByTitle[matchedCuratedKey] || 0;
                  if (citesVal > currentMax) {
                    citationMapByTitle[matchedCuratedKey] = citesVal;
                  }
                }

                if (!existsByDoi && !existsByTitle) {
                  // Dynamically merge new Scholar articles not present in publications.json
                  const journalName =
                    art.journalTitle ||
                    (art.publication ? art.publication.split(',')[0] : 'Google Scholar');
                  const mergedPub = {
                    id: `scholar_auto_${idx}`,
                    title: artTitle,
                    authors: art.authors || '',
                    year: parseInt(art.year) || 2000,
                    type: 'journal', // Default to journal
                    doi: art.doi && art.doi !== 'null' ? art.doi : '',
                    journal: cleanText(journalName),
                    abstract: '',
                  };
                  publications.push(mergedPub);

                  // Add to lookups to avoid self-duplicates
                  if (doiKey) existingDois.add(doiKey);
                  if (titleKey) existingTitles.add(titleKey);
                }
              });
            }
          }
        }
      } catch (err) {
        // Ignore gracefully if file does not exist
      }
    } catch (e) {
      console.error('Failed to load publications:', e);
    }

    // Sort by citations descending by default so preview loads top 6 cited papers
    publications.sort((a, b) => {
      let citesA = 0;
      let citesB = 0;

      if (a && a.doi && typeof a.doi === 'string') {
        const doiKey = a.doi.toLowerCase().trim();
        citesA = citationMapByDoi[doiKey] || 0;
      }
      if (citesA === 0 && a && a.title && typeof a.title === 'string') {
        citesA = citationMapByTitle[normalizeTitle(a.title)] || 0;
      }

      if (b && b.doi && typeof b.doi === 'string') {
        const doiKey = b.doi.toLowerCase().trim();
        citesB = citationMapByDoi[doiKey] || 0;
      }
      if (citesB === 0 && b && b.title && typeof b.title === 'string') {
        citesB = citationMapByTitle[normalizeTitle(b.title)] || 0;
      }

      citesA = Number(citesA);
      citesB = Number(citesB);
      if (isNaN(citesA)) citesA = 0;
      if (isNaN(citesB)) citesB = 0;

      if (citesB !== citesA) {
        return citesB - citesA;
      }

      const yearA = (a && parseInt(a.year)) || 0;
      const yearB = (b && parseInt(b.year)) || 0;
      return yearB - yearA;
    });

    renderCurrentView();
    setupSearch();
    renderPubChart('pubChart');
    renderCitesChart('citesChart');
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

  function getFiltered() {
    let result = [...publications]; // Clone so sorting doesn't modify the master array
    if (currentFilter !== 'all') {
      result = result.filter((p) => p.type === currentFilter);
    }
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      result = result.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const journal = (p.journal || '').toLowerCase();
        let authorsStr = '';
        if (Array.isArray(p.authors)) {
          authorsStr = p.authors.join(' ').toLowerCase();
        } else if (typeof p.authors === 'string') {
          authorsStr = p.authors.toLowerCase();
        }
        return title.includes(q) || authorsStr.includes(q) || journal.includes(q);
      });
    }

    // Apply dynamic sorting
    if (currentSort === 'year_desc') {
      result.sort((a, b) => b.year - a.year);
    } else if (currentSort === 'year_asc') {
      result.sort((a, b) => a.year - b.year);
    } else if (currentSort === 'citations_desc') {
      result.sort((a, b) => {
        try {
          let citesA = 0;
          let citesB = 0;

          if (a && a.doi && typeof a.doi === 'string') {
            const doiKey = a.doi.toLowerCase().trim();
            citesA = citationMapByDoi[doiKey] || 0;
          }
          if (citesA === 0 && a && a.title && typeof a.title === 'string') {
            citesA = citationMapByTitle[normalizeTitle(a.title)] || 0;
          }

          if (b && b.doi && typeof b.doi === 'string') {
            const doiKey = b.doi.toLowerCase().trim();
            citesB = citationMapByDoi[doiKey] || 0;
          }
          if (citesB === 0 && b && b.title && typeof b.title === 'string') {
            citesB = citationMapByTitle[normalizeTitle(b.title)] || 0;
          }

          // Strict type checks to prevent NaN behavior
          citesA = Number(citesA);
          citesB = Number(citesB);
          if (isNaN(citesA)) citesA = 0;
          if (isNaN(citesB)) citesB = 0;

          if (citesB !== citesA) {
            return citesB - citesA;
          }

          const yearA = (a && parseInt(a.year)) || 0;
          const yearB = (b && parseInt(b.year)) || 0;
          return yearB - yearA;
        } catch (err) {
          console.error('Error sorting publications by citation:', err, a, b);
          return 0; // Safe fallback
        }
      });
    }
    return result;
  }

  function renderCurrentView() {
    if (document.getElementById('publicationsList')) {
      renderFullPage();
    } else if (document.getElementById('publicationsPreview')) {
      renderPreview();
    }
  }

  function setSort(sortValue) {
    currentSort = sortValue;
    currentPage = 1;
    renderCurrentView();
  }

  function renderPreview() {
    const container = document.getElementById('publicationsPreview');
    if (!container) return;
    const filtered = getFiltered();
    const recent = filtered.slice(0, 6);
    container.innerHTML = recent.map((p, i) => renderCard(p, i, true)).join('');

    // Update stats
    const countEl = document.getElementById('pubCount');
    if (countEl) countEl.textContent = publications.length;

    // Update count label if present on homepage
    const totalCountEl = document.getElementById('pubTotalCount');
    if (totalCountEl) totalCountEl.textContent = filtered.length;

    // Animate
    requestAnimationFrame(() => {
      container.querySelectorAll('.fade-in-up').forEach((el) => el.classList.add('visible'));
    });
  }

  function renderFullPage() {
    const filtered = getFiltered();
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (currentPage - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    const container = document.getElementById('publicationsList');
    if (!container) return;

    if (pageItems.length === 0) {
      container.innerHTML = `
        <div class="col-12 no-results w-100">
          <i class="bi bi-journal-x"></i>
          <p>Nenhuma publicação encontrada.</p>
        </div>`;
    } else {
      container.innerHTML = pageItems.map((p, i) => renderCard(p, i, true)).join('');
    }

    // Update count
    const countEl = document.getElementById('pubTotalCount');
    if (countEl) countEl.textContent = total;

    // Render pagination
    renderPagination(totalPages);

    // Animate
    requestAnimationFrame(() => {
      container.querySelectorAll('.fade-in-up').forEach((el) => el.classList.add('visible'));
    });
  }

  function renderCard(pub, index, colLayout = false) {
    const stagger = `stagger-${(index % 6) + 1}`;
    const typeLabels = {
      journal: 'Journal',
      conference: 'Conference',
      book: 'Book',
      book_chapter: 'Book Chapter',
      other: 'Other',
    };
    const doiLink = pub.doi
      ? `<a href="https://doi.org/${pub.doi}" target="_blank" class="publication-doi"><i class="bi bi-box-arrow-up-right me-1"></i>${pub.doi}</a>`
      : '';

    let authorsStr = '';
    if (Array.isArray(pub.authors)) {
      authorsStr = pub.authors.join(', ');
    } else if (typeof pub.authors === 'string') {
      authorsStr = pub.authors;
    }

    // Get citation count using DOI or Title match
    let cites = 0;
    if (pub.doi) {
      const doiKey = pub.doi.toLowerCase().trim();
      if (citationMapByDoi[doiKey] !== undefined) {
        cites = citationMapByDoi[doiKey];
      }
    }
    if (cites === 0) {
      const key = normalizeTitle(pub.title);
      cites = citationMapByTitle[key] || 0;
    }

    const citesBadge =
      cites > 0
        ? `<span class="publication-citation-badge" title="Citações no Google Scholar"><i class="ai ai-google-scholar me-1"></i>${cites}</span>`
        : '';

    const cardHtml = `
      <div class="publication-card ${colLayout ? 'h-100 mb-0' : ''} ${!colLayout ? `fade-in-up ${stagger}` : ''}">
        <span class="publication-year-badge">${pub.year}</span>
        <span class="publication-type-badge">${typeLabels[pub.type] || pub.type}</span>
        ${citesBadge}
        <h5 class="mt-2">${pub.title}</h5>
        <p class="publication-authors">${authorsStr}</p>
        ${pub.journal && pub.journal !== 'NA' ? `<p class="publication-journal">${pub.journal}</p>` : ''}
        ${doiLink}
      </div>`;

    if (colLayout) {
      return `<div class="col-md-6 mb-3 fade-in-up ${stagger}">${cardHtml}</div>`;
    }
    return cardHtml;
  }

  function renderPagination(totalPages) {
    const container = document.getElementById('pubPagination');
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let html = `<nav><ul class="pagination pagination-nepem justify-content-center">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
               <a class="page-link" href="#" onclick="PublicationsModule.goToPage(${currentPage - 1}); return false;">
                 <i class="bi bi-chevron-left"></i>
               </a>
             </li>`;

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" onclick="PublicationsModule.goToPage(1); return false;">1</a></li>`;
      if (startPage > 2)
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                 <a class="page-link" href="#" onclick="PublicationsModule.goToPage(${i}); return false;">${i}</a>
               </li>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1)
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      html += `<li class="page-item"><a class="page-link" href="#" onclick="PublicationsModule.goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
               <a class="page-link" href="#" onclick="PublicationsModule.goToPage(${currentPage + 1}); return false;">
                 <i class="bi bi-chevron-right"></i>
               </a>
             </li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
  }

  function goToPage(page) {
    const filtered = getFiltered();
    const totalPages = Math.ceil(filtered.length / perPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderCurrentView();
    document.getElementById('publications-page-top')?.scrollIntoView({ behavior: 'smooth' });
  }

  function setFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    renderCurrentView();
    document.querySelectorAll('#pubFilters .btn-filter').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  function setupSearch() {
    const input = document.getElementById('pubSearchInput');
    if (!input) return;
    let timeout;
    input.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        renderCurrentView();
      }, 300);
    });
  }

  function renderPubChart(canvasId = 'pubChart') {
    let canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const yearCounts = {};
    publications.forEach((p) => {
      if (p.year && p.year > 2000) {
        yearCounts[p.year] = (yearCounts[p.year] || 0) + 1;
      }
    });

    const years = Object.keys(yearCounts).sort();
    const counts = years.map((y) => yearCounts[y]);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    if (pubChartInstance) pubChartInstance.destroy();

    pubChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Publications',
            data: counts,
            backgroundColor: 'rgba(26, 178, 129, 0.6)',
            borderColor: '#1AB281',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
          },
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 5, font: { size: 11 } },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  function renderCitesChart(canvasId = 'citesChart') {
    let canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined' || !citationGraph || citationGraph.length === 0)
      return;

    const years = citationGraph.map((item) => item.year);
    const cites = citationGraph.map((item) => item.citations);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    if (citesChartInstance) citesChartInstance.destroy();

    citesChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Citações',
            data: cites,
            borderColor: '#1AB281',
            backgroundColor: 'rgba(26, 178, 129, 0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#1AB281',
            pointHoverRadius: 6,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
          },
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, font: { size: 11 } },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  function renderChart() {
    renderPubChart('pubChart');
    renderCitesChart('citesChart');
  }

  function getTotal() {
    return publications.length;
  }

  return { init, setFilter, setSort, goToPage, renderChart, getTotal };
})();
