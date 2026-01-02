/**
 * ConfirmNode - Node d'interaction qui demande une confirmation
 * Question typique: "Continuer l'itération ?"
 *
 * Catégorie: Interaction
 */

import { registerNode } from '../../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../../SignalSystem';
import { Alert, AppState, InteractionManager } from 'react-native';
import type { AppStateStatus, NativeEventSubscription } from 'react-native';

const ACTIVITY_WAIT_TIMEOUT_MS = 2000;

async function waitForActiveAppState(
  nodeId: number,
  timeoutMs = ACTIVITY_WAIT_TIMEOUT_MS
): Promise<boolean> {
  try {
    if (!AppState?.addEventListener) {
      return true;
    }

    const currentState = AppState.currentState;

    if (!currentState || currentState === 'active') {
      return true;
    }

    console.log(
      `[Confirm Node ${nodeId}] AppState=${currentState} → attente d'une activité active avant d'afficher l'alerte`
    );

    return await new Promise<boolean>((resolve) => {
      let resolved = false;
      let subscription: NativeEventSubscription | undefined;

      const finish = (canShow: boolean) => {
        if (resolved) {
          return;
        }
        resolved = true;
        subscription?.remove?.();
        clearTimeout(timer);
        resolve(canShow);
      };

      const timer = setTimeout(() => {
        console.warn(
          `[Confirm Node ${nodeId}] Aucune activité active après ${timeoutMs}ms, annulation de l'alerte`
        );
        finish(false);
      }, timeoutMs);

      const handleChange = (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          clearTimeout(timer);
          finish(true);
        }
      };

      subscription = AppState.addEventListener('change', handleChange);
    });
  } catch (error) {
    console.warn(
      `[Confirm Node ${nodeId}] Impossible de vérifier AppState, tentative d'afficher l'alerte quand même`,
      error
    );
    return true;
  }
}

function runAfterUIReady(callback: () => void) {
  if (InteractionManager?.runAfterInteractions) {
    InteractionManager.runAfterInteractions(callback);
    return;
  }

  callback();
}

async function promptConfirmation({
  question,
  confirmLabel,
  cancelLabel,
  signal,
  nodeId,
  waitTimeoutMs,
}: {
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  signal: Signal;
  nodeId: number;
  waitTimeoutMs?: number;
}): Promise<SignalPropagation> {
  const canShowAlert = await waitForActiveAppState(
    nodeId,
    waitTimeoutMs ?? ACTIVITY_WAIT_TIMEOUT_MS
  );

  if (!canShowAlert) {
    return { propagate: false, data: signal.data };
  }

  return await new Promise<SignalPropagation>((resolve) => {
    const presentAlert = () => {
      try {
        Alert.alert(
          question,
          undefined,
          [
            { text: cancelLabel, onPress: () => resolve({ propagate: false, data: signal.data }) },
            {
              text: confirmLabel,
              onPress: () =>
                resolve({ propagate: true, data: { ...signal.data, confirmed: true } }),
            },
          ],
          { cancelable: true }
        );
      } catch (err) {
        console.warn(`[Confirm Node ${nodeId}] Alert not available`, err);
        resolve({ propagate: false, data: signal.data });
      }
    };

    runAfterUIReady(presentAlert);
  });
}

const ConfirmNode: NodeDefinition = {
  id: 'action.confirm',
  name: 'Confirm',
  description: "Affiche une question de confirmation (ex: 'Continuer l’itération ?')",
  category: 'Control',

  icon: 'help-outline',
  iconFamily: 'material',
  color: '#3F51B5',

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
      description: 'Signal de sortie en cas de confirmation',
    },
  ],

  defaultSettings: {
    question: 'Continuer l’itération ?',
    confirmLabel: 'Oui',
    cancelLabel: 'Non',
    autoConfirm: false, // pour tests automatisés on peut forcer
    activityWaitTimeoutMs: ACTIVITY_WAIT_TIMEOUT_MS,
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
              // Ne traiter que les signaux ON
              if (signal.state === 'OFF') {
                return { propagate: true, state: 'OFF', data: signal.data };
              }

              const question = settings.question || "Continuer l'itération ?";
              const confirmLabel = settings.confirmLabel || 'Oui';
              const cancelLabel = settings.cancelLabel || 'Non';
              const autoConfirm = Boolean(settings.autoConfirm);
              const activityWaitTimeoutMs =
                typeof settings.activityWaitTimeoutMs === 'number'
                  ? Math.max(0, settings.activityWaitTimeoutMs)
                  : undefined;

              if (autoConfirm) {
                console.log(`[Confirm Node ${context.nodeId}] autoConfirm=true -> propagation`);
                return { propagate: true, state: 'ON', data: { ...signal.data, confirmed: true } };
              }

              return await promptConfirmation({
                question,
                confirmLabel,
                cancelLabel,
                signal,
                nodeId: context.nodeId,
                waitTimeoutMs: activityWaitTimeoutMs,
              });
            } catch (error) {
              console.error(`[Confirm Node ${context.nodeId}] Error:`, error);
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
