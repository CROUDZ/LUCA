/**
 * LUCA Modding System - Registry REST API
 * Node.js 18+ ESM
 *
 * API pour la gestion centralisée des mods:
 * - Upload et validation
 * - Liste et recherche
 * - Téléchargement
 * - Enable/disable
 * - Webhooks CI
 *
 * Dépendances: npm install express multer better-sqlite3 jsonwebtoken uuid cors helmet
 *
 * @module registry/server
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, rm, readdir, stat } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  port: process.env.REGISTRY_PORT || 3001,
  host: process.env.REGISTRY_HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production-' + randomUUID(),
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'),
  modsDir: process.env.MODS_DIR || path.join(__dirname, 'mods'),
  dbPath: process.env.DB_PATH || path.join(__dirname, 'registry.db'),
  maxUploadSize: 10 * 1024 * 1024, // 10MB
  allowedOrigins: ['http://localhost:3000', 'http://localhost:8081'],
  webhookSecret: process.env.WEBHOOK_SECRET || 'webhook-secret',
};

// ============================================================================
// DATABASE (SQLite)
// ============================================================================

let db;

async function initDatabase() {
  // Dynamic import pour better-sqlite3
  const Database = (await import('better-sqlite3')).default;

  db = new Database(CONFIG.dbPath);

  // Créer les tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS mods (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      version TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      author_name TEXT,
      author_email TEXT,
      manifest TEXT NOT NULL,
      checksum TEXT NOT NULL,
      size INTEGER,
      downloads INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      verified INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS mod_versions (
      id TEXT PRIMARY KEY,
      mod_id TEXT NOT NULL,
      version TEXT NOT NULL,
      manifest TEXT NOT NULL,
      checksum TEXT NOT NULL,
      size INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mod_id) REFERENCES mods(id)
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      name TEXT,
      permissions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      mod_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mod_id) REFERENCES mods(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      mod_id TEXT,
      user_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_mods_name ON mods(name);
    CREATE INDEX IF NOT EXISTS idx_mods_enabled ON mods(enabled);
    CREATE INDEX IF NOT EXISTS idx_mod_versions_mod_id ON mod_versions(mod_id);
  `);

  console.log('[registry] Database initialized');
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

const upload = multer({
  dest: CONFIG.uploadDir,
  limits: {
    fileSize: CONFIG.maxUploadSize,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.endsWith('.zip')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  },
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const [type, token] = authHeader.split(' ');

  if (type === 'Bearer') {
    try {
      const decoded = jwt.verify(token, CONFIG.jwtSecret);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } else if (type === 'ApiKey') {
    // Vérifier l'API key
    const keyHash = createHash('sha256').update(token).digest('hex');
    const apiKey = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(keyHash);

    if (apiKey) {
      db.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?').run(apiKey.id);
      req.user = { id: apiKey.user_id, role: 'api' };
      req.apiKey = apiKey;
      next();
    } else {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  } else {
    return res.status(401).json({ error: 'Invalid authorization type' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function auditLog(action, modId, userId, details, ipAddress) {
  db.prepare(
    `
    INSERT INTO audit_log (id, action, mod_id, user_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(randomUUID(), action, modId, userId, JSON.stringify(details), ipAddress);
}

// ============================================================================
// API ROUTES
// ============================================================================

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: CONFIG.allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// MODS ENDPOINTS
// ============================================================================

/**
 * GET /api/mods
 * Liste tous les mods (avec pagination et recherche)
 */
app.get('/api/mods', (req, res) => {
  try {
    const {
      query = '',
      category,
      sort = 'downloads',
      order = 'desc',
      page = 1,
      limit = 20,
      verified_only = false,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sortColumn = ['downloads', 'rating', 'updated_at', 'name'].includes(sort)
      ? sort
      : 'downloads';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let sql = `
      SELECT id, name, version, display_name, description, author_name, 
             downloads, rating, verified, enabled, created_at, updated_at
      FROM mods
      WHERE enabled = 1
    `;

    const params = [];

    if (query) {
      sql += ` AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    if (verified_only === 'true') {
      sql += ` AND verified = 1`;
    }

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const mods = db.prepare(sql).all(...params);

    // Total count
    let countSql = `SELECT COUNT(*) as total FROM mods WHERE enabled = 1`;
    if (query) {
      countSql += ` AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)`;
    }
    if (verified_only === 'true') {
      countSql += ` AND verified = 1`;
    }

    const countParams = query ? [`%${query}%`, `%${query}%`, `%${query}%`] : [];
    const { total } = db.prepare(countSql).get(...countParams);

    res.json({
      mods,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[registry] Error listing mods:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mods/:name
 * Obtenir les détails d'un mod
 */
app.get('/api/mods/:name', (req, res) => {
  try {
    const mod = db
      .prepare(
        `
      SELECT * FROM mods WHERE name = ? AND enabled = 1
    `
      )
      .get(req.params.name);

    if (!mod) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    // Ajouter les versions
    const versions = db
      .prepare(
        `
      SELECT version, checksum, size, created_at 
      FROM mod_versions 
      WHERE mod_id = ? 
      ORDER BY created_at DESC
    `
      )
      .all(mod.id);

    // Parser le manifest
    mod.manifest = JSON.parse(mod.manifest);
    mod.versions = versions;

    res.json(mod);
  } catch (err) {
    console.error('[registry] Error getting mod:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mods/:name/download
 * Télécharger un mod
 */
app.get('/api/mods/:name/download', (req, res) => {
  try {
    const version = req.query.version;

    const mod = db
      .prepare(
        `
      SELECT * FROM mods WHERE name = ? AND enabled = 1
    `
      )
      .get(req.params.name);

    if (!mod) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    // Incrémenter le compteur de téléchargements
    db.prepare('UPDATE mods SET downloads = downloads + 1 WHERE id = ?').run(mod.id);

    // Déterminer le chemin du fichier
    const modPath = path.join(CONFIG.modsDir, mod.name, version || mod.version);
    const zipPath = path.join(modPath, `${mod.name}-${version || mod.version}.zip`);

    if (!existsSync(zipPath)) {
      return res.status(404).json({ error: 'Mod package not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${mod.name}-${version || mod.version}.zip"`
    );

    const stream = createReadStream(zipPath);
    stream.pipe(res);
  } catch (err) {
    console.error('[registry] Error downloading mod:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/mods/upload
 * Upload un nouveau mod (authentifié)
 */
app.post('/api/mods/upload', authMiddleware, upload.single('mod'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Décompresser et valider le mod
    const extractDir = path.join(CONFIG.uploadDir, randomUUID());
    await mkdir(extractDir, { recursive: true });

    // Utiliser unzipper ou adm-zip
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(extractDir, true);

    // Charger le manifest
    const manifestPath = path.join(extractDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      await rm(extractDir, { recursive: true });
      await rm(req.file.path);
      return res.status(400).json({ error: 'manifest.json not found in package' });
    }

    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Valider le manifest
    if (!manifest.name || !manifest.version || !manifest.main) {
      await rm(extractDir, { recursive: true });
      await rm(req.file.path);
      return res.status(400).json({ error: 'Invalid manifest: missing required fields' });
    }

    // Calculer le checksum
    const fileBuffer = await readFile(req.file.path);
    const checksum = createHash('sha256').update(fileBuffer).digest('hex');

    // Vérifier si le mod existe déjà
    const existingMod = db.prepare('SELECT * FROM mods WHERE name = ?').get(manifest.name);

    if (existingMod) {
      // Mise à jour
      if (existingMod.version === manifest.version) {
        await rm(extractDir, { recursive: true });
        await rm(req.file.path);
        return res.status(409).json({ error: 'Version already exists' });
      }

      // Ajouter une nouvelle version
      db.prepare(
        `
        INSERT INTO mod_versions (id, mod_id, version, manifest, checksum, size)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(
        randomUUID(),
        existingMod.id,
        manifest.version,
        manifestContent,
        checksum,
        req.file.size
      );

      // Mettre à jour le mod principal
      db.prepare(
        `
        UPDATE mods SET 
          version = ?, 
          manifest = ?, 
          checksum = ?, 
          size = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      ).run(manifest.version, manifestContent, checksum, req.file.size, existingMod.id);
    } else {
      // Nouveau mod
      const modId = randomUUID();

      db.prepare(
        `
        INSERT INTO mods (
          id, name, version, display_name, description, 
          author_name, author_email, manifest, checksum, size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        modId,
        manifest.name,
        manifest.version,
        manifest.display_name || manifest.name,
        manifest.description || '',
        manifest.author?.name || 'Unknown',
        manifest.author?.email || null,
        manifestContent,
        checksum,
        req.file.size
      );

      // Première version
      db.prepare(
        `
        INSERT INTO mod_versions (id, mod_id, version, manifest, checksum, size)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(randomUUID(), modId, manifest.version, manifestContent, checksum, req.file.size);
    }

    // Déplacer le fichier vers le stockage permanent
    const targetDir = path.join(CONFIG.modsDir, manifest.name, manifest.version);
    await mkdir(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, `${manifest.name}-${manifest.version}.zip`);
    await copyFile(req.file.path, targetPath);

    // Nettoyage
    await rm(extractDir, { recursive: true });
    await rm(req.file.path);

    // Audit
    auditLog('upload', manifest.name, req.user.id, { version: manifest.version }, req.ip);

    res.json({
      success: true,
      mod_id: manifest.name,
      version: manifest.version,
      checksum,
    });
  } catch (err) {
    console.error('[registry] Error uploading mod:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Import manquant
import { copyFile } from 'fs/promises';

/**
 * POST /api/mods/:name/enable
 * Activer un mod (admin)
 */
app.post('/api/mods/:name/enable', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const result = db.prepare('UPDATE mods SET enabled = 1 WHERE name = ?').run(req.params.name);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    auditLog('enable', req.params.name, req.user.id, {}, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error('[registry] Error enabling mod:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/mods/:name/disable
 * Désactiver un mod (admin)
 */
app.post('/api/mods/:name/disable', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const result = db.prepare('UPDATE mods SET enabled = 0 WHERE name = ?').run(req.params.name);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    auditLog('disable', req.params.name, req.user.id, {}, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error('[registry] Error disabling mod:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/mods/:name
 * Supprimer un mod (admin)
 */
app.delete('/api/mods/:name', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const mod = db.prepare('SELECT * FROM mods WHERE name = ?').get(req.params.name);

    if (!mod) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    // Supprimer de la DB
    db.prepare('DELETE FROM mod_versions WHERE mod_id = ?').run(mod.id);
    db.prepare('DELETE FROM reviews WHERE mod_id = ?').run(mod.id);
    db.prepare('DELETE FROM mods WHERE id = ?').run(mod.id);

    // Supprimer les fichiers
    const modDir = path.join(CONFIG.modsDir, mod.name);
    if (existsSync(modDir)) {
      await rm(modDir, { recursive: true });
    }

    auditLog('delete', req.params.name, req.user.id, {}, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error('[registry] Error deleting mod:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

/**
 * POST /api/webhook/ci
 * Webhook pour CI/CD
 */
app.post('/api/webhook/ci', (req, res) => {
  try {
    // Vérifier le secret
    const signature = req.headers['x-webhook-signature'];
    const expectedSignature = createHash('sha256')
      .update(CONFIG.webhookSecret + JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { event, mod_name, version, status, details } = req.body;

    console.log(`[registry] CI webhook: ${event} for ${mod_name}@${version}`);

    // Mettre à jour le statut de vérification
    if (event === 'validation_complete' && status === 'passed') {
      db.prepare('UPDATE mods SET verified = 1 WHERE name = ?').run(mod_name);
    }

    auditLog('webhook', mod_name, 'ci', { event, status, details }, req.ip);
    res.json({ received: true });
  } catch (err) {
    console.error('[registry] Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Vérifier le mot de passe (en production, utiliser bcrypt)
    const passwordHash = createHash('sha256').update(password).digest('hex');
    if (user.password_hash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Générer le JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      CONFIG.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[registry] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * Inscription utilisateur
 */
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Vérifier si l'utilisateur existe
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Créer l'utilisateur
    const userId = randomUUID();
    const passwordHash = createHash('sha256').update(password).digest('hex');

    db.prepare(
      `
      INSERT INTO users (id, username, password_hash, email)
      VALUES (?, ?, ?, ?)
    `
    ).run(userId, username, passwordHash, email || null);

    res.json({
      success: true,
      user: { id: userId, username },
    });
  } catch (err) {
    console.error('[registry] Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/api-key
 * Générer une API key
 */
app.post('/api/auth/api-key', authMiddleware, (req, res) => {
  try {
    const { name, permissions } = req.body;

    const key = randomUUID() + '-' + randomUUID();
    const keyHash = createHash('sha256').update(key).digest('hex');

    db.prepare(
      `
      INSERT INTO api_keys (id, user_id, key_hash, name, permissions)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(randomUUID(), req.user.id, keyHash, name || 'API Key', JSON.stringify(permissions || []));

    res.json({
      key,
      warning: 'Store this key securely. It will not be shown again.',
    });
  } catch (err) {
    console.error('[registry] API key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[registry] Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============================================================================
// OPENAPI SPEC
// ============================================================================

app.get('/api/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'LUCA Mod Registry API',
      version: '1.0.0',
      description: 'API for managing LUCA mods',
    },
    servers: [{ url: `http://localhost:${CONFIG.port}`, description: 'Local development' }],
    paths: {
      '/api/mods': {
        get: {
          summary: 'List mods',
          parameters: [
            { name: 'query', in: 'query', schema: { type: 'string' } },
            {
              name: 'sort',
              in: 'query',
              schema: { type: 'string', enum: ['downloads', 'rating', 'updated_at', 'name'] },
            },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'List of mods' } },
        },
      },
      '/api/mods/{name}': {
        get: {
          summary: 'Get mod details',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Mod details' }, 404: { description: 'Mod not found' } },
        },
      },
      '/api/mods/{name}/download': {
        get: {
          summary: 'Download mod',
          parameters: [
            { name: 'name', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'version', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Mod package (zip)' } },
        },
      },
      '/api/mods/upload': {
        post: {
          summary: 'Upload mod',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { mod: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Upload result' } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'Authorization' },
      },
    },
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  // Créer les dossiers
  await mkdir(CONFIG.uploadDir, { recursive: true });
  await mkdir(CONFIG.modsDir, { recursive: true });

  // Initialiser la DB
  await initDatabase();

  // Créer un admin par défaut si aucun utilisateur
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const adminId = randomUUID();
    const passwordHash = createHash('sha256').update('admin').digest('hex');
    db.prepare(
      `
      INSERT INTO users (id, username, password_hash, role)
      VALUES (?, 'admin', ?, 'admin')
    `
    ).run(adminId, passwordHash);
    console.log('[registry] Default admin user created (username: admin, password: admin)');
  }

  app.listen(CONFIG.port, CONFIG.host, () => {
    console.log(`[registry] Server running on http://${CONFIG.host}:${CONFIG.port}`);
    console.log(`[registry] OpenAPI spec: http://${CONFIG.host}:${CONFIG.port}/api/openapi.json`);
  });
}

start().catch((err) => {
  console.error('[registry] Failed to start:', err);
  process.exit(1);
});

export { app, CONFIG };
