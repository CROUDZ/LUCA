/**
 * LUCA Modding System - Mod Loader
 * Node.js 18+ ESM
 *
 * Gère le chargement, l'activation et la communication avec les mods
 * via des processus enfants isolés.
 *
 * Dépendances: npm install uuid
 *
 * @module core/loader
 */

import { fork } from 'child_process';
import { readFile, readdir, stat, mkdir, rm, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  modsDirectory: path.join(__dirname, '..', 'installed'),
  runnerPath: path.join(__dirname, 'runner.mjs'),
  defaultTimeout: 3000,
  maxMemoryMB: 128,
  maxRestarts: 3,
  restartCooldown: 5000,
  pingInterval: 30000,
  storageDir: path.join(__dirname, '..', 'storage'),
};

// ============================================================================
// TYPES (JSDoc)
// ============================================================================

/**
 * @typedef {Object} LoadedMod
 * @property {Object} manifest
 * @property {string} path
 * @property {'installed'|'loading'|'active'|'error'|'disabled'} status
 * @property {RunnerHandle|null} runner
 * @property {number} loadedAt
 * @property {string|null} lastError
 * @property {number} restartCount
 */

/**
 * @typedef {Object} RunnerHandle
 * @property {number} pid
 * @property {import('child_process').ChildProcess} process
 * @property {number} startedAt
 * @property {number} requestCount
 * @property {Map<string, PendingRequest>} pendingRequests
 */

/**
 * @typedef {Object} PendingRequest
 * @property {Function} resolve
 * @property {Function} reject
 * @property {NodeJS.Timeout} timeout
 * @property {number} startedAt
 */

// ============================================================================
// MOD LOADER CLASS
// ============================================================================

export class ModLoader extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = { ...CONFIG, ...options };
    this.mods = new Map(); // name -> LoadedMod
    this.storage = new Map(); // name -> storage data
    this.pingIntervals = new Map();
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Initialise le loader et charge les mods installés
   */
  async initialize() {
    // Créer les dossiers si nécessaires
    await mkdir(this.config.modsDirectory, { recursive: true });
    await mkdir(this.config.storageDir, { recursive: true });

    // Scanner et charger les mods
    await this.scanMods();

    this.emit('initialized', { modCount: this.mods.size });
  }

  /**
   * Scanner le dossier des mods et charger les manifests
   */
  async scanMods() {
    const entries = await readdir(this.config.modsDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const modPath = path.join(this.config.modsDirectory, entry.name);
      const manifestPath = path.join(modPath, 'manifest.json');

      if (!existsSync(manifestPath)) {
        console.warn(`[loader] No manifest.json in ${entry.name}, skipping`);
        continue;
      }

      try {
        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        this.mods.set(manifest.name, {
          manifest,
          path: modPath,
          status: 'installed',
          runner: null,
          loadedAt: 0,
          lastError: null,
          restartCount: 0,
        });

        console.log(`[loader] Found mod: ${manifest.name}@${manifest.version}`);
      } catch (err) {
        console.error(`[loader] Failed to parse manifest for ${entry.name}:`, err.message);
      }
    }
  }

  /**
   * Activer un mod (fork le runner)
   * @param {string} modName
   */
  async activateMod(modName) {
    const mod = this.mods.get(modName);
    if (!mod) {
      throw new Error(`Mod not found: ${modName}`);
    }

    if (mod.status === 'active') {
      console.log(`[loader] Mod ${modName} already active`);
      return;
    }

    mod.status = 'loading';
    this.emit('modStatusChanged', { name: modName, status: 'loading' });

    try {
      // Charger le storage du mod
      await this.loadModStorage(modName);

      // Fork le runner
      const runner = await this.forkRunner(mod);
      mod.runner = runner;

      // Initialiser le mod
      await this.sendToRunner(modName, 'init', {
        modPath: mod.path,
        manifest: mod.manifest,
        storage: Object.fromEntries(this.storage.get(modName) || new Map()),
        permissions: mod.manifest.permissions || [],
      });

      mod.status = 'active';
      mod.loadedAt = Date.now();
      mod.restartCount = 0;

      // Démarrer le ping
      this.startPing(modName);

      this.emit('modStatusChanged', { name: modName, status: 'active' });
      console.log(`[loader] Mod ${modName} activated successfully`);
    } catch (err) {
      mod.status = 'error';
      mod.lastError = err.message;
      this.emit('modStatusChanged', { name: modName, status: 'error', error: err.message });
      throw err;
    }
  }

  /**
   * Désactiver un mod
   * @param {string} modName
   */
  async deactivateMod(modName) {
    const mod = this.mods.get(modName);
    if (!mod) {
      throw new Error(`Mod not found: ${modName}`);
    }

    if (mod.status !== 'active') {
      console.log(`[loader] Mod ${modName} not active`);
      return;
    }

    try {
      // Appeler onUnload
      await this.sendToRunner(modName, 'unload', {}, 5000);
    } catch (err) {
      console.warn(`[loader] Error during unload of ${modName}:`, err.message);
    }

    // Arrêter le ping
    this.stopPing(modName);

    // Sauvegarder le storage
    await this.saveModStorage(modName);

    // Kill le processus
    if (mod.runner && mod.runner.process) {
      mod.runner.process.kill();
    }

    mod.runner = null;
    mod.status = 'disabled';

    this.emit('modStatusChanged', { name: modName, status: 'disabled' });
    console.log(`[loader] Mod ${modName} deactivated`);
  }

  /**
   * Exécuter un node d'un mod
   * @param {string} modName
   * @param {string} nodeId
   * @param {string} nodeType
   * @param {Object} inputs
   * @param {Object} config
   * @returns {Promise<Object>}
   */
  async runNode(modName, nodeId, nodeType, inputs, config = {}) {
    const mod = this.mods.get(modName);
    if (!mod) {
      throw new Error(`Mod not found: ${modName}`);
    }

    if (mod.status !== 'active') {
      throw new Error(`Mod ${modName} is not active (status: ${mod.status})`);
    }

    const executionId = randomUUID();

    const result = await this.sendToRunner(modName, 'run', {
      nodeId,
      nodeType,
      inputs,
      config,
      context: {
        executionId,
        timestamp: Date.now(),
        timeout: this.config.defaultTimeout,
      },
    });

    this.emit('nodeExecuted', {
      modName,
      nodeId,
      nodeType,
      executionId,
      duration: result.duration,
      success: true,
    });

    return result;
  }

  /**
   * Obtenir les types de nodes d'un mod
   * @param {string} modName
   */
  async getNodeTypes(modName) {
    const mod = this.mods.get(modName);
    if (!mod) {
      throw new Error(`Mod not found: ${modName}`);
    }

    return mod.manifest.node_types || [];
  }

  /**
   * Obtenir tous les types de nodes de tous les mods actifs
   */
  getAllNodeTypes() {
    const allTypes = [];

    for (const [modName, mod] of this.mods) {
      if (mod.status === 'active' && mod.manifest.node_types) {
        for (const nodeType of mod.manifest.node_types) {
          allTypes.push({
            ...nodeType,
            modName,
            modVersion: mod.manifest.version,
            fullType: `${modName}:${nodeType.type}`,
          });
        }
      }
    }

    return allTypes;
  }

  /**
   * Lister tous les mods
   */
  listMods() {
    const list = [];

    for (const [name, mod] of this.mods) {
      list.push({
        name,
        version: mod.manifest.version,
        displayName: mod.manifest.display_name,
        description: mod.manifest.description,
        author: mod.manifest.author,
        status: mod.status,
        loadedAt: mod.loadedAt,
        lastError: mod.lastError,
        nodeTypes: (mod.manifest.node_types || []).map((n) => n.type),
        permissions: mod.manifest.permissions || [],
      });
    }

    return list;
  }

  /**
   * Installer un mod depuis un chemin
   * @param {string} sourcePath - Chemin vers le dossier du mod
   */
  async installMod(sourcePath) {
    const manifestPath = path.join(sourcePath, 'manifest.json');

    if (!existsSync(manifestPath)) {
      throw new Error('No manifest.json found in mod package');
    }

    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Valider le manifest (basique)
    if (!manifest.name || !manifest.version || !manifest.main) {
      throw new Error('Invalid manifest: missing required fields');
    }

    // Vérifier si déjà installé
    if (this.mods.has(manifest.name)) {
      const existing = this.mods.get(manifest.name);
      if (existing.status === 'active') {
        throw new Error(`Mod ${manifest.name} is currently active. Deactivate it first.`);
      }
    }

    // Copier vers le dossier des mods
    const destPath = path.join(this.config.modsDirectory, manifest.name);

    // Supprimer l'ancien si existe
    if (existsSync(destPath)) {
      await rm(destPath, { recursive: true });
    }

    await mkdir(destPath, { recursive: true });

    // Copier les fichiers
    await this.copyDirectory(sourcePath, destPath);

    // Enregistrer le mod
    this.mods.set(manifest.name, {
      manifest,
      path: destPath,
      status: 'installed',
      runner: null,
      loadedAt: 0,
      lastError: null,
      restartCount: 0,
    });

    this.emit('modInstalled', { name: manifest.name, version: manifest.version });
    console.log(`[loader] Mod ${manifest.name}@${manifest.version} installed`);

    return manifest;
  }

  /**
   * Désinstaller un mod
   * @param {string} modName
   */
  async uninstallMod(modName) {
    const mod = this.mods.get(modName);
    if (!mod) {
      throw new Error(`Mod not found: ${modName}`);
    }

    // Désactiver si actif
    if (mod.status === 'active') {
      await this.deactivateMod(modName);
    }

    // Supprimer les fichiers
    await rm(mod.path, { recursive: true });

    // Supprimer le storage
    const storagePath = path.join(this.config.storageDir, `${modName}.json`);
    if (existsSync(storagePath)) {
      await rm(storagePath);
    }

    this.mods.delete(modName);
    this.storage.delete(modName);

    this.emit('modUninstalled', { name: modName });
    console.log(`[loader] Mod ${modName} uninstalled`);
  }

  /**
   * Recharger un mod
   * @param {string} modName
   */
  async reloadMod(modName) {
    const mod = this.mods.get(modName);
    if (!mod) {
      throw new Error(`Mod not found: ${modName}`);
    }

    const wasActive = mod.status === 'active';

    if (wasActive) {
      await this.deactivateMod(modName);
    }

    // Recharger le manifest
    const manifestContent = await readFile(path.join(mod.path, 'manifest.json'), 'utf-8');
    mod.manifest = JSON.parse(manifestContent);
    mod.status = 'installed';
    mod.lastError = null;

    if (wasActive) {
      await this.activateMod(modName);
    }

    this.emit('modReloaded', { name: modName });
    console.log(`[loader] Mod ${modName} reloaded`);
  }

  /**
   * Arrêter le loader et tous les mods
   */
  async shutdown() {
    console.log('[loader] Shutting down...');

    for (const [modName, mod] of this.mods) {
      if (mod.status === 'active') {
        try {
          await this.deactivateMod(modName);
        } catch (err) {
          console.error(`[loader] Error deactivating ${modName}:`, err.message);
        }
      }
    }

    this.emit('shutdown');
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Fork un nouveau processus runner
   * @param {LoadedMod} mod
   * @returns {Promise<RunnerHandle>}
   */
  async forkRunner(mod) {
    return new Promise((resolve, reject) => {
      const childProcess = fork(this.config.runnerPath, [], {
        execArgv: [
          '--experimental-vm-modules',
          `--max-old-space-size=${this.config.maxMemoryMB}`,
          '--unhandled-rejections=strict',
        ],
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          MOD_NAME: mod.manifest.name,
          MOD_VERSION: mod.manifest.version,
          NODE_ENV: 'production',
        },
      });

      const runner = {
        pid: childProcess.pid,
        process: childProcess,
        startedAt: Date.now(),
        requestCount: 0,
        pendingRequests: new Map(),
      };

      // Capturer stdout/stderr
      childProcess.stdout.on('data', (data) => {
        this.emit('modLog', { name: mod.manifest.name, stream: 'stdout', data: data.toString() });
      });

      childProcess.stderr.on('data', (data) => {
        this.emit('modLog', { name: mod.manifest.name, stream: 'stderr', data: data.toString() });
      });

      // Gérer les messages IPC
      childProcess.on('message', (message) => {
        this.handleRunnerMessage(mod.manifest.name, runner, message);
      });

      // Gérer la fin du processus
      childProcess.on('exit', (code, signal) => {
        console.log(
          `[loader] Runner for ${mod.manifest.name} exited (code: ${code}, signal: ${signal})`
        );
        this.handleRunnerExit(mod.manifest.name, code, signal);
      });

      childProcess.on('error', (err) => {
        console.error(`[loader] Runner error for ${mod.manifest.name}:`, err);
        reject(err);
      });

      // Attendre le message 'ready'
      const readyTimeout = setTimeout(() => {
        reject(new Error('Runner failed to start (timeout)'));
      }, 10000);

      const readyHandler = (message) => {
        if (message.method === 'ready') {
          clearTimeout(readyTimeout);
          childProcess.removeListener('message', readyHandler);
          resolve(runner);
        }
      };

      childProcess.on('message', readyHandler);
    });
  }

  /**
   * Envoyer une requête au runner
   * @param {string} modName
   * @param {string} method
   * @param {Object} params
   * @param {number} timeout
   * @returns {Promise<any>}
   */
  async sendToRunner(modName, method, params, timeout = this.config.defaultTimeout) {
    const mod = this.mods.get(modName);
    if (!mod || !mod.runner) {
      throw new Error(`No runner for mod: ${modName}`);
    }

    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timeoutHandle = setTimeout(() => {
        mod.runner.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeout);

      mod.runner.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
        startedAt: Date.now(),
      });

      mod.runner.requestCount++;

      mod.runner.process.send({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });
    });
  }

  /**
   * Gérer un message du runner
   * @param {string} modName
   * @param {RunnerHandle} runner
   * @param {Object} message
   */
  handleRunnerMessage(modName, runner, message) {
    // Réponse à une requête
    if (message.id && runner.pendingRequests.has(message.id)) {
      const pending = runner.pendingRequests.get(message.id);
      runner.pendingRequests.delete(message.id);
      clearTimeout(pending.timeout);

      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    // Notification
    if (message.method) {
      this.handleRunnerNotification(modName, message.method, message.params);
    }
  }

  /**
   * Gérer une notification du runner
   * @param {string} modName
   * @param {string} method
   * @param {Object} params
   */
  handleRunnerNotification(modName, method, params) {
    switch (method) {
      case 'logs':
        this.emit('modLogs', { name: modName, entries: params.entries });
        break;

      case 'storage.set':
        this.handleStorageSet(modName, params.key, params.value);
        break;

      case 'storage.delete':
        this.handleStorageDelete(modName, params.key);
        break;

      case 'emit':
        this.emit('modEmit', { name: modName, output: params.output, value: params.value });
        break;

      case 'error':
        console.error(`[loader] Error from ${modName}:`, params);
        this.emit('modError', { name: modName, ...params });
        break;

      case 'ready':
        // Déjà géré dans forkRunner
        break;

      default:
        console.warn(`[loader] Unknown notification from ${modName}: ${method}`);
    }
  }

  /**
   * Gérer la sortie du runner
   * @param {string} modName
   * @param {number} code
   * @param {string} signal
   */
  handleRunnerExit(modName, code, signal) {
    const mod = this.mods.get(modName);
    if (!mod) return;

    // Rejeter toutes les requêtes en attente
    if (mod.runner) {
      for (const [id, pending] of mod.runner.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Runner process exited'));
      }
    }

    this.stopPing(modName);

    // Crash recovery si c'était actif
    if (mod.status === 'active' && code !== 0) {
      mod.status = 'error';
      mod.lastError = `Runner crashed (code: ${code}, signal: ${signal})`;
      mod.runner = null;

      // Tenter un restart si pas trop de restarts
      if (mod.restartCount < this.config.maxRestarts) {
        mod.restartCount++;
        console.log(
          `[loader] Attempting restart ${mod.restartCount}/${this.config.maxRestarts} for ${modName}`
        );

        setTimeout(async () => {
          try {
            await this.activateMod(modName);
          } catch (err) {
            console.error(`[loader] Restart failed for ${modName}:`, err.message);
          }
        }, this.config.restartCooldown);
      } else {
        console.error(`[loader] Max restarts reached for ${modName}, giving up`);
        this.emit('modCrashed', { name: modName, restarts: mod.restartCount });
      }
    }
  }

  /**
   * Gérer le storage set
   * @param {string} modName
   * @param {string} key
   * @param {any} value
   */
  handleStorageSet(modName, key, value) {
    if (!this.storage.has(modName)) {
      this.storage.set(modName, new Map());
    }
    this.storage.get(modName).set(key, value);

    // Sauvegarder de manière asynchrone (debounced serait mieux)
    this.saveModStorage(modName).catch((err) => {
      console.error(`[loader] Failed to save storage for ${modName}:`, err.message);
    });
  }

  /**
   * Gérer le storage delete
   * @param {string} modName
   * @param {string} key
   */
  handleStorageDelete(modName, key) {
    if (this.storage.has(modName)) {
      this.storage.get(modName).delete(key);
    }

    this.saveModStorage(modName).catch((err) => {
      console.error(`[loader] Failed to save storage for ${modName}:`, err.message);
    });
  }

  /**
   * Charger le storage d'un mod
   * @param {string} modName
   */
  async loadModStorage(modName) {
    const storagePath = path.join(this.config.storageDir, `${modName}.json`);

    if (!existsSync(storagePath)) {
      this.storage.set(modName, new Map());
      return;
    }

    try {
      const content = await readFile(storagePath, 'utf-8');
      const data = JSON.parse(content);
      this.storage.set(modName, new Map(Object.entries(data)));
    } catch (err) {
      console.error(`[loader] Failed to load storage for ${modName}:`, err.message);
      this.storage.set(modName, new Map());
    }
  }

  /**
   * Sauvegarder le storage d'un mod
   * @param {string} modName
   */
  async saveModStorage(modName) {
    const storage = this.storage.get(modName);
    if (!storage) return;

    const storagePath = path.join(this.config.storageDir, `${modName}.json`);
    const data = Object.fromEntries(storage);

    await mkdir(this.config.storageDir, { recursive: true });
    await writeFile(storagePath, JSON.stringify(data, null, 2));
  }

  /**
   * Démarrer le ping pour un mod
   * @param {string} modName
   */
  startPing(modName) {
    const interval = setInterval(async () => {
      try {
        await this.sendToRunner(modName, 'ping', {}, 5000);
      } catch (err) {
        console.warn(`[loader] Ping failed for ${modName}:`, err.message);
      }
    }, this.config.pingInterval);

    this.pingIntervals.set(modName, interval);
  }

  /**
   * Arrêter le ping pour un mod
   * @param {string} modName
   */
  stopPing(modName) {
    const interval = this.pingIntervals.get(modName);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(modName);
    }
  }

  /**
   * Copier un dossier récursivement
   * @param {string} src
   * @param {string} dest
   */
  async copyDirectory(src, dest) {
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }
}

// Import manquant
import { writeFile } from 'fs/promises';

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let loaderInstance = null;

export function getModLoader(options) {
  if (!loaderInstance) {
    loaderInstance = new ModLoader(options);
  }
  return loaderInstance;
}

export default ModLoader;
