/**
 * ColorScreenNode - Node d'affichage de couleur en plein écran
 *
 * Catégorie: Action
 *
 * Cette node affiche une couleur en plein écran.
 * L'écran reste affiché tant que le signal est ON.
 * L'écran se ferme quand un signal OFF est reçu.
 */

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../SignalSystem';
import { DeviceEventEmitter } from 'react-native';
import { buildNodeCardHTML } from '../nodeCard';


const ColorScreenNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'action.colorscreen',
  name: 'Color Screen',
  description: 'Affiche une couleur en plein écran tant que le signal est actif',
  category: 'Action',
  doc: `excerpt: Remplit l'écran avec une couleur.
---
Ce bloc affiche votre écran entièrement dans la couleur que vous choisissez. C'est utile pour signaler quelque chose visuellement - par exemple en rouge pour une alerte, en vert pour un succès, etc.

**Comment l'utiliser :**
1. Choisissez la couleur que vous voulez afficher
2. Quand le bloc reçoit un signal, l'écran s'affiche avec cette couleur
3. Quand le signal s'arrête, l'écran revient à la normale
4. Parfait pour des alertes visuelles !`,

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'screen-rotation',
  iconFamily: 'material',

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    color: '#FF0000', // Couleur par défaut (rouge)
  },

  settingsFields: [
    {
      name: 'color',
      label: 'Couleur',
      type: 'color' as const,
      defaultValue: '#FF0000',
      description: 'Couleur à afficher en plein écran',
    },
  ],

  // ============================================================================
  // VALIDATION
  // ============================================================================
  validate: (): boolean | string => {
    return true;
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const signalSystem = getSignalSystem();

      if (signalSystem) {
        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            console.log(`[ColorScreen Node ${context.nodeId}] Signal reçu: ${signal.state}`);

            // Signal OFF : fermer l'écran
            if (signal.state === 'OFF') {
              console.log(`[ColorScreen Node ${context.nodeId}] Signal OFF - fermeture de l'écran`);

              try {
                signalSystem?.emitEvent('colorscreen.hide', { nodeId: context.nodeId });
              } catch {
                // ignore
              }
              try {
                DeviceEventEmitter.emit?.('colorscreen.hide', { nodeId: context.nodeId });
              } catch {
                // ignore
              }

              return {
                propagate: true,
                data: { ...(signal.data ?? {}), colorScreenActive: false },
              };
            }

            // Signal ON : afficher l'écran
            try {
              const color = settings.color || '#FF0000';

              console.log(
                `[ColorScreen Node ${context.nodeId}] Signal ON - affichage couleur: ${color}`
              );

              // Afficher l'écran de couleur
              try {
                signalSystem?.emitEvent('colorscreen.show', { nodeId: context.nodeId, color });
              } catch {
                // ignore
              }
              try {
                DeviceEventEmitter.emit?.('colorscreen.show', { nodeId: context.nodeId, color });
              } catch {
                // ignore
              }

              // Propager le signal
              return {
                propagate: true,
                data: {
                  ...(signal?.data ?? {}),
                  colorScreenActive: true,
                  colorScreenColor: color,
                },
              };
            } catch (error) {
              console.error(`[ColorScreen Node ${context.nodeId}] Erreur:`, error);
              return { propagate: false };
            }
          }
        );
      }

      return {
        outputs: {},
        success: true,
      };
    } catch (error) {
      return {
        outputs: {},
        success: false,
        error: String(error),
      };
    }
  },

  // ============================================================================
  // HTML PERSONNALISÉ
  // ============================================================================
  generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta) => {
    const color = settings.color || '#FF0000';

    // Utiliser buildNodeCardHTML uniquement (avec un input de type 'color')
    return buildNodeCardHTML({
      title: 'Color Screen',
      iconName: 'screen-rotation',
      category : 'Action',
      inputs: [
        {
          type: 'color',
          name: 'color',
          label: "Couleur d'écran",
          value: color,
        },
      ],
      nodeId: nodeMeta?.id,
    });
  },
};

// Enregistrer la node
registerNode(ColorScreenNode);

export default ColorScreenNode;
