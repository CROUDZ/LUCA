/**
 * ColorScreenNode - Node d'affichage de couleur en plein écran
 *
 * Catégorie: Action
 *
 * Cette node affiche une couleur en plein écran.
 * L'écran reste affiché tant que le signal est ON.
 * L'écran se ferme quand un signal OFF est reçu.
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { DeviceEventEmitter } from 'react-native';
import { buildNodeCardHTML } from './templates/nodeCard';

const COLOR_SCREEN_NODE_ACCENT = '#9C27B0';

const ColorScreenNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'action.colorscreen',
  name: 'Color Screen',
  description: 'Affiche une couleur en plein écran tant que le signal est actif',
  category: 'Action',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'screen-rotation',
  iconFamily: 'material',
  color: COLOR_SCREEN_NODE_ACCENT,

  // ============================================================================
  // INPUTS/OUTPUTS
  // ============================================================================
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
      description: 'Signal de sortie (propagé automatiquement)',
    },
  ],

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
            logger.debug(`[ColorScreen Node ${context.nodeId}] Signal reçu: ${signal.state}`);

            // Signal OFF : fermer l'écran
            if (signal.state === 'OFF') {
              logger.info(`[ColorScreen Node ${context.nodeId}] Signal OFF - fermeture de l'écran`);
              
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
              
              logger.info(`[ColorScreen Node ${context.nodeId}] Signal ON - affichage couleur: ${color}`);

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
              logger.error(`[ColorScreen Node ${context.nodeId}] Erreur:`, error);
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
    const accentColor = COLOR_SCREEN_NODE_ACCENT;
    const category = nodeMeta?.category || 'Action';
    
    // Utiliser buildNodeCardHTML avec un body personnalisé pour le color picker
    return buildNodeCardHTML({
      title: 'Color Screen',
      subtitle: color,
      iconName: 'screen-rotation',
      category,
      accentColor,
      description: 'Affiche une couleur en plein écran',
      body: `
        <div class="color-screen-control" style="padding: 8px 0;">
          <label style="display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.8;">
            Couleur d'écran
          </label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input 
              type="color" 
              class="color-screen-picker" 
              value="${color}"
              style="width: 50px; height: 32px; border: 2px solid ${accentColor}; border-radius: 6px; cursor: pointer;"
            />
            <input 
              type="text" 
              class="color-screen-input" 
              value="${color}"
              placeholder="#FF0000"
              style="flex: 1; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: white; font-family: monospace; font-size: 13px;"
            />
          </div>
        </div>
      `,
    });
  },
};

// Enregistrer la node
registerNode(ColorScreenNode);

export default ColorScreenNode;
