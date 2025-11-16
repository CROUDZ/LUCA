/**
 * ConfirmNode - Node d'interaction qui demande une confirmation
 * Question typique: "Continuer l'itération ?"
 *
 * Catégorie: Interaction
 */

import { registerNode } from '../NodeRegistry';
import { logger } from '../../utils/logger';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { Alert } from 'react-native';

const ConfirmNode: NodeDefinition = {
  id: 'action.confirm',
  name: 'Confirm',
  description: "Affiche une question de confirmation (ex: 'Continuer l’itération ?')",
  category: 'Interaction',

  icon: 'help-outline',
  iconFamily: 'material',
  color: '#3F51B5',

  inputs: [
    { name: 'signal_in', type: 'any', label: 'Signal In', description: 'Signal d\'entrée', required: false },
  ],
  outputs: [
    { name: 'signal_out', type: 'any', label: 'Signal Out', description: 'Signal de sortie en cas de confirmation' },
  ],

  defaultSettings: {
    question: "Continuer l’itération ?",
    confirmLabel: 'Oui',
    cancelLabel: 'Non',
    autoConfirm: false, // pour tests automatisés on peut forcer
  },

  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const settings = context.settings || {};
      const signalSystem = getSignalSystem();

      if (signalSystem) {
        signalSystem.registerHandler(
          context.nodeId,
          async (signal: Signal): Promise<SignalPropagation> => {
            try {
              const question = settings.question || "Continuer l'itération ?";
              const confirmLabel = settings.confirmLabel || 'Oui';
              const cancelLabel = settings.cancelLabel || 'Non';
              const autoConfirm = Boolean(settings.autoConfirm);

              if (autoConfirm) {
                logger.debug(`[Confirm Node ${context.nodeId}] autoConfirm=true -> propagation`);
                return { propagate: true, data: { ...signal.data, confirmed: true } };
              }

              // Show a confirmation dialog and wait for user's choice.
              return await new Promise((resolve) => {
                try {
                  Alert.alert(question, undefined, [
                    { text: cancelLabel, onPress: () => resolve({ propagate: false, data: signal.data }) },
                    { text: confirmLabel, onPress: () => resolve({ propagate: true, data: { ...signal.data, confirmed: true } }) },
                  ], { cancelable: true });
                } catch (err) {
                  logger.warn(`[Confirm Node ${context.nodeId}] Alert not available`, err);
                  // If no Alert is available (tests or environment), do not propagate by default
                  resolve({ propagate: false, data: signal.data });
                }
              });
            } catch (error) {
              logger.error(`[Confirm Node ${context.nodeId}] Error:`, error);
              return { propagate: false };
            }
          }
        );
      }

      return { outputs: {}, success: true };
    } catch (error) {
      return { outputs: {}, success: false, error: String(error) };
    }
  },
};

registerNode(ConfirmNode);

export default ConfirmNode;
