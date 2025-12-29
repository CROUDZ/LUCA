/**
 * LUCA Modding System - Integration avec l'engine LUCA
 *
 * Ce fichier connecte le système de modding avec l'engine existant
 * de LUCA pour enregistrer les nodes des mods dans le NodeRegistry.
 *
 * @module mods/integration
 */

import { ModLoader } from './core/loader.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Singleton du loader
let modLoader = null;

/**
 * Initialise le système de modding et l'intègre avec l'engine LUCA
 * @param {Object} options Configuration
 * @param {Object} options.nodeRegistry Instance du NodeRegistry LUCA
 * @param {Object} options.engine Instance de l'engine LUCA
 * @returns {Promise<ModLoader>}
 */
export async function initializeModSystem(options = {}) {
  const { nodeRegistry, engine } = options;

  if (modLoader) {
    console.warn('[mods] Mod system already initialized');
    return modLoader;
  }

  // Créer le loader
  modLoader = new ModLoader({
    modsDirectory: path.join(__dirname, 'installed'),
    storageDir: path.join(__dirname, 'storage'),
  });

  // Écouter les événements du loader
  modLoader.on('modStatusChanged', ({ name, status, error }) => {
    console.log(`[mods] ${name}: ${status}${error ? ` - ${error}` : ''}`);

    // Enregistrer les nodes quand un mod devient actif
    if (status === 'active' && nodeRegistry) {
      registerModNodes(name, nodeRegistry);
    }

    // Désenregistrer les nodes quand un mod devient inactif
    if (status === 'disabled' || status === 'error') {
      unregisterModNodes(name, nodeRegistry);
    }
  });

  modLoader.on('modEmit', ({ name, output, value }) => {
    // Transmettre les émissions à l'engine
    if (engine) {
      engine.handleModEmit(name, output, value);
    }
  });

  modLoader.on('modLogs', ({ name, entries }) => {
    // Logger les messages du mod
    entries.forEach((entry) => {
      const prefix = `[mod:${name}]`;
      switch (entry.level) {
        case 'debug':
          console.log(prefix, entry.message, entry.data || '');
          break;
        case 'info':
          console.log(prefix, entry.message, entry.data || '');
          break;
        case 'warn':
          console.warn(prefix, entry.message, entry.data || '');
          break;
        case 'error':
          console.error(prefix, entry.message, entry.data || '');
          break;
      }
    });
  });

  modLoader.on('modError', ({ name, type, message }) => {
    console.error(`[mods] Error in ${name}: ${type} - ${message}`);
  });

  modLoader.on('modCrashed', ({ name, restarts }) => {
    console.error(`[mods] ${name} crashed after ${restarts} restart attempts`);
  });

  // Initialiser
  await modLoader.initialize();

  console.log(`[mods] Mod system initialized, found ${modLoader.listMods().length} mods`);

  return modLoader;
}

/**
 * Enregistre les nodes d'un mod dans le NodeRegistry
 * @param {string} modName
 * @param {Object} nodeRegistry
 */
function registerModNodes(modName, nodeRegistry) {
  if (!nodeRegistry) return;

  const mod = modLoader.mods.get(modName);
  if (!mod || !mod.manifest.node_types) return;

  for (const nodeType of mod.manifest.node_types) {
    const fullType = `mod:${modName}:${nodeType.type}`;

    // Créer un handler qui appelle le mod
    const handler = async (nodeId, inputs, config, context) => {
      try {
        const result = await modLoader.runNode(modName, nodeId, nodeType.type, inputs, config);
        return result.outputs;
      } catch (error) {
        console.error(`[mods] Error running ${fullType}:`, error);
        throw error;
      }
    };

    // Enregistrer dans le registry
    nodeRegistry.registerNode({
      type: fullType,
      label: nodeType.label,
      category: `Mods / ${nodeType.category || modName}`,
      description: nodeType.description || `From mod: ${modName}`,
      inputs: nodeType.inputs || [],
      outputs: nodeType.outputs || [],
      config: nodeType.config || {},
      color: nodeType.color,
      icon: nodeType.icon,
      handler,
      source: 'mod',
      modName,
      modVersion: mod.manifest.version,
    });

    console.log(`[mods] Registered node: ${fullType}`);
  }
}

/**
 * Désenregistre les nodes d'un mod
 * @param {string} modName
 * @param {Object} nodeRegistry
 */
function unregisterModNodes(modName, nodeRegistry) {
  if (!nodeRegistry) return;

  const mod = modLoader.mods.get(modName);
  if (!mod || !mod.manifest.node_types) return;

  for (const nodeType of mod.manifest.node_types) {
    const fullType = `mod:${modName}:${nodeType.type}`;
    nodeRegistry.unregisterNode(fullType);
    console.log(`[mods] Unregistered node: ${fullType}`);
  }
}

/**
 * Obtenir le loader de mods
 * @returns {ModLoader|null}
 */
export function getModLoader() {
  return modLoader;
}

/**
 * Activer un mod
 * @param {string} modName
 */
export async function activateMod(modName) {
  if (!modLoader) {
    throw new Error('Mod system not initialized');
  }
  return modLoader.activateMod(modName);
}

/**
 * Désactiver un mod
 * @param {string} modName
 */
export async function deactivateMod(modName) {
  if (!modLoader) {
    throw new Error('Mod system not initialized');
  }
  return modLoader.deactivateMod(modName);
}

/**
 * Lister tous les mods
 */
export function listMods() {
  if (!modLoader) {
    return [];
  }
  return modLoader.listMods();
}

/**
 * Obtenir tous les types de nodes des mods actifs
 */
export function getModNodeTypes() {
  if (!modLoader) {
    return [];
  }
  return modLoader.getAllNodeTypes();
}

/**
 * Arrêter le système de modding
 */
export async function shutdownModSystem() {
  if (modLoader) {
    await modLoader.shutdown();
    modLoader = null;
  }
}

export default {
  initializeModSystem,
  getModLoader,
  activateMod,
  deactivateMod,
  listMods,
  getModNodeTypes,
  shutdownModSystem,
};
