/**
 * ConditionHandler - Système centralisé de gestion des conditions
 *
 * Ce module fournit une logique unifiée pour toutes les nodes de condition.
 * Il gère les modes : continu, timer et switch.
 *
 * Modes supportés :
 * - Continu (timerDuration=0, switchMode=false) : Actif tant que la condition est vraie
 * - Timer (timerDuration>0, switchMode=false) : Actif pendant X secondes après que la condition soit vraie
 * - Switch (switchMode=true) : Bascule ON/OFF à chaque fois que la condition devient vraie
 *
 * Usage :
 * 1. Appeler initConditionState(nodeId) pour initialiser
 * 2. Utiliser createConditionSignalHandler() pour le handler de signal
 * 3. Utiliser subscribeToConditionChanges() ou gérer manuellement avec onConditionMet/onConditionUnmet
 */

import { registerNode } from '../NodeRegistry';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { buildNodeCardHTML } from './nodeCard';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ConditionState {
  hasActiveSignal: boolean; // Un signal ON est actif sur l'entrée
  lastSignalData: any; // Données du dernier signal reçu
  isOutputActive: boolean; // État actuel de la sortie (ON ou OFF)
  timerHandle: ReturnType<typeof setTimeout> | null; // Handle du timer actif
  eventUnsubscribe: (() => void) | null; // Fonction pour se désabonner des événements
}

export interface ConditionSettings {
  invertSignal: boolean; // Inverser la logique de la condition
  timerDuration: number; // Durée en secondes (0 = continu)
}

export interface ConditionCallbacks {
  /** Retourne l'état actuel de la condition (true = condition remplie) */
  getConditionState: () => boolean;

  /** Données additionnelles à inclure dans le signal */
  getSignalData?: () => Record<string, any>;

  /** Nom de l'événement pour le signal.blocked */
  waitingForLabel?: string;
}

// ============================================================================
// STORAGE
// ============================================================================

const conditionStates = new Map<number, ConditionState>();

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Initialise l'état d'une condition
 */
export function initConditionState(nodeId: number): ConditionState {
  const existingState = conditionStates.get(nodeId);

  // Nettoyer l'ancien état si existant
  if (existingState) {
    if (existingState.timerHandle) {
      clearTimeout(existingState.timerHandle);
    }
    if (existingState.eventUnsubscribe) {
      existingState.eventUnsubscribe();
    }
  }

  const state: ConditionState = {
    hasActiveSignal: false,
    lastSignalData: null,
    isOutputActive: false,
    timerHandle: null,
    eventUnsubscribe: null,
  };

  conditionStates.set(nodeId, state);
  return state;
}

/**
 * Récupère l'état d'une condition
 */
export function getConditionState(nodeId: number): ConditionState | undefined {
  return conditionStates.get(nodeId);
}

/**
 * Nettoie l'état d'une condition
 */
export function cleanupConditionState(nodeId: number): void {
  const state = conditionStates.get(nodeId);
  if (state) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle);
    }
    if (state.eventUnsubscribe) {
      state.eventUnsubscribe();
    }
  }
  conditionStates.delete(nodeId);
}

/**
 * Active la sortie d'une condition
 */
export async function activateOutput(
  nodeId: number,
  settings: ConditionSettings,
  callbacks: ConditionCallbacks
): Promise<void> {
  const state = conditionStates.get(nodeId);
  if (!state || state.isOutputActive) return;

  const ss = getSignalSystem();
  if (!ss) return;

  const { timerDuration = 0 } = settings;

  state.isOutputActive = true;

  const additionalData = callbacks.getSignalData?.() ?? {};

  await ss.setNodeState(
    nodeId,
    'ON',
    {
      ...state.lastSignalData,
      ...additionalData,
    },
    undefined,
    { forcePropagation: true }
  );

  // Si mode timer (et pas mode switch), programmer l'arrêt
  if (timerDuration > 0) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle);
    }
    state.timerHandle = setTimeout(() => {
      deactivateOutput(nodeId, callbacks);
    }, timerDuration * 1000);
  }
}

/**
 * Désactive la sortie d'une condition
 */
export async function deactivateOutput(
  nodeId: number,
  callbacks: ConditionCallbacks
): Promise<void> {
  const state = conditionStates.get(nodeId);
  if (!state || !state.isOutputActive) return;

  const ss = getSignalSystem();
  if (!ss) return;

  // Nettoyer le timer si actif
  if (state.timerHandle) {
    clearTimeout(state.timerHandle);
    state.timerHandle = null;
  }

  state.isOutputActive = false;

  const additionalData = callbacks.getSignalData?.() ?? {};

  console.log(`[ConditionHandler] Node ${nodeId} OUTPUT OFF`);

  await ss.setNodeState(
    nodeId,
    'OFF',
    {
      ...state.lastSignalData,
      ...additionalData,
    },
    undefined,
    { forcePropagation: true }
  );
}

/**
 * Bascule l'état de la sortie (pour le mode switch)
 */
export async function toggleOutput(
  nodeId: number,
  settings: ConditionSettings,
  callbacks: ConditionCallbacks
): Promise<void> {
  const state = conditionStates.get(nodeId);
  if (!state) return;

  if (state.isOutputActive) {
    await deactivateOutput(nodeId, callbacks);
  } else {
    await activateOutput(nodeId, settings, callbacks);
  }
}

/**
 * Appelée quand la condition devient vraie
 * Gère les différents modes (continu, timer, switch)
 */
export async function onConditionMet(
  nodeId: number,
  settings: ConditionSettings,
  callbacks: ConditionCallbacks
): Promise<void> {
  const state = conditionStates.get(nodeId);
  if (!state || !state.hasActiveSignal) return;

  const switchMode = settings.timerDuration == 0;

  console.log(`[ConditionHandler] Node ${nodeId} condition MET, switchMode=${switchMode}`);

  if (switchMode) {
    // Mode switch : basculer l'état à chaque fois que la condition devient vraie
    await toggleOutput(nodeId, settings, callbacks);
  } else if (!state.isOutputActive) {
    // Mode normal (continu ou timer) : activer si pas déjà actif
    await activateOutput(nodeId, settings, callbacks);
  }
}

/**
 * Appelée quand la condition devient fausse
 * En mode continu sans timer, désactive la sortie
 */
export async function onConditionUnmet(
  nodeId: number,
  settings: ConditionSettings,
  callbacks: ConditionCallbacks
): Promise<void> {
  const state = conditionStates.get(nodeId);
  if (!state) return;

  const timerDuration = settings.timerDuration;

  // En mode switch, on ne fait rien quand la condition devient fausse
  // Le toggle se fait uniquement quand la condition DEVIENT vraie
  if (timerDuration === 0) {
    return;
  }

  // En mode continu (pas de timer), désactiver quand la condition devient fausse
  if (timerDuration === 0 && state.isOutputActive && state.hasActiveSignal) {
    console.log(
      `[ConditionHandler] Node ${nodeId} condition UNMET, deactivating (continuous mode)`
    );
    await deactivateOutput(nodeId, callbacks);
  }
  // En mode timer, on laisse le timer gérer la désactivation
}

/**
 * Crée le handler de signal pour une condition
 * À utiliser avec ss.registerHandler()
 */
export function createConditionSignalHandler(
  nodeId: number,
  settings: ConditionSettings,
  callbacks: ConditionCallbacks
): (signal: Signal) => Promise<SignalPropagation> {
  return async (signal: Signal): Promise<SignalPropagation> => {
    const state = conditionStates.get(nodeId);
    if (!state) {
      console.error(`[ConditionHandler] No state for node ${nodeId}`);
      return { propagate: false };
    }

    const ss = getSignalSystem();
    const { invertSignal = false, timerDuration = 0 } = settings;

    console.log(`[ConditionHandler] Node ${nodeId} received signal: state=${signal.state}`);

    // ========== Signal OFF ==========
    if (signal.state === 'OFF') {
      state.hasActiveSignal = false;
      state.lastSignalData = null;

      // Nettoyer le timer si actif
      if (state.timerHandle) {
        clearTimeout(state.timerHandle);
        state.timerHandle = null;
      }

      // Désactiver la sortie si elle était active
      if (state.isOutputActive) {
        state.isOutputActive = false;
        const additionalData = callbacks.getSignalData?.() ?? {};
        return {
          propagate: true,
          state: 'OFF',
          data: { ...signal.data, ...additionalData },
        };
      }

      return { propagate: true, state: 'OFF', data: signal.data };
    }

    // ========== Signal ON ==========
    state.hasActiveSignal = true;
    state.lastSignalData = signal.data;

    // Vérifier si la condition est actuellement vraie
    const rawCondition = callbacks.getConditionState();
    const condition = invertSignal ? !rawCondition : rawCondition;
    const additionalData = callbacks.getSignalData?.() ?? {};

    console.log(
      `[ConditionHandler] Node ${nodeId} signal ON, condition=${condition} (raw=${rawCondition}, invert=${invertSignal})`
    );

    if (condition) {
      // Condition déjà vraie au moment où le signal arrive
      // En mode switch, on active (premier toggle sera fait quand la condition change)
      if (!state.isOutputActive) {
        state.isOutputActive = true;

        // Si mode timer (et pas switch), programmer l'arrêt
        if (timerDuration > 0) {
          if (state.timerHandle) {
            clearTimeout(state.timerHandle);
          }
          state.timerHandle = setTimeout(() => {
            deactivateOutput(nodeId, callbacks);
          }, timerDuration * 1000);
        }
      }

      return {
        propagate: true,
        state: 'ON',
        data: { ...signal.data, ...additionalData },
      };
    }

    // Condition non remplie : émettre un événement signal.blocked pour le visuel
    console.log(`[ConditionHandler] Node ${nodeId} signal ON pending, waiting for condition`);

    ss?.emitEvent('signal.blocked', {
      nodeId,
      reason: 'condition_not_met',
      waitingFor: callbacks.waitingForLabel || 'condition',
    });

    return { propagate: false, data: signal.data };
  };
}

/**
 * Souscrit aux changements de condition via un événement
 * Appelle onConditionMet ou onConditionUnmet automatiquement
 */
export function subscribeToConditionChanges(
  nodeId: number,
  eventName: string,
  settings: ConditionSettings,
  callbacks: ConditionCallbacks & {
    /** Extrait l'état de la condition depuis les données de l'événement */
    getConditionFromEvent: (eventData: any) => boolean;
  }
): void {
  const state = conditionStates.get(nodeId);
  if (!state) return;

  const ss = getSignalSystem();
  if (!ss) return;

  const { invertSignal = false } = settings;

  // Nettoyer l'ancien subscriber
  if (state.eventUnsubscribe) {
    state.eventUnsubscribe();
  }

  state.eventUnsubscribe = ss.subscribeToEvent(eventName, nodeId, async (data: any) => {
    const rawCondition = callbacks.getConditionFromEvent(data);
    const condition = invertSignal ? !rawCondition : rawCondition;

    console.log(
      `[ConditionHandler] Node ${nodeId} event ${eventName}: raw=${rawCondition}, condition=${condition}`
    );

    if (condition) {
      // La condition est devenue vraie
      await onConditionMet(nodeId, settings, callbacks);
    } else {
      // La condition est devenue fausse
      await onConditionUnmet(nodeId, settings, callbacks);
    }
  });
}

// ============================================================================
// UTILITAIRES POUR LES TESTS
// ============================================================================

export function clearAllConditionStates(): void {
  for (const [nodeId] of conditionStates) {
    cleanupConditionState(nodeId);
  }
  conditionStates.clear();
}

export function getConditionStatesCount(): number {
  return conditionStates.size;
}

// ============================================================================
// FACTORY POUR CRÉER DES NODES DE CONDITION
// ============================================================================

/**
 * Configuration pour créer une node de condition
 */
export interface ConditionNodeConfig {
  /** ID unique de la node (ex: 'condition.flashlight') */
  id: string;
  /** Nom affiché */
  name: string;
  /** Description courte */
  description: string;
  /** Couleur de la node */
  color?: string;
  /** Nom de l'icône Material */
  icon: string;
  /** Famille d'icônes (default: 'material') */
  iconFamily?: string;

  /**
   * Fonction qui retourne l'état actuel de la condition (true/false)
   * Appelée à chaque vérification
   */
  checkCondition: () => boolean;

  /**
   * Données additionnelles à inclure dans le signal
   */
  getSignalData?: () => Record<string, any>;

  /**
   * Label pour l'attente de condition (pour le debug/UI)
   */
  waitingForLabel: string;

  /**
   * Configuration de l'abonnement aux événements
   * Si défini, la condition s'abonne automatiquement à cet événement
   */
  eventSubscription?: {
    /** Nom de l'événement SignalSystem */
    eventName: string;
    /** Extrait l'état de la condition depuis les données de l'événement */
    getConditionFromEvent: (eventData: any) => boolean;
  };

  /**
   * Configuration de l'abonnement à un callback externe
   * Pour les événements qui ne passent pas par SignalSystem (ex: volume buttons)
   */
  externalSubscription?: {
    /**
     * Fonction pour s'abonner aux événements externes
     * Doit retourner une fonction de désabonnement
     * @param nodeId - ID de la node
     * @param allInputs - Tous les inputs de la node (incluant les inputs personnalisés)
     * @param onConditionChange - Callback à appeler quand la condition change (true = condition vraie)
     */
    subscribe: (
      nodeId: number,
      allInputs: Record<string, any>,
      onConditionChange: (conditionMet: boolean) => void
    ) => () => void;
  };

  /**
   * Settings par défaut additionnels (en plus de invertSignal, switchMode, timerDuration)
   */
  additionalSettings?: Record<string, any>;

  /**
   * Inputs additionnels à afficher dans la node
   * Ces inputs seront ajoutés en plus des inputs standard (invert_signal, timer_duration)
   */
  inputs?: Array<{
    type: 'switch' | 'number' | 'text' | 'color' | 'selector';
    name: string;
    label: string;
    description?: string;
    value?: any;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{ label: string; value: string }>;
  }>;

  /**
   * Contenu HTML personnalisé pour le corps de la node
   * @param settings - Settings actuels
   */
  customBodyHTML?: (settings: Record<string, any>) => string;

  /**
   * Description dynamique basée sur les settings
   */
  getDescription?: (settings: Record<string, any>) => string;
}

/**
 * Crée une NodeDefinition de condition à partir d'une configuration
 */
export function createConditionNode(config: ConditionNodeConfig): NodeDefinition {
  const {
    id,
    name,
    description,
    color,
    icon,
    iconFamily = 'material',
    checkCondition,
    getSignalData,
    waitingForLabel,
    eventSubscription,
    externalSubscription,
    additionalSettings = {},
    inputs = [],
  } = config;

  return {
    id,
    name,
    description,
    category: 'Condition',
    icon,
    iconFamily: iconFamily as 'material' | 'fontawesome',
    color,

    inputs: [
      {
        name: 'signal_in',
        type: 'any',
        label: 'Signal In',
        description: "Signal d'entrée à filtrer",
        required: false,
      },
    ],

    outputs: [
      {
        name: 'signal_out',
        type: 'any',
        label: 'Signal Out',
        description: 'Signal propagé si la condition est vraie',
      },
    ],

    defaultSettings: {
      invertSignal: false,
      switchMode: false,
      timerDuration: 0,
      ...additionalSettings,
    },

    execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
      try {
        const ss = getSignalSystem();
        if (!ss) {
          return { success: false, error: 'Signal system not initialized', outputs: {} };
        }

        const nodeId = context.nodeId;
        const settings: ConditionSettings = {
          invertSignal: context.inputs.invert_signal ?? false,
          timerDuration: context.inputs.timer_duration ?? 0,
        };

        // Initialiser l'état via le ConditionHandler
        const state = initConditionState(nodeId);

        // Callbacks pour cette condition
        const callbacks: ConditionCallbacks = {
          getConditionState: checkCondition,
          getSignalData,
          waitingForLabel,
        };

        // S'abonner aux événements SignalSystem si configuré
        if (eventSubscription) {
          subscribeToConditionChanges(nodeId, eventSubscription.eventName, settings, {
            ...callbacks,
            getConditionFromEvent: eventSubscription.getConditionFromEvent,
          });
        }

        // S'abonner aux événements externes si configuré
        if (externalSubscription) {
          const unsubscribe = externalSubscription.subscribe(
            nodeId,
            context.inputs, // Passer tous les inputs pour les settings personnalisés
            (conditionMet: boolean) => {
              const conditionState = getConditionState(nodeId);
              if (!conditionState?.hasActiveSignal) return;

              if (conditionMet) {
                onConditionMet(nodeId, settings, callbacks);
              } else {
                onConditionUnmet(nodeId, settings, callbacks);
              }
            }
          );
          state.eventUnsubscribe = unsubscribe;
        }

        // Enregistrer le handler de signal
        ss.registerHandler(nodeId, createConditionSignalHandler(nodeId, settings, callbacks));

        return { success: true, outputs: {} };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e), outputs: {} };
      }
    },

    validate: (): boolean | string => {
      const ss = getSignalSystem();
      return ss ? true : 'Signal system not initialized';
    },

    generateHTML: (_: Record<string, any>, nodeMeta?: NodeMeta): string => {
      // Inputs standard pour toutes les conditions
      const standardInputs = [
        {
          type: 'switch' as const,
          name: 'invert_signal',
          label: 'Inverser le signal',
          value: false,
        },
        {
          type: 'number' as const,
          name: 'timer_duration',
          label: 'Durée du timer (secondes)',
          value: 0,
        },
      ];

      // Fusionner les inputs additionnels avec les inputs standard
      const allInputs = [...inputs, ...standardInputs];

      return buildNodeCardHTML({
        title: name,
        iconName: icon.replace(/-/g, '_'),
        category: 'Condition',
        description: '0 dans le timer = mode switch',
        inputs: allInputs,
        nodeId: nodeMeta?.id,
      });
    },
  };
}

/**
 * Crée et enregistre une node de condition
 */
export function registerConditionNode(config: ConditionNodeConfig): NodeDefinition {
  const node = createConditionNode(config);
  registerNode(node);
  return node;
}
