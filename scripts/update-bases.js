const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MAIN_FILENAME = path.join(DATA_DIR, 'fallback-data.json');
const TEMP_FILENAME = path.join(DATA_DIR, 'fallback-data-temp.json');
const KEYS_FILENAME = path.join(ROOT_DIR, 'keys.json');

function normalizeTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(/<.*?>/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function safeString(value, fallback = 'null') {
  return value === undefined || value === null || value === '' ? fallback : value;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadKeys() {
  const envFallback = {
    github_username: process.env.GITHUB_USERNAME,
    github_token: process.env.GITHUB_TOKEN,
    github_username_nepem: process.env.GITHUB_USERNAME_NEPEM,
    github_token_nepem: process.env.GITHUB_TOKEN_NEPEM,
    orcid_id: process.env.ORCID_ID,
    scholar_author_id: process.env.SCHOLAR_AUTHOR_ID,
    serpapi_api_key: process.env.SERPAPI_API_KEY ? [process.env.SERPAPI_API_KEY] : [],
  };

  if (await fileExists(KEYS_FILENAME)) {
    const fileKeys = JSON.parse(await fs.readFile(KEYS_FILENAME, 'utf8'));
    const apiKeys = Array.isArray(fileKeys.serpapi_api_key)
      ? fileKeys.serpapi_api_key
      : (fileKeys.serpapi_api_key ? [fileKeys.serpapi_api_key] : []);

    return {
      github_username: fileKeys.github_username || envFallback.github_username,
      github_token: fileKeys.github_token || envFallback.github_token,
      github_username_nepem: fileKeys.github_username_nepem || envFallback.github_username_nepem,
      github_token_nepem: fileKeys.github_token_nepem || envFallback.github_token_nepem,
      orcid_id: fileKeys.orcid_id || envFallback.orcid_id,
      scholar_author_id: fileKeys.scholar_author_id || envFallback.scholar_author_id,
      serpapi_api_key: apiKeys.length > 0 ? apiKeys : envFallback.serpapi_api_key,
    };
  }

  return envFallback;
}

async function fetchJson(url, init, label) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${label} failed (${response.status}): ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function fetchGithubRepos(username, token) {
  if (!username) return [];

  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=100`;
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `token ${token}`;

  const repos = await fetchJson(url, { headers }, `GitHub repos for ${username}`);
  return repos.map((repo) => {
    let homepage = repo.homepage;
    if (!homepage) {
      homepage = repo.has_pages ? `https://${username}.github.io/${repo.name}/` : 'null';
    }

    return {
      name: safeString(repo.name),
      html_url: safeString(repo.html_url),
      homepage,
      description: safeString(repo.description),
      language: safeString(repo.language),
      stargazers_count: repo.stargazers_count || 0,
      forks_count: repo.forks_count || 0,
      updated_at: safeString(repo.updated_at),
      topics: Array.isArray(repo.topics) ? repo.topics : [],
    };
  });
}

async function fetchOrcidWorks(orcidId) {
  if (!orcidId) return [];

  const data = await fetchJson(
    `https://pub.orcid.org/v3.0/${encodeURIComponent(orcidId)}/works`,
    { headers: { Accept: 'application/json' } },
    `ORCID works for ${orcidId}`
  );

  const groups = Array.isArray(data.group) ? data.group : [];
  return groups.map((group) => {
    const summary = group?.['work-summary']?.[0] || {};
    const extIds = group?.['external-ids']?.['external-id'] || [];
    const extId = Array.isArray(extIds) ? extIds[0] : extIds;
    const title = summary?.title?.title?.value || '';
    const link = summary?.url?.value || null;
    const year = summary?.['publication-date']?.year?.value || null;
    const journalTitle = summary?.['journal-title']?.value || null;

    let doi = null;
    let doiLink = null;
    if (extId) {
      doi = extId?.['external-id-value'] || null;
      doiLink = (extId?.['external-id-type'] || '').toLowerCase() === 'doi'
        ? `https://doi.org/${doi}`
        : link;
    }

    return {
      title,
      doi,
      doiLink,
      year,
      journalTitle,
      link,
    };
  }).filter((item) => item.title);
}

function standardizeScholarTable(table = []) {
  return table.map((entry) => {
    if (entry?.citações) {
      const citations = { ...entry.citações };
      if (citations.desde_2020 !== undefined) {
        citations.since_2020 = citations.desde_2020;
        delete citations.desde_2020;
      }
      return { citations };
    }

    if (entry?.Índice_h) {
      const hIndex = { ...entry.Índice_h };
      if (hIndex.desde_2020 !== undefined) {
        hIndex.since_2020 = hIndex.desde_2020;
        delete hIndex.desde_2020;
      }
      return { h_index: hIndex };
    }

    if (entry?.Índice_i10) {
      const i10Index = { ...entry.Índice_i10 };
      if (i10Index.desde_2020 !== undefined) {
        i10Index.since_2020 = i10Index.desde_2020;
        delete i10Index.desde_2020;
      }
      return { i10_index: i10Index };
    }

    return entry;
  });
}

function normalizeGraph(graph = []) {
  const currentYear = new Date().getFullYear();
  const byYear = new Map();

  for (const item of graph) {
    const year = Number(item?.year);
    if (!Number.isFinite(year)) continue;
    byYear.set(year, Number(item?.citations) || 0);
  }

  const years = [];
  for (let year = 2017; year <= currentYear; year += 1) {
    years.push(year);
  }

  return years.map((year) => ({
    year,
    citations: byYear.get(year) || 0,
  }));
}

async function fetchScholarProfile(authorId, apiKey) {
  if (!authorId || !apiKey) return null;

  const params = new URLSearchParams({
    engine: 'google_scholar_author',
    author_id: authorId,
    api_key: apiKey,
    hl: 'pt-br',
  });

  const data = await fetchJson(`https://serpapi.com/search.json?${params.toString()}`, {}, 'Scholar profile');
  if (data.error) {
    throw new Error(`Scholar profile error: ${data.error}`);
  }

  const table = standardizeScholarTable(data?.cited_by?.table || []);
  const graph = normalizeGraph(data?.cited_by?.graph || []);
  return { table, graph };
}

async function fetchAllScholarArticles(authorId, apiKey) {
  if (!authorId || !apiKey) return [];

  const articles = [];
  let start = 0;

  while (true) {
    const params = new URLSearchParams({
      engine: 'google_scholar_author',
      author_id: authorId,
      api_key: apiKey,
      hl: 'pt-br',
      start: String(start),
      num: '100',
    });

    const data = await fetchJson(`https://serpapi.com/search.json?${params.toString()}`, {}, `Scholar articles page ${start}`);
    if (data.error) {
      throw new Error(`Scholar articles error: ${data.error}`);
    }

    const pageItems = Array.isArray(data.articles) ? data.articles : [];
    if (pageItems.length === 0) break;

    articles.push(...pageItems);
    start += pageItems.length;
    if (pageItems.length < 100) break;
  }

  return articles;
}

function mergeOrcidAndScholar(orcidWorks, scholarArticles) {
  const mergedMap = new Map();

  for (const work of orcidWorks) {
    const normalized = normalizeTitle(work.title);
    if (!normalized || mergedMap.has(normalized)) continue;
    mergedMap.set(normalized, {
      ...work,
      cited_by: { value: 0 },
      norm_title: normalized,
    });
  }

  const mergedArticles = scholarArticles.map((article) => {
    const normalized = normalizeTitle(article.title);
    const match = mergedMap.get(normalized);

    const merged = { ...article };
    if (match) {
      merged.doi = match.doi || 'null';
      merged.doiLink = match.doiLink || 'null';
      merged.journalTitle = match.journalTitle || 'null';
    } else {
      merged.doi = 'null';
      merged.doiLink = 'null';
      const publication = String(article.publication || '').replace(/[^A-Za-z\s]/g, ' ').trim();
      merged.journalTitle = publication || 'null';
    }

    if (!merged.year || merged.year === '' || merged.year === 'null') {
      merged.year = '2000';
    }

    return merged;
  });

  mergedArticles.sort((a, b) => {
    const citationA = Number(a?.cited_by?.value) || 0;
    const citationB = Number(b?.cited_by?.value) || 0;
    if (citationB !== citationA) return citationB - citationA;
    const yearA = Number(String(a.year).replace(/[^0-9]/g, '')) || 0;
    const yearB = Number(String(b.year).replace(/[^0-9]/g, '')) || 0;
    return yearB - yearA;
  });

  return mergedArticles;
}

async function writeAtomicJson(targetPath, data) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tempPath = `${targetPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempPath, targetPath);
}

async function runUpdateBases(options = {}) {
  const keys = await loadKeys();
  const apiKeys = Array.isArray(keys.serpapi_api_key) ? keys.serpapi_api_key : [];

  if (!keys.scholar_author_id || apiKeys.length === 0) {
    throw new Error('Missing scholar_author_id or serpapi_api_key configuration');
  }

  const githubRepos = [
    ...(await fetchGithubRepos(keys.github_username_nepem, keys.github_token_nepem)),
    ...(await fetchGithubRepos(keys.github_username, keys.github_token)),
  ];

  const orcidWorks = await fetchOrcidWorks(keys.orcid_id).catch((error) => {
    console.warn('[update] ORCID unavailable:', error.message);
    return [];
  });

  let scholarProfile = null;
  let scholarArticles = [];
  let lastError = null;

  for (const apiKey of apiKeys) {
    try {
      scholarProfile = await fetchScholarProfile(keys.scholar_author_id, apiKey);
      scholarArticles = await fetchAllScholarArticles(keys.scholar_author_id, apiKey);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!scholarProfile || scholarArticles.length === 0) {
    throw lastError || new Error('Scholar data unavailable');
  }

  const mergedArticles = mergeOrcidAndScholar(orcidWorks, scholarArticles);
  const data = {
    githubRepos,
    scholarData: {
      profile: { cited_by: scholarProfile },
      articles: mergedArticles,
    },
  };

  await writeAtomicJson(TEMP_FILENAME, data);
  await writeAtomicJson(MAIN_FILENAME, data);

  return {
    githubRepos: githubRepos.length,
    scholarArticles: mergedArticles.length,
    updatedAt: new Date().toISOString(),
    reason: options.reason || 'manual',
  };
}

if (require.main === module) {
  runUpdateBases({ reason: 'cli' })
    .then((result) => {
      console.log(`Fallback data updated: ${result.githubRepos} repos, ${result.scholarArticles} articles`);
    })
    .catch((error) => {
      console.error('Failed to update bases:', error);
      process.exit(1);
    });
}

module.exports = { runUpdateBases };
