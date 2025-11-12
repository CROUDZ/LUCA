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
} from '../../types/node.types';
import { getSignalSystem } from '../SignalSystem';

// Map pour stocker les références aux nodes trigger
const triggerNodes = new Map<number, () => void>();

/**
 * Fonction helper pour déclencher manuellement une node trigger
 */
export function triggerNode(nodeId: number, data?: any): void {
  console.log(`[Trigger] Déclenchement manuel de la node ${nodeId}`);

  const signalSystem = getSignalSystem();
  if (!signalSystem) {
    console.error('[Trigger] Signal system not initialized');
    return;
  }

  // Émettre le signal
  signalSystem.emitSignal(nodeId, data);
}

/**
 * Fonction helper pour déclencher toutes les nodes trigger
 */
export function triggerAll(data?: any): void {
  console.log('[Trigger] Déclenchement de toutes les nodes trigger');

  const signalSystem = getSignalSystem();
  if (!signalSystem) {
    console.error('[Trigger] Signal system not initialized');
    return;
  }

  for (const nodeId of triggerNodes.keys()) {
    signalSystem.emitSignal(nodeId, data);
  }
}

const TriggerNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'input.trigger',
  name: 'Trigger',
  description: 'Déclenche manuellement un signal dans le graphe',
  category: 'Input',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'play-circle',
  iconFamily: 'material',
  color: '#2196F3',

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

      // Enregistrer cette node comme trigger
      triggerNodes.set(context.nodeId, () => {
        const signalSystem = getSignalSystem();
        if (signalSystem) {
          signalSystem.emitSignal(context.nodeId, triggerData);
        }
      });

      // Auto-déclenchement si activé
      if (autoTrigger) {
        console.log(
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
  generateHTML: (_settings: Record<string, any>): string => {
    return `
      <div class="title">
        <span class="node-icon">▶️</span> Trigger
      </div>
      <div class="content">
        Start signal
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(TriggerNode);

export default TriggerNode;
