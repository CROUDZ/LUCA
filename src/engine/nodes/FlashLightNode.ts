/**
 * FlashLightNode - Node de condition qui vérifie l'état de la lampe torche
 * 
 * Catégorie: Condition
 * 
 * Cette node surveille l'état de la lampe torche du téléphone et propage
 * le signal uniquement lorsque la lampe torche est activée.
 * 
 * Fonctionnement:
 * - Reçoit un signal sur son anchor d'entrée
 * - Vérifie si la lampe torche est activée
 * - Si activée: propage le signal vers l'anchor de sortie
 * - Si désactivée: bloque le signal
 */

import { registerNode } from '../NodeRegistry';
import type { 
  NodeDefinition, 
  NodeExecutionContext, 
  NodeExecutionResult 
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';

// Note: Dans une vraie application, on utiliserait react-native-torch ou une API native
// Pour cet exemple, on simule l'état de la lampe torche
let flashlightEnabled = false;

// Fonction helper pour définir l'état de la lampe (pour tests/démo)
export function setFlashlightState(enabled: boolean): void {
  flashlightEnabled = enabled;
  console.log(`[FlashLight] État de la lampe torche: ${enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
}

// Fonction helper pour obtenir l'état
export function getFlashlightState(): boolean {
  return flashlightEnabled;
}

const FlashLightNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'condition.flashlight',
  name: 'FlashLight',
  description: 'Propage le signal uniquement si la lampe torche du téléphone est activée',
  category: 'Condition',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'flashlight-on',
  iconFamily: 'material',
  color: '#FFC107',

  // ============================================================================
  // INPUTS/OUTPUTS - Un anchor d'entrée et un de sortie
  // ============================================================================
  inputs: [
    {
      name: 'signal_in',
      type: 'any',
      label: 'Signal In',
      description: 'Signal d\'entrée',
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal de sortie (propagé si lampe activée)',
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    checkInterval: 100, // Intervalle de vérification en ms (pour usage futur)
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      // Enregistrer le handler de signal pour cette node
      const signalSystem = getSignalSystem();
      
      if (signalSystem) {
        signalSystem.registerHandler(context.nodeId, async (signal: Signal): Promise<SignalPropagation> => {
          console.log(`[FlashLight Node ${context.nodeId}] Signal reçu:`, signal);
          
          // Vérifier l'état de la lampe torche
          const isFlashlightOn = getFlashlightState();
          
          if (isFlashlightOn) {
            console.log(`[FlashLight Node ${context.nodeId}] ✓ Lampe torche ACTIVÉE - Signal propagé`);
            return {
              propagate: true,
              data: {
                ...signal.data,
                flashlightChecked: true,
                flashlightState: true,
              },
            };
          } else {
            console.log(`[FlashLight Node ${context.nodeId}] ✗ Lampe torche DÉSACTIVÉE - Signal bloqué`);
            return {
              propagate: false,
              data: signal.data,
            };
          }
        });
      }

      return {
        success: true,
        outputs: {
          signal_out: 'FlashLight condition registered',
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
        <span class="node-icon">💡</span> FlashLight
      </div>
      <div class="content">
        Check torch status
      </div>
    `;
  },
};

// Enregistrer la node
registerNode(FlashLightNode);

export default FlashLightNode;
