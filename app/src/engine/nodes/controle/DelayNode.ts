/**
 * DelayNode - Node de délai temporel
 *
 * Catégorie: Flow Control
 *
 * Cette node introduit un délai avant de propager le signal.
 * Utile pour créer des séquences temporisées.
 *
 * Fonctionnement:
 * - Reçoit un signal
 * - Attend pendant un délai configuré
 * - Propage le signal après le délai
 */

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../../types/node.types';
import { getSignalSystem, type Signal } from '../../SignalSystem';
import { buildNodeCardHTML } from '../nodeCard';

const formatDelayDisplay = (delayMs: number): string => {
  const totalSeconds = delayMs / 1000;
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    const minutePart = `${minutes}m`;
    const secondsPart =
      seconds > 0 ? `${Number.isInteger(seconds) ? seconds : Number(seconds.toFixed(2))}s` : '';
    return secondsPart ? `${minutePart} ${secondsPart}` : minutePart;
  }

  const secondsValue = Number.isInteger(totalSeconds)
    ? totalSeconds
    : Number(totalSeconds.toFixed(2));
  return `${secondsValue}s`;
};

const DelayNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'flow.delay',
  name: 'Delay',
  description: 'Introduit un délai avant de propager le signal',
  category: 'Control',
  doc: `excerpt: Attend une certaine durée avant de continuer.
---
Ce bloc pause votre flux pendant un temps que vous définissez. C'est utile pour créer des délais entre deux actions ou laisser le temps au téléphone de faire quelque chose.

**Comment l'utiliser :**
1. Entrez le délai en millisecondes (par exemple 1000 = 1 seconde)
2. Ou entrez directement en secondes (par ex. 2s = 2 secondes)
3. Le bloc attend ce temps puis continue vers l'action suivante
4. Parfait pour créer des séquences avec du timing !`,

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'schedule',
  iconFamily: 'material',

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    delayMs: 1000, // Délai en millisecondes
    useVariableDelay: false, // Utiliser une variable pour le délai
    delayVariableName: '', // Nom de la variable contenant le délai
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const signalSystem = getSignalSystem();

      // Pending delayed propagations par sourceNodeId
      const pendingDelays: Map<
        number,
        Array<{ timeoutId: ReturnType<typeof setTimeout> }>
      > = new Map();
      // Sources qui ont déclenché une activation de cette node (pour pouvoir désactiver si la source s'arrête)
      const activeTriggerSources = new Set<number>();

      if (signalSystem) {
        signalSystem.registerHandler(context.nodeId, async (signal: Signal) => {
          // Si on reçoit un OFF, annuler tous les délais en attente venant de cette source
          if (signal.state === 'OFF') {
            const pending = pendingDelays.get(signal.sourceNodeId);
            if (pending && pending.length) {
              for (const p of pending) {
                try {
                  clearTimeout(p.timeoutId);
                } catch (e) {
                  // ignore
                }
              }
              pendingDelays.delete(signal.sourceNodeId);
            }

            // Si cette source avait activé cette node, la désactiver
            if (activeTriggerSources.has(signal.sourceNodeId)) {
              try {
                await signalSystem.deactivateNode(context.nodeId);
              } catch (e) {
                // ignore
              }
              activeTriggerSources.delete(signal.sourceNodeId);
            }

            return { propagate: true, state: 'OFF', data: signal.data };
          }

          try {
            let delayMs: number;

            // Priorité 1: Valeur de l'input (si modifiée par l'utilisateur)
            if (context.inputs.delay_ms !== undefined) {
              delayMs = Number(context.inputs.delay_ms);
            }
            // Priorité 2: Variable dynamique
            else if (settings.useVariableDelay && settings.delayVariableName) {
              delayMs = Number(
                signalSystem.getVariable(settings.delayVariableName, settings.delayMs)
              );
            }
            // Priorité 3: Valeur par défaut des settings
            else {
              delayMs = settings.delayMs || 1000;
            }

            delayMs = Math.max(0, delayMs);

            // planifier l'activation sans bloquer

            // Planifier l'activation différée sans bloquer la propagation source
            const timeoutId = setTimeout(async () => {
              // Si la source n'est plus ON, on annule
              const sourceState = signalSystem.getNodeState(signal.sourceNodeId);
              if (sourceState !== 'ON') return;

              // Activer cette node (cela propagera ensuite vers les sorties)
              try {
                // Marquer que cette activation vient de cette source pour permettre le OFF
                activeTriggerSources.add(signal.sourceNodeId);
                await signalSystem.activateNode(
                  context.nodeId,
                  { ...signal.data, delayApplied: delayMs },
                  signal.context,
                  {
                    forcePropagation: true,
                  }
                );
              } catch (e) {
                console.error(`[Delay Node ${context.nodeId}] Error activating delayed node:`, e);
              }
            }, delayMs);

            // Stocker le timeout pour pouvoir l'annuler
            const arr = pendingDelays.get(signal.sourceNodeId) ?? [];
            arr.push({ timeoutId });
            pendingDelays.set(signal.sourceNodeId, arr);

            // Ne pas propager immédiatement
            return { propagate: false };
          } catch (error) {
            console.error(`[Delay Node ${context.nodeId}] Error:`, error);
            return { propagate: false };
          }
        });
      }

      return { outputs: {}, success: true };
    } catch (error) {
      return { outputs: {}, success: false, error: String(error) };
    }
  },

  // ============================================================================
  // HTML PERSONNALISÉ
  // ============================================================================
  generateHTML: (settings: Record<string, any>, nodeMeta?: Record<string, any>) => {
    const delayMs = Number.isFinite(Number(settings.delayMs)) ? Number(settings.delayMs) : 1000;
    const safeDelay = Math.max(0, delayMs);

    return buildNodeCardHTML({
      title: 'Delay',
      iconName: 'schedule',
      category: 'Control',
      nodeId: nodeMeta?.id, // Utiliser l'ID du node pour identifier les messages
      inputs: [
        {
          type: 'number',
          name: 'delay_ms',
          label: 'Délai (ms)',
          value: safeDelay,
          min: 0,
          max: 60000, // Max 60 secondes
          step: 100,
        },
      ],
    });
  },
};

// Enregistrer la node
registerNode(DelayNode);

export default DelayNode;
