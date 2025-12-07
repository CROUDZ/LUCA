/**
 * ModStorage - Service de gestion des mods installés
 * Stocke les mods localement et les rend disponibles dans le NodeRegistry
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nodeRegistry } from '../engine/NodeRegistry';
import { logger } from './logger';
import { getSignalSystem, Signal, SignalPropagation } from '../engine/SignalSystem';

const INSTALLED_MODS_KEY = '@luca_installed_mods';

export interface InstalledMod {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  category: string;
  author: string;
  installedAt: string;
  nodeTypes: Record<string, any>;
  mainCode?: string;
}

class ModStorageService {
  private installedMods: Map<string, InstalledMod> = new Map();
  private initialized: boolean = false;

  /**
   * Initialiser le service et charger les mods installés
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(INSTALLED_MODS_KEY);
      if (stored) {
        const mods: InstalledMod[] = JSON.parse(stored);
        mods.forEach(mod => {
          this.installedMods.set(mod.name, mod);
          this.registerModNodes(mod);
        });
        logger.debug(`📦 ModStorage: Loaded ${mods.length} installed mods`);
      }
      this.initialized = true;
    } catch (error) {
      logger.error('❌ ModStorage: Failed to load installed mods:', error);
    }
  }

  /**
   * Enregistrer les nodes d'un mod dans le NodeRegistry
   */
  private registerModNodes(mod: InstalledMod): void {
    if (!mod.nodeTypes || typeof mod.nodeTypes !== 'object') {
      logger.warn(`⚠️ Mod ${mod.name} has no nodeTypes or invalid nodeTypes`);
      return;
    }

    logger.info(`📦 Registering nodes for mod: ${mod.displayName}`);
    logger.debug(`📦 nodeTypes keys: ${Object.keys(mod.nodeTypes).join(', ')}`);
    logger.debug(`📦 mainCode present: ${!!mod.mainCode}`);
    if (mod.mainCode) {
      logger.debug(`📦 mainCode length: ${mod.mainCode.length} chars`);
    }

    Object.entries(mod.nodeTypes).forEach(([nodeId, nodeConfig]: [string, any]) => {
      try {
        // Préparer l'exécuteur de mod
        const modExecutor = this.createModExecutor(mod, nodeId, nodeConfig);

        const nodeDefinition = {
          id: nodeId,
          name: nodeConfig.displayName || nodeConfig.name || nodeId,
          description: nodeConfig.description || `Node from ${mod.displayName}`,
          category: `Mods/${mod.displayName}`,
          inputs: nodeConfig.inputs || [],
          outputs: nodeConfig.outputs || [],
          defaultSettings: nodeConfig.defaultConfig || {},
          maxInstances: nodeConfig.maxInstances,
          color: nodeConfig.color || '#9C27B0', // Violet pour les mods
          icon: nodeConfig.icon || 'extension',
          iconFamily: 'material' as const,
          fromMod: mod.name,
          // Fonction d'exécution qui s'intègre avec le SignalSystem
          execute: modExecutor,
        };

        nodeRegistry.register(nodeDefinition);
        logger.info(`✅ Registered mod node: ${nodeId} from ${mod.displayName}`);
      } catch (error) {
        logger.error(`❌ Failed to register node ${nodeId} from ${mod.name}:`, error);
      }
    });
  }

  /**
   * Créer un exécuteur pour un node de mod
   */
  private createModExecutor(mod: InstalledMod, nodeId: string, nodeConfig: any) {
    // Stocker une référence au service pour l'utiliser dans le handler
    const self = this;
    
    return async (context: any) => {
      logger.info(`🔧 [Mod ${mod.name}/${nodeId}] Execute called for nodeId: ${context.nodeId}`);
      
      const signalSystem = getSignalSystem();
      
      if (!signalSystem) {
        logger.warn(`[Mod ${mod.name}] SignalSystem not initialized`);
        return { outputs: {}, success: false, error: 'SignalSystem not initialized' };
      }

      logger.info(`🔧 [Mod ${mod.name}/${nodeId}] Registering signal handler...`);

      // Enregistrer le handler de signal pour cette node
      signalSystem.registerHandler(
        context.nodeId,
        async (signal: Signal): Promise<SignalPropagation> => {
          logger.info(`🔔 [Mod ${mod.name}/${nodeId}] Signal reçu! NodeId: ${context.nodeId}`);
          logger.debug(`🔔 Signal data:`, signal);

          try {
            // Exécuter le code du mod si disponible
            if (mod.mainCode) {
              logger.info(`🚀 [Mod ${mod.name}/${nodeId}] Executing mod code...`);
              const result = await self.executeModCode(mod, nodeId, nodeConfig, signal, context);
              
              logger.info(`✅ [Mod ${mod.name}/${nodeId}] Execution result:`, result);
              
              // Propager le signal avec les outputs du mod
              return {
                propagate: true,
                data: result?.outputs || {},
              };
            } else {
              // Pas de code, juste propager
              logger.warn(`⚠️ [Mod ${mod.name}/${nodeId}] No mainCode available, just propagating signal`);
              return { propagate: true };
            }
          } catch (error) {
            logger.error(`❌ [Mod ${mod.name}/${nodeId}] Execution error:`, error);
            return { propagate: false };
          }
        }
      );

      logger.info(`✅ [Mod ${mod.name}/${nodeId}] Handler registered for node ${context.nodeId}`);
      
      return { 
        outputs: { signal_out: 'Mod node registered' }, 
        success: true 
      };
    };
  }

  /**
   * Exécuter le code JavaScript d'un mod
   */
  private async executeModCode(
    mod: InstalledMod,
    nodeTypeId: string,  // L'ID du type de node (ex: 'ping-node')
    nodeConfig: any,
    signal: Signal,
    context: any
  ): Promise<{ outputs: Record<string, any> } | null> {
    if (!mod.mainCode) {
      logger.warn(`[executeModCode] No mainCode for mod ${mod.name}`);
      return null;
    }

    // Utiliser le nom du node depuis la config si disponible, sinon l'ID
    const nodeType = nodeConfig.name || nodeTypeId;
    logger.info(`[executeModCode] Executing code for ${mod.name}/${nodeType}`);

    try {
      // Créer un environnement sandbox pour le mod
      const api = {
        log: {
          debug: (msg: string, data?: any) => logger.debug(`[Mod:${mod.name}] ${msg}`, data),
          info: (msg: string, data?: any) => logger.info(`[Mod:${mod.name}] ${msg}`, data),
          warn: (msg: string, data?: any) => logger.warn(`[Mod:${mod.name}] ${msg}`, data),
          error: (msg: string, data?: any) => logger.error(`[Mod:${mod.name}] ${msg}`, data),
        },
      };

      // Construire les inputs à partir du signal
      const inputs: Record<string, any> = {
        trigger: true, // Le signal lui-même est un trigger
        ...signal.data,
      };

      // Extraire la config du node
      const config = {
        ...(nodeConfig.defaultConfig || {}),
        ...(context.settings || {}),
      };

      logger.debug(`[executeModCode] NodeType: ${nodeType}`);
      logger.debug(`[executeModCode] Inputs:`, inputs);
      logger.debug(`[executeModCode] Config:`, config);

      // Transformer le code ES modules en code exécutable
      // Remplacer les exports par des assignations à un objet exports
      let transformedCode = mod.mainCode;
      
      // Transformer "export const X = ..." en "exports.X = ..."
      transformedCode = transformedCode.replace(
        /export\s+const\s+(\w+)\s*=/g, 
        'exports.$1 ='
      );
      
      // Transformer "export async function X" en "exports.X = async function"
      transformedCode = transformedCode.replace(
        /export\s+async\s+function\s+(\w+)/g, 
        'exports.$1 = async function'
      );
      
      // Transformer "export function X" en "exports.X = function"
      transformedCode = transformedCode.replace(
        /export\s+function\s+(\w+)/g, 
        'exports.$1 = function'
      );

      logger.debug(`[executeModCode] Transformed code (first 500 chars):`, 
        transformedCode.substring(0, 500));

      // Créer un module wrapper pour exécuter le code du mod
      // Note: Function est plus sûr que eval et fonctionne mieux dans React Native
      const wrappedCode = `
        var exports = {};
        ${transformedCode}
        return exports;
      `;

      // Exécuter le code avec Function (plus sûr que eval)
      logger.info(`[executeModCode] Creating module factory...`);
      // eslint-disable-next-line no-new-func
      const moduleFactory = new Function(wrappedCode);
      
      logger.info(`[executeModCode] Executing module factory...`);
      const moduleExports = moduleFactory();

      logger.debug(`[executeModCode] Module exports:`, Object.keys(moduleExports));

      // Récupérer la fonction run
      const runFn = moduleExports.run;

      if (typeof runFn === 'function') {
        logger.info(`[executeModCode] Calling run function with nodeType: ${nodeType}`);
        
        // Déterminer le nodeType à passer
        // Si le mod a des nodeTypes définis, essayer de trouver le bon
        let effectiveNodeType = nodeType;
        
        // Si le nodeTypes du mod contient les types attendus, les utiliser
        if (moduleExports.nodeTypes && typeof moduleExports.nodeTypes === 'object') {
          const availableTypes = Object.keys(moduleExports.nodeTypes);
          logger.debug(`[executeModCode] Available nodeTypes in mod code: ${availableTypes.join(', ')}`);
          
          // Si le nodeType demandé n'est pas dans la liste, utiliser le premier disponible
          if (availableTypes.length > 0 && !availableTypes.includes(nodeType)) {
            effectiveNodeType = availableTypes[0];
            logger.info(`[executeModCode] NodeType '${nodeType}' not found, using '${effectiveNodeType}' instead`);
          }
        }
        
        try {
          // Appeler la fonction run du mod
          const result = await runFn({
            nodeId: context.nodeId,
            nodeType: effectiveNodeType,
            inputs: inputs,
            config: config,
          }, api);

          logger.info(`[executeModCode] Run function result:`, result);
          return result;
        } catch (runError: any) {
          // Si l'erreur est "Type de node inconnu", essayer avec le premier type disponible
          if (runError.message?.includes('Type de node inconnu') && moduleExports.nodeTypes) {
            const availableTypes = Object.keys(moduleExports.nodeTypes);
            if (availableTypes.length > 0 && availableTypes[0] !== effectiveNodeType) {
              logger.warn(`[executeModCode] Retrying with first available nodeType: ${availableTypes[0]}`);
              const retryResult = await runFn({
                nodeId: context.nodeId,
                nodeType: availableTypes[0],
                inputs: inputs,
                config: config,
              }, api);
              return retryResult;
            }
          }
          throw runError;
        }
      } else {
        // Pas de fonction run, créer un résultat par défaut
        logger.warn(`[Mod ${mod.name}] No 'run' function exported, using default behavior`);
        
        // Loguer que le mod a été déclenché
        api.log.info(`Mod ${mod.name} triggered for node ${nodeType}`);
        
        return { 
          outputs: {
            result: `Mod ${mod.name} executed successfully`,
            timestamp: Date.now()
          } 
        };
      }
    } catch (error) {
      logger.error(`[Mod ${mod.name}] Error executing mod code:`, error);
      throw error;
    }
  }

  /**
   * Installer un mod
   */
  async installMod(mod: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    version: string;
    category: string;
    author: { name: string };
    nodeTypes: Record<string, any>;
    mainCode?: string;
  }): Promise<boolean> {
    try {
      // Si nodeTypes est vide, créer un node par défaut pour ce mod
      let nodeTypes = mod.nodeTypes || {};
      if (Object.keys(nodeTypes).length === 0) {
        const nodeId = mod.name.replace(/-/g, '_');
        nodeTypes = {
          [nodeId]: {
            name: nodeId,
            displayName: mod.displayName,
            description: mod.description,
            category: mod.category,
            inputs: [
              { name: 'signal', type: 'any', label: 'Signal' }
            ],
            outputs: [
              { name: 'result', type: 'any', label: 'Résultat' }
            ],
            defaultConfig: {}
          }
        };
        logger.debug(`📦 ModStorage: Created default node for mod "${mod.displayName}"`);
      }

      const installedMod: InstalledMod = {
        id: mod.id,
        name: mod.name,
        displayName: mod.displayName,
        description: mod.description,
        version: mod.version,
        category: mod.category,
        author: mod.author.name,
        installedAt: new Date().toISOString(),
        nodeTypes: nodeTypes,
        mainCode: mod.mainCode,
      };

      this.installedMods.set(mod.name, installedMod);
      this.registerModNodes(installedMod);
      await this.saveToStorage();

      logger.debug(`✅ ModStorage: Installed mod "${mod.displayName}"`);
      return true;
    } catch (error) {
      logger.error(`❌ ModStorage: Failed to install mod "${mod.name}":`, error);
      return false;
    }
  }

  /**
   * Désinstaller un mod
   */
  async uninstallMod(modName: string): Promise<boolean> {
    try {
      const mod = this.installedMods.get(modName);
      if (!mod) return false;

      // Note: On ne peut pas facilement retirer des nodes du registry
      // Pour l'instant, on les marque comme désinstallées
      this.installedMods.delete(modName);
      await this.saveToStorage();

      logger.debug(`✅ ModStorage: Uninstalled mod "${modName}"`);
      return true;
    } catch (error) {
      logger.error(`❌ ModStorage: Failed to uninstall mod "${modName}":`, error);
      return false;
    }
  }

  /**
   * Vérifier si un mod est installé
   */
  isInstalled(modName: string): boolean {
    return this.installedMods.has(modName);
  }

  /**
   * Obtenir un mod installé par son nom
   */
  getMod(modName: string): InstalledMod | undefined {
    return this.installedMods.get(modName);
  }

  /**
   * Obtenir tous les mods installés
   */
  getAllInstalledMods(): InstalledMod[] {
    return Array.from(this.installedMods.values());
  }

  /**
   * Obtenir le nombre de mods installés
   */
  getInstalledCount(): number {
    return this.installedMods.size;
  }

  /**
   * Sauvegarder dans AsyncStorage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const mods = Array.from(this.installedMods.values());
      await AsyncStorage.setItem(INSTALLED_MODS_KEY, JSON.stringify(mods));
    } catch (error) {
      logger.error('❌ ModStorage: Failed to save to storage:', error);
    }
  }

  /**
   * Mettre à jour un mod existant
   */
  async updateMod(mod: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    category: string;
    author: { name: string };
    nodeTypes: Record<string, any>;
    mainCode?: string;
  }): Promise<boolean> {
    const existing = this.installedMods.get(mod.name);
    if (!existing) {
      return this.installMod({ ...mod, id: mod.name });
    }

    try {
      const updatedMod: InstalledMod = {
        ...existing,
        displayName: mod.displayName,
        description: mod.description,
        version: mod.version,
        category: mod.category,
        author: mod.author.name,
        nodeTypes: mod.nodeTypes || {},
        mainCode: mod.mainCode,
      };

      this.installedMods.set(mod.name, updatedMod);
      this.registerModNodes(updatedMod);
      await this.saveToStorage();

      logger.debug(`✅ ModStorage: Updated mod "${mod.displayName}"`);
      return true;
    } catch (error) {
      logger.error(`❌ ModStorage: Failed to update mod "${mod.name}":`, error);
      return false;
    }
  }
}

export const modStorage = new ModStorageService();
