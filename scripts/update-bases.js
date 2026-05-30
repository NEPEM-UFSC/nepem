const fs = require('fs/promises');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MAIN_FILENAME = path.join(DATA_DIR, 'fallback-data.json');
const TEMP_FILENAME = path.join(DATA_DIR, 'fallback-data-temp.json');
const CONFIG_FILENAME = path.join(__dirname, 'update-bases.config.json');
const ENV_FILENAME = path.resolve(ROOT_DIR, '..', '.env');

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

function parseEnvFile(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function loadWorkspaceEnv() {
  if (!(await fileExists(ENV_FILENAME))) return {};
  return parseEnvFile(await fs.readFile(ENV_FILENAME, 'utf8'));
}

async function loadConfig() {
  const workspaceEnv = await loadWorkspaceEnv();
  const defaults = {
    github_username: 'NEPEM-UFSC',
    github_username_nepem: 'NEPEM-UFSC',
    orcid_id: '0000-0002-0241-9636',
    scholar_author_id: 'QjxIJkcAAAAJ',
    github_api_base: 'https://api.github.com',
    scholar_api_base: 'https://serpapi.com/search.json',
    orcid_api_base: 'https://pub.orcid.org/v3.0',
  };

  if (await fileExists(CONFIG_FILENAME)) {
    const fileConfig = JSON.parse(await fs.readFile(CONFIG_FILENAME, 'utf8'));
    return {
      ...defaults,
      ...fileConfig,
      github_username:
        workspaceEnv.GITHUB_USERNAME || fileConfig.github_username || defaults.github_username,
      github_username_nepem:
        workspaceEnv.GITHUB_USERNAME_NEPEM ||
        fileConfig.github_username_nepem ||
        defaults.github_username_nepem,
      orcid_id: workspaceEnv.ORCID_ID || fileConfig.orcid_id || defaults.orcid_id,
      scholar_author_id:
        workspaceEnv.SCHOLAR_AUTHOR_ID ||
        fileConfig.scholar_author_id ||
        defaults.scholar_author_id,
    };
  }

  return {
    ...defaults,
    github_username: workspaceEnv.GITHUB_USERNAME || defaults.github_username,
    github_username_nepem: workspaceEnv.GITHUB_USERNAME_NEPEM || defaults.github_username_nepem,
    orcid_id: workspaceEnv.ORCID_ID || defaults.orcid_id,
    scholar_author_id: workspaceEnv.SCHOLAR_AUTHOR_ID || defaults.scholar_author_id,
  };
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
    `ORCID works for ${orcidId}`,
  );

  const groups = Array.isArray(data.group) ? data.group : [];
  return groups
    .map((group) => {
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
        doiLink =
          (extId?.['external-id-type'] || '').toLowerCase() === 'doi'
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
    })
    .filter((item) => item.title);
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

  const data = await fetchJson(
    `${process.env.SCHOLAR_API_BASE || 'https://serpapi.com/search.json'}?${params.toString()}`,
    {},
    'Scholar profile',
  );
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

    const data = await fetchJson(
      `https://serpapi.com/search.json?${params.toString()}`,
      {},
      `Scholar articles page ${start}`,
    );
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
      const publication = String(article.publication || '')
        .replace(/[^A-Za-z\s]/g, ' ')
        .trim();
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

async function loadExistingFallback() {
  if (!(await fileExists(MAIN_FILENAME))) {
    return loadFallbackFromGit();
  }

  try {
    const parsed = JSON.parse(await fs.readFile(MAIN_FILENAME, 'utf8'));
    if (Array.isArray(parsed.githubRepos) && parsed.githubRepos.length > 0) {
      return parsed;
    }
    return loadFallbackFromGit() || parsed;
  } catch {
    return loadFallbackFromGit();
  }
}

function loadFallbackFromGit() {
  try {
    const output = execFileSync('git', ['show', 'HEAD:data/fallback-data.json'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(output);
  } catch {
    return null;
  }
}

async function runUpdateBases(options = {}) {
  const config = await loadConfig();
  const workspaceEnv = await loadWorkspaceEnv();
  const apiKeys =
    workspaceEnv.SERPAPI_API_KEY || process.env.SERPAPI_API_KEY
      ? [workspaceEnv.SERPAPI_API_KEY || process.env.SERPAPI_API_KEY]
      : [];
  const githubPat = workspaceEnv.NEPEMBOT_PAT || process.env.NEPEMBOT_PAT || '';
  const scholarAuthorId = config.scholar_author_id || '';
  const orcidId = config.orcid_id || '';
  const scholarOnly = ['1', 'true', 'yes'].includes(
    String(workspaceEnv.SCHOLAR_ONLY || process.env.SCHOLAR_ONLY || '').toLowerCase(),
  );
  const skipGithubSync =
    scholarOnly ||
    ['1', 'true', 'yes'].includes(
      String(workspaceEnv.SKIP_GITHUB_SYNC || process.env.SKIP_GITHUB_SYNC || '').toLowerCase(),
    );
  const skipOrcidSync =
    scholarOnly ||
    ['1', 'true', 'yes'].includes(
      String(workspaceEnv.SKIP_ORCID_SYNC || process.env.SKIP_ORCID_SYNC || '').toLowerCase(),
    );
  const existingFallback = await loadExistingFallback();

  const githubRepos = skipGithubSync
    ? existingFallback?.githubRepos || []
    : [
        ...(await fetchGithubRepos(config.github_username_nepem, githubPat)),
        ...(await fetchGithubRepos(config.github_username, githubPat)),
      ];

  const orcidWorks = skipOrcidSync
    ? []
    : await fetchOrcidWorks(orcidId).catch((error) => {
        console.warn('[update] ORCID unavailable:', error.message);
        return [];
      });

  let scholarProfile = null;
  let scholarArticles = [];
  let lastError = null;

  if (scholarAuthorId && apiKeys.length > 0) {
    for (const apiKey of apiKeys) {
      try {
        scholarProfile = await fetchScholarProfile(scholarAuthorId, apiKey);
        scholarArticles = await fetchAllScholarArticles(scholarAuthorId, apiKey);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
  } else {
    console.warn(
      '[update] Scholar sync skipped because scholar_author_id or SERPAPI_API_KEY is missing.',
    );
  }

  if (!scholarProfile || scholarArticles.length === 0) {
    if (lastError) {
      console.warn('[update] Scholar sync failed:', lastError.message);
    }
    scholarProfile = scholarProfile || { table: [], graph: [] };
    scholarArticles = scholarArticles || [];
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
      console.log(
        `Fallback data updated: ${result.githubRepos} repos, ${result.scholarArticles} articles`,
      );
    })
    .catch((error) => {
      console.error('Failed to update bases:', error);
      process.exit(1);
    });
}

module.exports = { runUpdateBases };
