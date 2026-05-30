const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { runUpdateBases } = require('./scripts/update-bases');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 8000);
const JSON_TYPES = new Set(['members', 'publications', 'projects', 'posts']);
const BLOCKED_PATHS = new Set([
  '/server.py',
  '/server.js',
  '/update_scholar_data.R',
  '/package.json',
  '/package-lock.json',
  '/keys.json',
  '/.gitignore',
]);

function sanitizeFilename(rawFilename) {
  const filename = path.basename(String(rawFilename || '').replace(/\\/g, '/'));
  if (!filename || filename === '.' || filename === '..') return null;
  if (!/^[A-Za-z0-9._-]+$/.test(filename)) return null;
  if (filename !== rawFilename) return null;
  return filename;
}

async function ensureDirectory(targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
}

async function writeJsonFile(targetPath, payload) {
  await ensureDirectory(targetPath);
  const tempPath = `${targetPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tempPath, targetPath);
}

function setApiHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function bootstrapUpdateIfNeeded() {
  const isNetlify = Boolean(process.env.NETLIFY || process.env.BUILD_HOOK || process.env.CONTEXT === 'deploy-preview');
  const isProduction = process.env.NODE_ENV === 'production';
  if (isNetlify || isProduction) return;

  try {
    await runUpdateBases({ reason: 'startup' });
  } catch (error) {
    console.error('[update] Failed to refresh fallback data on startup:', error.message);
  }
}

async function main() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      setApiHeaders(res);
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
    }

    if (BLOCKED_PATHS.has(req.path) || req.path.startsWith('/scripts/')) {
      return res.sendStatus(404);
    }

    return next();
  });

  app.use(express.static(ROOT_DIR, {
    dotfiles: 'deny',
    extensions: ['html'],
    index: false,
  }));

  app.post('/api/upload-image', async (req, res) => {
    try {
      const filename = sanitizeFilename(req.body?.filename);
      const base64Data = req.body?.base64;
      const uploadType = req.body?.type || 'member';

      if (!filename || !base64Data) {
        return res.status(400).json({ status: 'error', message: 'Invalid upload payload' });
      }

      const rawBase64 = String(base64Data).includes(',') ? String(base64Data).split(',')[1] : String(base64Data);
      const imageBuffer = Buffer.from(rawBase64, 'base64');
      const folderMap = { member: 'members', project: 'projects', post: 'projects' };
      const subfolder = folderMap[uploadType] || 'members';
      const filePath = path.join(ROOT_DIR, 'img', subfolder, filename);

      await ensureDirectory(filePath);
      await fs.writeFile(filePath, imageBuffer);

      return res.json({ status: 'success', path: `img/${subfolder}/${filename}` });
    } catch (error) {
      console.error('[upload-image] Failed:', error.message);
      return res.status(500).json({ status: 'error', message: 'Upload failed' });
    }
  });

  app.post('/api/save/:type', async (req, res) => {
    const { type } = req.params;
    if (!JSON_TYPES.has(type)) {
      return res.status(400).json({ status: 'error', message: 'Unsupported data type' });
    }

    try {
      const targetPath = path.join(ROOT_DIR, 'data', `${type}.json`);
      await writeJsonFile(targetPath, req.body);
      return res.json({ status: 'success', message: `Successfully saved ${type}.json directly!` });
    } catch (error) {
      console.error(`[save/${type}] Failed:`, error.message);
      return res.status(500).json({ status: 'error', message: 'Save failed' });
    }
  });

  app.post('/api/update-bases', async (req, res) => {
    try {
      const result = await runUpdateBases({ reason: 'manual' });
      return res.json({ status: 'success', ...result });
    } catch (error) {
      console.error('[update-bases] Failed:', error.message);
      return res.status(500).json({ status: 'error', message: 'Update failed' });
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(async (req, res) => {
    const notFoundPage = path.join(ROOT_DIR, '404.html');
    try {
      await fs.access(notFoundPage);
      return res.status(404).sendFile(notFoundPage);
    } catch {
      return res.status(404).type('text/plain').send('Not Found');
    }
  });

  await bootstrapUpdateIfNeeded();

  app.listen(PORT, () => {
    console.log(`NEPEM Express monolith running at http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Fatal server startup error:', error);
  process.exit(1);
});
