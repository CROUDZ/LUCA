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

  // Validation : vérifier si des ColorScreen nodes n'ont pas de conditions après elles
  if (signalSystem.graph) {
    const colorScreenNodes: number[] = [];
    
    // Trouver toutes les ColorScreen nodes dans le graphe
    signalSystem.graph.nodes.forEach((node) => {
      if (node.type === 'action.colorscreen') {
        colorScreenNodes.push(node.id);
      }
    });

    // Vérifier chaque ColorScreen
    for (const colorScreenId of colorScreenNodes) {
      const colorScreenNode = signalSystem.graph.nodes.get(colorScreenId);
      if (!colorScreenNode) continue;

      // Vérifier si elle a des sorties
      if (colorScreenNode.outputs.length === 0) {
        // Import Alert seulement si nécessaire
        const { Alert } = require('react-native');
        Alert.alert(
          '⚠️ Configuration incorrecte',
          `La node Color Screen (ID: ${colorScreenId}) n'a pas de condition après elle.\n\nL'écran restera affiché indéfiniment jusqu'à ce qu'une condition stop le signal.\n\nAjoutez une node Condition (ex: FlashLight Condition) après Color Screen pour contrôler quand l'écran se ferme.`,
          [{ text: 'OK' }]
        );
        return; // Ne pas lancer le trigger
      }

      // Vérifier si au moins une sortie est une condition
      const hasConditionAfter = colorScreenNode.outputs.some((outputId) => {
        const outputNode = signalSystem.graph?.nodes.get(outputId);
        return outputNode && outputNode.type.includes('condition');
      });

      if (!hasConditionAfter) {
        const { Alert } = require('react-native');
        Alert.alert(
          '⚠️ Configuration recommandée',
          `La node Color Screen (ID: ${colorScreenId}) devrait être suivie d'une node Condition.\n\nSans condition, l'écran ne se fermera pas automatiquement.\n\nVoulez-vous continuer quand même ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Continuer', 
              onPress: () => {
                // Continuer le déclenchement
                executeTrigger(nodeId, data, options, signalSystem);
              }
            }
          ]
        );
        return; // Attendre la décision de l'utilisateur
      }
    }
  }

  executeTrigger(nodeId, data, options, signalSystem);
}

/**
 * Fonction interne pour exécuter le trigger
 */
function executeTrigger(
  nodeId: number,
  data: any,
  options: { mode?: TriggerMode; state?: 'start' | 'stop' } | undefined,
  signalSystem: any
): void {
  const entry = triggerNodes.get(nodeId);
  const mode = entry?.mode || 'pulse';
  const payload = data ?? entry?.defaultData;

  if (mode === 'continuous') {
    // Mode continu : toggle entre ON et OFF
    // Pour les triggers, toujours forcer la propagation pour démarrer un nouveau cycle
    if (options?.state === 'start') {
      signalSystem.activateNode(nodeId, payload, undefined, { forcePropagation: true }).catch((err: any) => logger.error('[Trigger] Activation failed', err));
    } else if (options?.state === 'stop') {
      signalSystem.deactivateNode(nodeId, payload, undefined, { forcePropagation: true }).catch((err: any) => logger.error('[Trigger] Deactivation failed', err));
    } else {
      // Toggle avec force propagation pour démarrer un nouveau cycle
      signalSystem.toggleNode(nodeId, payload, undefined, { forcePropagation: true }).catch((err: any) => logger.error('[Trigger] Toggle failed', err));
    }
    return;
  }

  // Mode pulse : ON puis OFF rapide
  signalSystem.pulseNode(nodeId, payload).catch((err: any) => logger.error('[Trigger] Pulse failed', err));
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
      signalSystem
        .toggleNode(nodeId, payload, undefined, { forcePropagation: true })
        .catch((err) => logger.error('[Trigger] Toggle failed', err));
      continue;
    }
    signalSystem.pulseNode(nodeId, payload).catch((err) => logger.error('[Trigger] Pulse failed', err));
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
    return buildNodeCardHTML({
      title: 'Trigger',
      subtitle: 'Point de départ',
      iconName: 'play_circle',
      category: nodeMeta?.category || 'Control',
      accentColor: TRIGGER_NODE_ACCENT,
      description: 'Démarrez le programme avec le bouton PLAY en bas',
      chips: [{ label: '▶ Start', tone: 'info' }],
    });
  },
};

// Enregistrer la node
registerNode(TriggerNode);

export default TriggerNode;
