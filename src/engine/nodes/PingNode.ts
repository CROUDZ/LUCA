/**
 * PingNode - Node d'action qui affiche "PING" sur le téléphone
 *
 * Catégorie: Action
 *
 * Cette node reçoit un signal et affiche un message "PING" sur le téléphone.
 * Elle peut également propager le signal vers d'autres nodes si nécessaire.
 *
 * Fonctionnement:
 * - Reçoit un signal sur son anchor d'entrée
 * - Affiche "PING" dans la console et via une alerte/notification
 * - Propage le signal vers l'anchor de sortie (optionnel)
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { Alert } from 'react-native';
import { buildNodeCardHTML } from './templates/nodeCard';

// Compteur de pings pour les statistiques
let pingCount = 0;

// Fonction helper pour obtenir le nombre de pings
export function getPingCount(): number {
  return pingCount;
}

// Fonction helper pour réinitialiser le compteur
export function resetPingCount(): void {
  pingCount = 0;
  logger.debug('[Ping] Compteur de pings réinitialisé');
}

const PING_NODE_ACCENT = '#4CAF50';

const PingNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'action.ping',
  name: 'Ping',
  description: 'Affiche "PING" sur le téléphone lorsqu\'un signal est reçu',
  category: 'Action',

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'notifications-active',
  iconFamily: 'material',
  color: PING_NODE_ACCENT,

  // ============================================================================
  // INPUTS/OUTPUTS
  // ============================================================================
  inputs: [
    {
      name: 'signal_in',
      type: 'any',
      label: 'Signal In',
      description: "Signal d'entrée qui déclenche le ping",
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: "Signal de sortie (pour chaîner avec d'autres actions)",
    },
  ],

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  defaultSettings: {
    showAlert: true, // Afficher une alerte native
    propagateSignal: true, // Propager le signal après l'action
    message: 'PING', // Message personnalisable
  },

  // ============================================================================
  // EXÉCUTION
  // ============================================================================
  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const showAlert = settings.showAlert !== false;
      const propagateSignal = settings.propagateSignal !== false;
      const message = settings.message || 'PING';

      // Enregistrer le handler de signal pour cette node
      const signalSystem = getSignalSystem();

      if (signalSystem) {
        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            logger.debug(`[Ping Node ${context.nodeId}] Signal reçu:`, signal);

            // Incrémenter le compteur
            pingCount++;

            // Log messages
            logger.debug(`\n${'='.repeat(50)}`);
            logger.info(`🔔 ${message.toUpperCase()} #${pingCount}`);
            logger.debug(`Node ID: ${context.nodeId}`);
            logger.debug(`Timestamp: ${new Date(signal.timestamp).toISOString()}`);
            logger.debug(`Source Node: ${signal.sourceNodeId}`);
            if (signal.data) {
              logger.debug(`Data:`, JSON.stringify(signal.data, null, 2));
            }
            logger.debug(`${'='.repeat(50)}\n`);

            // Afficher une alerte native si activé
            if (showAlert) {
              try {
                Alert.alert(
                  '🔔 Ping!',
                  `${message}\n\nNode: ${context.nodeId}\nCount: ${pingCount}`,
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (error) {
                logger.warn('[Ping] Alert non disponible (probablement en mode test):', error);
              }
            }

            // Décider si on propage le signal
            if (propagateSignal) {
              logger.debug(`[Ping Node ${context.nodeId}] ✓ Signal propagé`);
              return {
                propagate: true,
                data: {
                  ...signal.data,
                  pingExecuted: true,
                  pingCount,
                  pingMessage: message,
                },
              };
            } else {
              logger.debug(
                `[Ping Node ${context.nodeId}] ⊗ Signal arrêté (propagation désactivée)`
              );
              return {
                propagate: false,
                data: signal.data,
              };
            }
          }
        );
      }

      return {
        success: true,
        outputs: {
          signal_out: `Ping action registered (count: ${pingCount})`,
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
  generateHTML: (settings: Record<string, any>): string => {
    const message = settings?.message || 'PING';
    return buildNodeCardHTML({
      title: 'Ping',
      subtitle: message,
      iconName: 'notifications_active',
      category: 'Action',
      accentColor: PING_NODE_ACCENT,
      description: 'Émet un signal de test pour valider une portion de graphe.',
    });
  },
};

// Enregistrer la node
registerNode(PingNode);

export default PingNode;
