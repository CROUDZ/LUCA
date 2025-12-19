/**
 * LUCA Modding System - Sandbox Runner Process
 * Node.js 18+ ESM
 *
 * Ce fichier est exécuté dans un processus enfant isolé via child_process.fork()
 * Il charge le mod et communique avec le core via IPC (JSON-RPC 2.0)
 *
 * Lancer avec: node --experimental-vm-modules --max-old-space-size=128 runner.mjs
 *
 * @module core/runner
 */

import { pathToFileURL } from 'url';
import { readFile } from 'fs/promises';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  maxExecutionTime: 3000, // Timeout par défaut pour run() en ms
  maxStorageSize: 10 * 1024 * 1024, // 10MB max storage
  logBufferSize: 100, // Max logs en mémoire avant flush
};

// ============================================================================
// ÉTAT DU RUNNER
// ============================================================================

const state = {
  modPath: null,
  manifest: null,
  module: null,
  permissions: new Set(),
  storage: new Map(),
  logBuffer: [],
  initialized: false,
  shutdownRequested: false,
};

// ============================================================================
// API RUNTIME (exposée au mod)
// ============================================================================

function createRuntimeAPI(requestId) {
  return {
    mod: {
      name: state.manifest?.name || 'unknown',
      version: state.manifest?.version || '0.0.0',
    },

    // Storage API
    storage: {
      async get(key) {
        assertPermission('storage.read');
        return state.storage.get(key);
      },

      async set(key, value) {
        assertPermission('storage.write');
        // Vérifier la taille totale
        const serialized = JSON.stringify(value);
        if (serialized.length > CONFIG.maxStorageSize) {
          throw new Error(`Storage value too large: ${serialized.length} bytes`);
        }
        state.storage.set(key, value);
        // Notifier le core pour persister
        sendNotification('storage.set', { key, value });
      },

      async delete(key) {
        assertPermission('storage.write');
        state.storage.delete(key);
        sendNotification('storage.delete', { key });
      },

      async list() {
        assertPermission('storage.read');
        return Array.from(state.storage.keys());
      },
    },

    // Logging API
    log: {
      debug: (message, data) => addLog('debug', message, data, requestId),
      info: (message, data) => addLog('info', message, data, requestId),
      warn: (message, data) => addLog('warn', message, data, requestId),
      error: (message, data) => addLog('error', message, data, requestId),
    },

    // HTTP API (si permission accordée)
    http: state.permissions.has('network.http')
      ? {
          async request(url, options = {}) {
            assertPermission('network.http');
            // Déléguer au core qui fait le fetch réel
            return await sendRequest('http.request', { url, options });
          },
        }
      : undefined,

    // Emit signal vers les outputs
    emit(output, value) {
      sendNotification('emit', { output, value });
    },

    // Configuration du node courant
    config: {},
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function assertPermission(permission) {
  if (!state.permissions.has(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

function addLog(level, message, data, requestId) {
  const entry = {
    level,
    message: String(message),
    data: data !== undefined ? sanitizeLogData(data) : undefined,
    timestamp: Date.now(),
    requestId,
  };

  state.logBuffer.push(entry);

  // Flush si buffer plein
  if (state.logBuffer.length >= CONFIG.logBufferSize) {
    flushLogs();
  }

  // Aussi écrire en console pour debug
  const prefix = `[${state.manifest?.name || 'mod'}]`;
  console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, data || '');
}

function sanitizeLogData(data) {
  try {
    // Limiter la taille des données loggées
    const str = JSON.stringify(data);
    if (str.length > 1024) {
      return { _truncated: true, preview: str.substring(0, 1024) + '...' };
    }
    return data;
  } catch {
    return { _error: 'Could not serialize log data' };
  }
}

function flushLogs() {
  if (state.logBuffer.length > 0) {
    sendNotification('logs', { entries: state.logBuffer });
    state.logBuffer = [];
  }
}

// ============================================================================
// IPC COMMUNICATION (JSON-RPC 2.0)
// ============================================================================

let requestIdCounter = 0;
const pendingRequests = new Map();

function sendResponse(id, result) {
  process.send({
    jsonrpc: '2.0',
    id,
    result,
  });
}

function sendError(id, code, message, data) {
  process.send({
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  });
}

function sendNotification(method, params) {
  process.send({
    jsonrpc: '2.0',
    method,
    params,
  });
}

async function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const id = `runner-${++requestIdCounter}`;
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Request timeout: ${method}`));
    }, CONFIG.maxExecutionTime);

    pendingRequests.set(id, { resolve, reject, timeout });

    process.send({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });
  });
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

async function handleInit(params) {
  const { modPath, manifest, storage, permissions } = params;

  state.modPath = modPath;
  state.manifest = manifest;
  state.permissions = new Set(permissions || []);

  // Restaurer le storage
  if (storage && typeof storage === 'object') {
    Object.entries(storage).forEach(([key, value]) => {
      state.storage.set(key, value);
    });
  }

  // Charger le module du mod
  const mainPath = path.join(modPath, manifest.main);
  const mainUrl = pathToFileURL(mainPath).href;

  try {
    state.module = await import(mainUrl);
  } catch (err) {
    throw new Error(`Failed to load mod module: ${err.message}`);
  }

  // Appeler nodeInit si défini
  if (typeof state.module.nodeInit === 'function') {
    const api = createRuntimeAPI('init');
    await state.module.nodeInit(api);
  }

  state.initialized = true;

  return {
    success: true,
    nodeTypes: manifest.node_types?.map((n) => n.type) || [],
  };
}

async function handleRun(params) {
  if (!state.initialized) {
    throw new Error('Mod not initialized');
  }

  const { nodeId, nodeType, inputs, config, context } = params;
  const startTime = Date.now();
  const requestId = context?.executionId || `run-${Date.now()}`;

  // Reset log buffer pour cette exécution
  state.logBuffer = [];

  const api = createRuntimeAPI(requestId);
  api.config = config || {};

  // Exécuter avec timeout
  const timeout = context?.timeout || CONFIG.maxExecutionTime;

  let result;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout);
  });

  if (typeof state.module.run !== 'function') {
    throw new Error('Mod does not export run() function');
  }

  result = await Promise.race([
    state.module.run({ nodeId, nodeType, inputs, config }, api),
    timeoutPromise,
  ]);

  const duration = Date.now() - startTime;

  // Flush remaining logs
  flushLogs();

  return {
    outputs: result?.outputs || {},
    logs: state.logBuffer,
    duration,
  };
}

async function handleUnload() {
  state.shutdownRequested = true;

  if (state.module && typeof state.module.onUnload === 'function') {
    const api = createRuntimeAPI('unload');
    await state.module.onUnload(api);
  }

  flushLogs();

  return { success: true };
}

async function handlePing() {
  return {
    pong: true,
    initialized: state.initialized,
    modName: state.manifest?.name,
    uptime: process.uptime(),
  };
}

async function handleGetNodeTypes() {
  return {
    nodeTypes: state.manifest?.node_types || [],
  };
}

// ============================================================================
// MAIN MESSAGE LOOP
// ============================================================================

process.on('message', async (message) => {
  // Gérer les réponses aux requêtes sortantes
  if (message.id && pendingRequests.has(message.id)) {
    const pending = pendingRequests.get(message.id);
    pendingRequests.delete(message.id);
    clearTimeout(pending.timeout);

    if (message.error) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result);
    }
    return;
  }

  // Gérer les requêtes entrantes
  if (!message.jsonrpc || message.jsonrpc !== '2.0') {
    console.error('[runner] Invalid message format:', message);
    return;
  }

  const { id, method, params } = message;

  try {
    let result;

    switch (method) {
      case 'init':
        result = await handleInit(params);
        break;
      case 'run':
        result = await handleRun(params);
        break;
      case 'unload':
        result = await handleUnload();
        break;
      case 'ping':
        result = await handlePing();
        break;
      case 'getNodeTypes':
        result = await handleGetNodeTypes();
        break;
      default:
        sendError(id, -32601, `Method not found: ${method}`);
        return;
    }

    sendResponse(id, result);

    // Shutdown après unload
    if (method === 'unload') {
      setTimeout(() => process.exit(0), 100);
    }
  } catch (err) {
    console.error(`[runner] Error handling ${method}:`, err);
    sendError(id, -32000, err.message, { stack: err.stack });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('uncaughtException', (err) => {
  console.error('[runner] Uncaught exception:', err);
  sendNotification('error', {
    type: 'uncaughtException',
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[runner] Unhandled rejection:', reason);
  sendNotification('error', {
    type: 'unhandledRejection',
    message: String(reason),
    stack: reason?.stack,
  });
});

// ============================================================================
// STARTUP
// ============================================================================

console.log('[runner] Sandbox runner started, PID:', process.pid);
sendNotification('ready', { pid: process.pid });
