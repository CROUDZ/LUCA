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

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../SignalSystem';
import { Alert } from 'react-native';
import { buildNodeCardHTML } from '../nodeCard';

// Compteur de pings pour les statistiques
let pingCount = 0;

// Fonction helper pour obtenir le nombre de pings
export function getPingCount(): number {
  return pingCount;
}

// Fonction helper pour réinitialiser le compteur
export function resetPingCount(): void {
  pingCount = 0;
  console.log('[Ping] Compteur de pings réinitialisé');
}

const PingNode: NodeDefinition = {
  // ============================================================================
  // IDENTIFICATION
  // ============================================================================
  id: 'action.ping',
  name: 'Ping',
  description: 'Affiche "PING" sur le téléphone lorsqu\'un signal est reçu',
  category: 'Action',
  doc: `excerpt: Affiche un message pour tester que votre flux fonctionne.
---
Ce bloc est très utile pour vérifier que votre flux fonctionne correctement. Quand il reçoit un signal, il affiche "PING" et compte le nombre de fois qu'il a été déclenché.

**Comment l'utiliser :**
1. Connectez ce bloc à d'autres blocs pour voir quand ils sont activés
2. Il affichera un message confirmant que le signal a bien été reçu
3. Parfait pour déboguer ou tester votre flux !`,

  // ============================================================================
  // APPARENCE
  // ============================================================================
  icon: 'notifications-active',
  iconFamily: 'material',


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
            console.log(`[Ping Node ${context.nodeId}] Signal reçu:`, signal);

            // Si signal OFF, propager sans ping
            if (signal.state === 'OFF') {
              console.log(`[Ping Node ${context.nodeId}] Signal OFF reçu — pas de ping`);
              return {
                propagate: propagateSignal,
                data: { ...signal.data, pingActive: false },
              };
            }

            // Signal ON : faire le ping
            pingCount++;

            // Log messages
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🔔 ${message.toUpperCase()} #${pingCount}`);
            console.log(`Node ID: ${context.nodeId}`);
            console.log(`Timestamp: ${new Date(signal.timestamp).toISOString()}`);
            console.log(`Source Node: ${signal.sourceNodeId}`);
            if (signal.data) {
              console.log(`Data:`, JSON.stringify(signal.data, null, 2));
            }
            console.log(`${'='.repeat(50)}\n`);

            // Afficher une alerte native si activé
            if (showAlert) {
              try {
                Alert.alert(
                  '🔔 Ping!',
                  `${message}\n\nNode: ${context.nodeId}\nCount: ${pingCount}`,
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (error) {
                console.warn('[Ping] Alert non disponible (probablement en mode test):', error);
              }
            }

            // Décider si on propage le signal
            if (propagateSignal) {
              console.log(`[Ping Node ${context.nodeId}] ✓ Signal propagé`);
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
              console.log(`[Ping Node ${context.nodeId}] ⊗ Signal arrêté (propagation désactivée)`);
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
        outputs: {},
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
  generateHTML: (): string => {
    return buildNodeCardHTML({
      title: 'Ping',
      iconName: 'notifications_active',
      category: 'Action',
    });
  },
};

// Enregistrer la node
registerNode(PingNode);

export default PingNode;
