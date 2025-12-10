/**
 * TriggerNode - Node déclencheur de signal
 *
 * Catégorie: Input
 *
 * Cette node permet de déclencher manuellement un signal dans le graphe.
 * C'est le point de départ pour tester les chaînes de nodes avec le système de signaux.
 *
 * Fonctionnement:
 * - N'a pas d'anchor d'entrée (node source)
 * - Possède un anchor de sortie
 * - Peut être déclenchée manuellement via une fonction
 * - Émet un signal qui se propage dans le graphe
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import { getSignalSystem } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { buildNodeCardHTML } from './templates/nodeCard';

// Map pour stocker les références et le mode des nodes trigger
type TriggerMode = 'pulse' | 'continuous';
// Map pour stocker les références aux nodes trigger et leur mode
type TriggerEntry = {
  mode: 'continuous' | 'pulse';
  defaultData?: any;
};

const triggerNodes = new Map<number, TriggerEntry>();

/**
 * Fonction helper pour déclencher manuellement une node trigger
 */
export function triggerNode(
  nodeId: number,
  data?: any,
  options?: { mode?: TriggerMode; state?: 'start' | 'stop' }
): void {
  logger.info(`[Trigger] Déclenchement manuel de la node ${nodeId}`);

  const signalSystem = getSignalSystem();
  if (!signalSystem) {
    logger.error('[Trigger] Signal system not initialized');
    return;
  }

  const entry = triggerNodes.get(nodeId);
  const mode = entry?.mode || 'pulse';
  const payload = data ?? entry?.defaultData;

  if (mode === 'continuous') {
    // Signal manuel : source = 'manual', s'arrête uniquement par toggle manuel
    signalSystem
      .toggleContinuousSignal(nodeId, payload, undefined, { 
        forceState: options?.state,
        source: 'manual',
        originNodeId: nodeId,
      })
      .catch((err) => logger.error('[Trigger] Continuous toggle failed', err));
    return;
  }

  signalSystem.emitSignal(nodeId, payload);
}

/**
 * Fonction helper pour déclencher toutes les nodes trigger
 */
export function triggerAll(data?: any): void {
  logger.info('[Trigger] Déclenchement de toutes les nodes trigger');

  const signalSystem = getSignalSystem();
  if (!signalSystem) {
    logger.error('[Trigger] Signal system not initialized');
    return;
  }

  for (const [nodeId, entry] of triggerNodes.entries()) {
    const payload = data ?? entry.defaultData;
    if (entry.mode === 'continuous') {
      signalSystem.toggleContinuousSignal(nodeId, payload).catch((err) =>
        logger.error('[Trigger] Continuous toggle failed', err)
      );
      continue;
    }
    signalSystem.emitSignal(nodeId, payload);
  }
}

const TRIGGER_NODE_ACCENT = '#2196F3';

const TriggerNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'input.trigger',
  name: 'Trigger',
  description: 'Déclenche manuellement un signal dans le graphe',
  category: 'Control',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'play-circle',
  iconFamily: 'material',
  color: TRIGGER_NODE_ACCENT,

  // ============================================================================
  // INPUTS/OUTPUTS - Pas d'input, uniquement output
  // ============================================================================
  inputs: [],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal émis lors du déclenchement',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    autoTrigger: false, // Déclencher automatiquement au démarrage
    autoTriggerDelay: 0, // Délai avant déclenchement auto (ms)
    triggerData: {}, // Données à inclure dans le signal
    continuousMode: true, // Mode interrupteur (start/stop signal continu)
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const autoTrigger = settings.autoTrigger === true;
      const autoTriggerDelay = settings.autoTriggerDelay || 0;
        const triggerData = settings.triggerData || {};
        const continuousMode = settings.continuousMode !== false;

      // Enregistrer cette node comme trigger
      triggerNodes.set(context.nodeId, {
        mode: continuousMode ? 'continuous' : 'pulse',
        defaultData: triggerData,
      });

      // Auto-déclenchement si activé
      if (autoTrigger) {
        logger.debug(
          `[Trigger Node ${context.nodeId}] Auto-déclenchement dans ${autoTriggerDelay}ms`
        );
        setTimeout(() => {
          triggerNode(context.nodeId, triggerData);
        }, autoTriggerDelay);
      }

      return {
        success: true,
        outputs: {
          signal_out: 'Trigger node registered',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        outputs: {},
      };
    }
  },

  // ============================================================================
  // VALIDATION
  // ============================================================================
  validate: (_context: NodeExecutionContext): boolean | string => {
    const signalSystem = getSignalSystem();
    if (!signalSystem) {
      return 'Signal system not initialized';
    }
    return true;
  },

  // ============================================================================
  // HTML (pour l'affichage dans le graphe)
  // ============================================================================
  generateHTML: (_settings: Record<string, any>, nodeMeta?: NodeMeta): string => {
    const continuous = _settings?.continuousMode !== false;
    return buildNodeCardHTML({
      title: 'Trigger',
      subtitle: continuous ? 'Mode interrupteur' : 'Impulsion',
      iconName: 'play_circle',
      category: nodeMeta?.category || 'Input',
      accentColor: TRIGGER_NODE_ACCENT,
      description: continuous
        ? 'Appui 1: ON (écoute), Appui 2: OFF'
        : 'Émet une impulsion unique.',
      chips: [{ label: continuous ? 'Toggle' : 'Pulse', tone: continuous ? 'info' : 'default' }],
    });
  },
};

// Enregistrer la node
registerNode(TriggerNode);

export default TriggerNode;
