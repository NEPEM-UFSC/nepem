/* ========== POST PAGE MODULE ========== */
const PostPage = (() => {
  let currentPost = null;

  async function init() {
    // 1. Initialize Theme & Translations
    if (window.ThemeManager) window.ThemeManager.init();
    if (window.I18n) await window.I18n.init();

    // 2. Get Post ID from URL Query Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
      renderNotFound('Nenhum identificador de postagem foi fornecido na URL.');
      return;
    }

    // 3. Load posts data (first try fresh JSON, fallback to localStorage)
    let posts = [];
    try {
      posts = await (await fetch('data/posts.json')).json();
    } catch (e) {
      console.warn('Failed to load data/posts.json, checking localStorage:', e);
      try {
        posts = JSON.parse(localStorage.getItem('nepem-posts') || '[]');
      } catch (err) {
        posts = [];
      }
    }

    // Check localStorage in case admin edited posts locally
    const localPostsStr = localStorage.getItem('nepem-posts');
    if (localPostsStr) {
      try {
        const localPosts = JSON.parse(localPostsStr);
        if (Array.isArray(localPosts) && localPosts.length > 0) {
          // Merge or prioritize local item if found
          const localMatch = localPosts.find(p => p.id === postId);
          if (localMatch) {
            posts = localPosts;
          }
        }
      } catch (e) {}
    }

    // 4. Find the matching post
    currentPost = posts.find(p => p.id === postId);

    if (!currentPost) {
      renderNotFound(`A postagem com ID "${postId}" não foi encontrada.`);
      return;
    }

    // 5. Render Post Details
    renderPost(currentPost);
  }

  function renderPost(post) {
    // Update Document Title
    document.title = `${post.title} — NEPEM/UFSC`;
    document.getElementById('postPageTitle').textContent = `${post.title} — NEPEM/UFSC`;

    // Render Header Info
    document.getElementById('postDate').textContent = post.date || '';
    document.getElementById('postTitle').textContent = post.title || '';
    
    const excerptEl = document.getElementById('postExcerpt');
    if (post.excerpt) {
      excerptEl.textContent = post.excerpt;
      excerptEl.style.display = 'block';
    } else {
      excerptEl.style.display = 'none';
    }

    // Render Banner Image
    const bannerContainer = document.getElementById('postBannerContainer');
    const bannerImg = document.getElementById('postBannerImg');
    if (post.banner) {
      bannerImg.alt = post.title || 'Banner';
      bannerImg.onerror = async () => {
        const filename = post.banner.split('/').pop().split('?')[0];
        try {
          const pending = JSON.parse(localStorage.getItem('nepem-pending-images') || '[]');
          const found = pending.find(img => img.filename === filename || (img.filename && post.banner.endsWith(img.filename)));
          if (found && found.base64) {
            bannerImg.src = found.base64.startsWith('data:') ? found.base64 : `data:image/jpeg;base64,${found.base64}`;
            bannerImg.onerror = null;
            return;
          }
        } catch (e) {}

        const fileObj = await FileStorage.getFile(filename);
        if (fileObj && fileObj.base64) {
          bannerImg.src = fileObj.base64.startsWith('data:') ? fileObj.base64 : `data:image/jpeg;base64,${fileObj.base64}`;
          bannerImg.onerror = null;
        }
      };
      bannerImg.src = post.banner;
      bannerContainer.style.display = 'block';
    } else {
      bannerContainer.style.display = 'none';
    }

    // Render Body Content (Markdown)
    const contentArea = document.getElementById('postContentArea');
    contentArea.innerHTML = parseMarkdown(post.content || '');

    // Render Attachments
    renderAttachments(post);
  }

  function extractAttachmentsFromContent(content) {
    if (!content) return [];
    const attachments = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const label = match[1];
      const url = match[2];
      const isFile = url.match(/\.(pdf|docx?|doc|xlsx?|xls|pptx?|ppt|zip|rar|7z|gz|tar|txt|csv|json|png|jpe?g|gif|svg|mp4|mp3)($|\?)/i) || url.startsWith('files/');
      if (isFile) {
        const cleanName = label.replace(/^Baixar\s+/i, '').trim();
        attachments.push({
          name: cleanName || label,
          url: url,
          type: getFileType(url)
        });
      }
    }
    return attachments;
  }

  function renderAttachments(post) {
    const attachmentsArea = document.getElementById('postAttachmentsArea');
    const attachmentsList = document.getElementById('postAttachmentsList');
    
    if (!attachmentsArea || !attachmentsList) return;

    let attachments = Array.isArray(post.attachments) ? [...post.attachments] : [];
    
    // Auto-extract from content if empty or merge any file links from markdown
    const extracted = extractAttachmentsFromContent(post.content);
    extracted.forEach(ext => {
      if (!attachments.some(a => a.url === ext.url)) {
        attachments.push(ext);
      }
    });
    
    if (attachments.length === 0) {
      attachmentsArea.style.display = 'none';
      return;
    }

    attachmentsArea.style.display = 'block';
    attachmentsList.innerHTML = attachments.map(att => {
      const name = att.name || 'Arquivo Anexo';
      const url = att.url || '#';
      const type = (att.type || getFileType(url)).toLowerCase();

      let iconClass = 'bi-file-earmark';
      if (type.includes('pdf')) iconClass = 'bi-file-earmark-pdf text-danger';
      else if (type.includes('doc') || type.includes('word')) iconClass = 'bi-file-earmark-word text-primary';
      else if (type.includes('xls') || type.includes('excel') || type.includes('csv')) iconClass = 'bi-file-earmark-excel text-success';
      else if (type.includes('zip') || type.includes('rar') || type.includes('7z')) iconClass = 'bi-file-earmark-zip text-warning';
      else if (type.includes('image') || type.includes('jpg') || type.includes('png')) iconClass = 'bi-file-earmark-image text-info';
      else iconClass = 'bi-paperclip text-primary';

      return `
        <div class="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-body-tertiary">
          <div class="d-flex align-items-center gap-3">
            <i class="bi ${iconClass} fs-3"></i>
            <div>
              <h6 class="mb-0 fw-semibold">${name}</h6>
              <span class="small text-secondary">${url}</span>
            </div>
          </div>
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-nepem-outline btn-sm rounded-pill px-3">
            <i class="bi bi-download me-1"></i> Baixar
          </a>
        </div>`;
    }).join('');
  }

  function getFileType(url) {
    if (!url) return 'file';
    if (url.match(/\.pdf$/i)) return 'pdf';
    if (url.match(/\.docx?$/i)) return 'doc';
    if (url.match(/\.xlsx?$/i)) return 'excel';
    if (url.match(/\.zip|\.rar$/i)) return 'zip';
    if (url.match(/\.png|\.jpe?g|\.gif$/i)) return 'image';
    return 'file';
  }

  function parseMarkdown(text) {
    if (!text) return '';

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Tables (Must be processed before other formatting)
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

    // 2. Headings
    html = html.replace(/^### (.*?)$/gm, '<h4 class="fw-bold mt-4 mb-2 text-gradient">$1</h4>');
    html = html.replace(/^#### (.*?)$/gm, '<h5 class="fw-bold mt-3 mb-2">$1</h5>');

    // 3. Links & Attachments: [Texto](URL)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
      const isFile = url.match(/\.(pdf|docx?|doc|xlsx?|xls|pptx?|ppt|zip|rar|7z|gz|tar|txt|csv|json|png|jpe?g|gif|svg|mp4|mp3)($|\?)/i) || url.startsWith('files/');
      let icon = 'bi bi-box-arrow-up-right';
      if (url.match(/\.pdf($|\?)/i)) icon = 'bi bi-file-earmark-pdf text-danger';
      else if (url.match(/\.docx?($|\?)/i)) icon = 'bi bi-file-earmark-word text-primary';
      else if (url.match(/\.(xlsx?|csv)($|\?)/i)) icon = 'bi bi-file-earmark-excel text-success';
      else if (url.match(/\.pptx?($|\?)/i)) icon = 'bi bi-file-earmark-slides text-warning';
      else if (url.match(/\.(zip|rar|7z|gz|tar)($|\?)/i)) icon = 'bi bi-file-earmark-zip text-warning';
      else if (url.match(/\.(png|jpe?g|gif|svg)($|\?)/i)) icon = 'bi bi-file-earmark-image text-info';
      else if (url.match(/\.(mp4|mp3)($|\?)/i)) icon = 'bi bi-file-earmark-play text-info';
      else if (isFile) icon = 'bi bi-paperclip text-primary';

      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-nepem-outline d-inline-flex align-items-center gap-1 my-1 me-1 text-decoration-none fw-semibold"><i class="${icon}"></i> ${label}</a>`;
    });

    // 4. Bullet Lists (Lines starting with * or -)
    html = html.replace(/^\s*[\*\-]\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>(\r?\n)?)+/gs, (match) => `<ul class="text-secondary ps-3 my-3" style="list-style-type: disc;">${match}</ul>`);

    // 5. Bold (**text**)
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');

    // 6. Italic (*text* only without multi-line spanning)
    html = html.replace(/(^|[^\*])\*([^\*\n\s][^\*\n]*?[^\*\n\s]|\S)\*([^\*]|$)/g, '$1<em>$2</em>$3');

    // 7. Paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<ul') || trimmed.startsWith('<div class="table-responsive') || trimmed.startsWith('<h4') || trimmed.startsWith('<h5') || trimmed.startsWith('<table')) {
        return trimmed;
      }
      return `<p class="mb-3">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  function renderNotFound(message) {
    const main = document.querySelector('main');
    if (!main) return;

    main.innerHTML = `
      <div class="container text-center py-5 fade-in-up">
        <div class="glass-card p-5 rounded-4 mx-auto" style="max-width: 600px; border: 1px solid var(--border-color);">
          <i class="bi bi-journal-x fs-1 text-secondary mb-3 d-block"></i>
          <h3 class="fw-bold mb-3">Postagem não encontrada</h3>
          <p class="text-secondary mb-4">${message}</p>
          <a href="index.html#blog" class="btn btn-primary rounded-pill px-4">
            <i class="bi bi-arrow-left me-1"></i> Voltar ao Blog
          </a>
        </div>
      </div>`;
  }

  async function copyLink() {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link da postagem copiado com sucesso para a área de transferência!');
        return;
      } catch (e) {}
    }
    
    // Fallback for HTTP / non-secure contexts
    try {
      const tempInput = document.createElement('input');
      tempInput.value = url;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      alert('Link da postagem copiado com sucesso!');
    } catch (err) {
      prompt('Copie o link abaixo:', url);
    }
  }

  function shareWhatsApp() {
    const title = currentPost ? currentPost.title : document.title;
    const text = encodeURIComponent(`Confira esta publicação do NEPEM/UFSC: "${title}"\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  function shareTwitter() {
    const title = currentPost ? currentPost.title : document.title;
    const text = encodeURIComponent(`Confira: "${title}" — NEPEM/UFSC`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }

  /* ---- SMART ATTACHMENT DOWNLOAD HANDLER (IndexedDB & LocalStorage Fallback) ---- */
  function base64ToBlob(base64, mimeType = 'application/pdf') {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  const FileStorage = {
    dbName: 'nepem_files_db',
    storeName: 'attachments',
    async openDB() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error('No IndexedDB'));
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'filename' });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });
    },
    async getFile(filename) {
      try {
        const db = await this.openDB();
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(filename);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    }
  };

  function setupSmartDownloads() {
    document.addEventListener('click', async (e) => {
      const link = e.target.closest('a[href^="files/"], a[href*="/files/"]');
      if (!link) return;

      const href = link.getAttribute('href');
      const filename = href.split('/').pop().split('?')[0];

      // Check if file exists on server
      try {
        const check = await fetch(href, { method: 'HEAD' });
        if (check.ok) return; // Server file exists, proceed normally
      } catch (err) {
        // Fallback below
      }

      // Fallback: check IndexedDB and localStorage
      let fileData = await FileStorage.getFile(filename);
      if (!fileData) {
        const pending = JSON.parse(localStorage.getItem('nepem-pending-files') || '[]');
        const match = pending.find(f => f.filename === filename);
        if (match) fileData = match;
      }

      if (fileData && fileData.base64) {
        e.preventDefault();
        const mime = fileData.mimeType || (filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        const blob = base64ToBlob(fileData.base64, mime);
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 1500);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupSmartDownloads();
  });

  return { init, copyLink, shareWhatsApp, shareTwitter };
})();
