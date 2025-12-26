/**
 * ModNodeFactory - Factory pour créer des nodes depuis les mods
 *
 * Ce module expose une API simplifiée pour les moddeurs, compatible avec
 * le ConditionHandler et le système de signaux de LUCA.
 *
 * @module mods/core/ModNodeFactory
 */

import { registerNode } from '../../engine/NodeRegistry';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../engine/SignalSystem';
import { registerConditionNode, type ConditionNodeConfig } from '../../engine/ConditionHandler';
import { buildNodeCardHTML } from '../../engine/nodes/templates/nodeCard';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
  NodeDataType,
} from '../../types/node.types';

// ============================================================================
// TYPES POUR LES MODS
// ============================================================================

/**
 * Configuration simplifiée pour un node de mod
 */
export interface ModNodeConfig {
  /** ID unique (préfixé automatiquement par le nom du mod) */
  id: string;
  /** Nom affiché */
  name: string;
  /** Description */
  description: string;
  /** Catégorie : 'Action' | 'Condition' | 'Control' | 'Input' | 'Output' */
  category: 'Action' | 'Condition' | 'Control' | 'Input' | 'Output';
  /** Couleur hex */
  color: string;
  /** Nom de l'icône Material */
  icon: string;

  /** Définition des entrées */
  inputs?: ModPortDefinition[];
  /** Définition des sorties */
  outputs?: ModPortDefinition[];

  /** Settings par défaut */
  defaultSettings?: Record<string, any>;

  /** Handler d'exécution */
  execute?: ModExecuteHandler;

  /** Handler de signal (pour les nodes qui gèrent les signaux manuellement) */
  signalHandler?: ModSignalHandler;

  /** Contenu HTML personnalisé */
  customHTML?: (settings: Record<string, any>) => string;
}

export interface ModPortDefinition {
  name: string;
  type: 'any' | 'signal' | 'number' | 'string' | 'boolean';
  label: string;
  description?: string;
  required?: boolean;
}

/**
 * Convertit un type de port mod en NodeDataType
 */
function convertPortType(type: ModPortDefinition['type']): NodeDataType {
  // 'signal' est converti en 'any' pour la compatibilité
  if (type === 'signal') return 'any';
  return type;
}

export type ModExecuteHandler = (
  context: ModExecutionContext,
  api: ModRuntimeAPI
) => Promise<ModExecutionResult>;

export type ModSignalHandler = (
  signal: Signal,
  context: ModExecutionContext,
  api: ModRuntimeAPI
) => Promise<SignalPropagation>;

export interface ModExecutionContext {
  nodeId: number;
  settings: Record<string, any>;
  inputs: Record<string, any>;
}

export interface ModExecutionResult {
  success: boolean;
  outputs?: Record<string, any>;
  error?: string;
}

/**
 * Configuration pour un node de condition de mod
 */
export interface ModConditionConfig {
  /** ID unique (préfixé automatiquement par le nom du mod) */
  id: string;
  /** Nom affiché */
  name: string;
  /** Description */
  description: string;
  /** Couleur hex */
  color: string;
  /** Nom de l'icône Material */
  icon: string;

  /**
   * Fonction qui vérifie si la condition est vraie
   * Peut utiliser l'API pour accéder aux services
   */
  checkCondition: (api: ModRuntimeAPI) => boolean;

  /**
   * Données additionnelles à inclure dans le signal
   */
  getSignalData?: (api: ModRuntimeAPI) => Record<string, any>;

  /** Label pour le debug (ex: 'my_condition') */
  waitingForLabel: string;

  /**
   * Configuration de l'événement à écouter
   */
  eventSubscription?: {
    /** Nom de l'événement SignalSystem (ex: 'mymod.sensor.changed') */
    eventName: string;
    /** Extrait l'état de la condition depuis les données de l'événement */
    getConditionFromEvent: (eventData: any) => boolean;
  };

  /** Description dynamique basée sur les settings */
  getDescription?: (settings: Record<string, any>) => string;

  /** HTML personnalisé pour le corps du node */
  customBodyHTML?: (settings: Record<string, any>) => string;

  /** Settings additionnels */
  additionalSettings?: Record<string, any>;
}

/**
 * Configuration pour un node d'action de mod
 */
export interface ModActionConfig {
  /** ID unique (préfixé automatiquement) */
  id: string;
  /** Nom affiché */
  name: string;
  /** Description */
  description: string;
  /** Couleur hex */
  color: string;
  /** Nom de l'icône Material */
  icon: string;

  /** Handler appelé quand le signal ON arrive */
  onSignalOn: (context: ModExecutionContext, api: ModRuntimeAPI) => Promise<void>;

  /** Handler appelé quand le signal OFF arrive */
  onSignalOff?: (context: ModExecutionContext, api: ModRuntimeAPI) => Promise<void>;

  /** Propage le signal après l'action ? (défaut: true) */
  propagateSignal?: boolean;

  /** Données à ajouter au signal propagé */
  getSignalData?: (context: ModExecutionContext, api: ModRuntimeAPI) => Record<string, any>;

  /** Settings par défaut */
  defaultSettings?: Record<string, any>;

  /** HTML personnalisé */
  customHTML?: (settings: Record<string, any>) => string;
}

// ============================================================================
// API RUNTIME POUR LES MODS
// ============================================================================

export interface ModRuntimeAPI {
  /** Informations sur le mod */
  mod: {
    name: string;
    version: string;
  };

  /** Système de signaux */
  signals: {
    /** Émettre un événement personnalisé */
    emitEvent: (eventName: string, data?: any) => void;
    /** S'abonner à un événement */
    subscribeToEvent: (eventName: string, callback: (data: any) => void) => () => void;
    /** Activer un node */
    activateNode: (nodeId: number, data?: any) => Promise<void>;
    /** Désactiver un node */
    deactivateNode: (nodeId: number, data?: any) => Promise<void>;
  };

  /** Logging */
  log: {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
  };

  /** Storage persistant */
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

// ============================================================================
// FACTORY PRINCIPALE
// ============================================================================

/**
 * Classe factory pour créer des nodes depuis un mod
 */
export class ModNodeFactory {
  private modName: string;
  private modVersion: string;
  private registeredNodes: Map<string, NodeDefinition> = new Map();
  private eventSubscriptions: Map<string, () => void> = new Map();

  constructor(modName: string, modVersion: string) {
    this.modName = modName;
    this.modVersion = modVersion;
  }

  /**
   * Crée l'API runtime pour ce mod
   */
  private createRuntimeAPI(): ModRuntimeAPI {
    const ss = getSignalSystem();

    return {
      mod: {
        name: this.modName,
        version: this.modVersion,
      },

      signals: {
        emitEvent: (eventName: string, data?: any) => {
          const fullEventName = `mod.${this.modName}.${eventName}`;
          ss?.emitEvent(fullEventName, data);
        },

        subscribeToEvent: (eventName: string, callback: (data: any) => void) => {
          const fullEventName = eventName.startsWith('mod.')
            ? eventName
            : `mod.${this.modName}.${eventName}`;
          const nodeId = Date.now(); // Utiliser un ID unique temporaire
          const unsub = ss?.subscribeToEvent(fullEventName, nodeId, callback);
          return unsub || (() => {});
        },

        activateNode: async (nodeId: number, data?: any) => {
          await ss?.activateNode(nodeId, data);
        },

        deactivateNode: async (nodeId: number, data?: any) => {
          await ss?.deactivateNode(nodeId, data);
        },
      },

      log: {
        debug: (message: string, data?: any) => {
          logger.debug(`[Mod:${this.modName}] ${message}`, data);
        },
        info: (message: string, data?: any) => {
          logger.info(`[Mod:${this.modName}] ${message}`, data);
        },
        warn: (message: string, data?: any) => {
          logger.warn(`[Mod:${this.modName}] ${message}`, data);
        },
        error: (message: string, data?: any) => {
          logger.error(`[Mod:${this.modName}] ${message}`, data);
        },
      },

      storage: {
        get: async (_key: string) => {
          // TODO: Implémenter avec AsyncStorage ou autre
          return null;
        },
        set: async (_key: string, _value: any) => {
          // TODO: Implémenter
        },
        delete: async (_key: string) => {
          // TODO: Implémenter
        },
      },
    };
  }

  /**
   * Crée et enregistre un node générique
   */
  createNode(config: ModNodeConfig): NodeDefinition {
    const fullId = `mod.${this.modName}.${config.id}`;
    const api = this.createRuntimeAPI();

    const node: NodeDefinition = {
      id: fullId,
      name: config.name,
      description: config.description,
      category: config.category,
      icon: config.icon,
      iconFamily: 'material',
      color: config.color,

      inputs:
        config.inputs?.map((input) => ({
          name: input.name,
          type: convertPortType(input.type),
          label: input.label,
          description: input.description || '',
          required: input.required ?? false,
        })) || [],

      outputs:
        config.outputs?.map((output) => ({
          name: output.name,
          type: convertPortType(output.type),
          label: output.label,
          description: output.description || '',
        })) || [],

      defaultSettings: config.defaultSettings || {},

      execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
        const ss = getSignalSystem();

        if (config.signalHandler && ss) {
          // Si un handler de signal est fourni, l'enregistrer
          ss.registerHandler(context.nodeId, async (signal: Signal) => {
            const modContext: ModExecutionContext = {
              nodeId: context.nodeId,
              settings: context.settings || {},
              inputs: context.inputs || {},
            };
            return await config.signalHandler!(signal, modContext, api);
          });
        }

        if (config.execute) {
          const modContext: ModExecutionContext = {
            nodeId: context.nodeId,
            settings: context.settings || {},
            inputs: context.inputs || {},
          };
          const result = await config.execute(modContext, api);
          return {
            success: result.success,
            outputs: result.outputs || {},
            error: result.error,
          };
        }

        return { success: true, outputs: {} };
      },

      validate: () => true,

      generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta) => {
        const customBody = config.customHTML?.(settings) || '';

        return buildNodeCardHTML({
          title: config.name,
          subtitle: config.description,
          iconName: config.icon.replace(/-/g, '_'),
          category: nodeMeta?.category || config.category,
          accentColor: config.color,
          description: config.description,
          body: customBody,
        });
      },
    };

    registerNode(node);
    this.registeredNodes.set(fullId, node);

    api.log.info(`Node registered: ${fullId}`);

    return node;
  }

  /**
   * Crée et enregistre un node de condition
   * Utilise le ConditionHandler centralisé
   */
  createConditionNode(config: ModConditionConfig): NodeDefinition {
    const fullId = `mod.${this.modName}.condition.${config.id}`;
    const api = this.createRuntimeAPI();

    const conditionConfig: ConditionNodeConfig = {
      id: fullId,
      name: config.name,
      description: config.description,
      color: config.color,
      icon: config.icon,

      checkCondition: () => config.checkCondition(api),
      getSignalData: config.getSignalData ? () => config.getSignalData!(api) : undefined,
      waitingForLabel: `mod.${this.modName}.${config.waitingForLabel}`,

      eventSubscription: config.eventSubscription
        ? {
            eventName: config.eventSubscription.eventName.startsWith('mod.')
              ? config.eventSubscription.eventName
              : `mod.${this.modName}.${config.eventSubscription.eventName}`,
            getConditionFromEvent: config.eventSubscription.getConditionFromEvent,
          }
        : undefined,

      getDescription: config.getDescription,
      customBodyHTML: config.customBodyHTML,
      additionalSettings: config.additionalSettings,
    };

    const node = registerConditionNode(conditionConfig);
    this.registeredNodes.set(fullId, node);

    api.log.info(`Condition node registered: ${fullId}`);

    return node;
  }

  /**
   * Crée et enregistre un node d'action
   */
  createActionNode(config: ModActionConfig): NodeDefinition {
    const fullId = `mod.${this.modName}.action.${config.id}`;
    const api = this.createRuntimeAPI();
    const propagate = config.propagateSignal ?? true;

    const node: NodeDefinition = {
      id: fullId,
      name: config.name,
      description: config.description,
      category: 'Action',
      icon: config.icon,
      iconFamily: 'material',
      color: config.color,

      inputs: [
        {
          name: 'signal_in',
          type: 'any',
          label: 'Signal In',
          description: "Signal d'entrée",
          required: false,
        },
      ],

      outputs: [
        {
          name: 'signal_out',
          type: 'any',
          label: 'Signal Out',
          description: 'Signal de sortie',
        },
      ],

      defaultSettings: config.defaultSettings || {},

      execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
        const ss = getSignalSystem();

        if (ss) {
          ss.registerHandler(context.nodeId, async (signal: Signal): Promise<SignalPropagation> => {
            const modContext: ModExecutionContext = {
              nodeId: context.nodeId,
              settings: context.settings || {},
              inputs: context.inputs || {},
            };

            try {
              if (signal.state === 'ON') {
                await config.onSignalOn(modContext, api);
              } else if (signal.state === 'OFF' && config.onSignalOff) {
                await config.onSignalOff(modContext, api);
              }

              const additionalData = config.getSignalData?.(modContext, api) || {};

              return {
                propagate,
                state: signal.state,
                data: { ...signal.data, ...additionalData },
              };
            } catch (error) {
              api.log.error(`Action error: ${error}`);
              return { propagate: false };
            }
          });
        }

        return { success: true, outputs: {} };
      },

      validate: () => true,

      generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta) => {
        const customBody = config.customHTML?.(settings) || '';

        return buildNodeCardHTML({
          title: config.name,
          subtitle: config.description,
          iconName: config.icon.replace(/-/g, '_'),
          category: nodeMeta?.category || 'Action',
          accentColor: config.color,
          description: config.description,
          body: customBody,
        });
      },
    };

    registerNode(node);
    this.registeredNodes.set(fullId, node);

    api.log.info(`Action node registered: ${fullId}`);

    return node;
  }

  /**
   * Nettoie toutes les ressources du mod
   */
  cleanup(): void {
    // Nettoyer les subscriptions
    for (const [, unsub] of this.eventSubscriptions) {
      unsub();
    }
    this.eventSubscriptions.clear();

    // Note: Les nodes restent enregistrés dans le NodeRegistry
    // car on ne peut pas les "dé-enregistrer" facilement

    logger.info(`[ModNodeFactory] Mod ${this.modName} cleaned up`);
  }

  /**
   * Retourne la liste des nodes enregistrés par ce mod
   */
  getRegisteredNodes(): string[] {
    return Array.from(this.registeredNodes.keys());
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ModNodeFactory;
