import { registerConditionNode } from '../ConditionHandler';
import {
  getVoiceRecognitionManager,
  matchesKeyword,
  type VoiceRecognitionResult,
} from '../../../utils/voiceRecognition';

// État de la reconnaissance vocale par node
interface VoiceKeywordNodeState {
  keyword: string;
  exactMatch: boolean;
  isListening: boolean;
  unsubscribe: (() => void) | null;
}

const voiceKeywordStates = new Map<number, VoiceKeywordNodeState>();

// Fonction pour initialiser l'état de la node
function initVoiceKeywordState(nodeId: number, config: any): VoiceKeywordNodeState {
  const state: VoiceKeywordNodeState = {
    keyword: config.keyword || 'LUCA',
    exactMatch: config.exactMatch ?? false,
    isListening: false,
    unsubscribe: null,
  };
  voiceKeywordStates.set(nodeId, state);
  return state;
}

// Fonction pour nettoyer l'état
function cleanupVoiceKeywordState(nodeId: number): void {
  const state = voiceKeywordStates.get(nodeId);
  if (state?.unsubscribe) {
    try {
      state.unsubscribe();
    } catch (error) {
      console.warn(`[VoiceKeyword] Error cleaning up listener for node ${nodeId}`, error);
    }
  }
  voiceKeywordStates.delete(nodeId);
}

// Fonction pour démarrer l'écoute active
async function startVoiceListening(
  nodeId: number,
  state: VoiceKeywordNodeState,
  onConditionChange: (detected: boolean) => void
): Promise<boolean> {
  if (state.isListening) return true;

  const manager = getVoiceRecognitionManager();

  // S'abonner aux résultats de reconnaissance vocale
  const unsubscribe = manager.onResult((result: VoiceRecognitionResult) => {
    const matches = matchesKeyword(result.transcript, state.keyword, {
      caseSensitive: false,
      exactMatch: state.exactMatch,
    });

    console.log(
      `[VoiceKeyword Node ${nodeId}] Transcript: "${result.transcript}" | Keyword: "${state.keyword}" | Matches: ${matches}`
    );

    // Si le mot-clé est détecté (en tenant compte de l'inversion)
    if (matches && result.isFinal) {
      console.log(
        `[VoiceKeyword Node ${nodeId}] Keyword "${state.keyword}" detected! Triggering condition.`
      );
      onConditionChange(true);
    }
  });

  state.unsubscribe = unsubscribe;

  // Démarrer l'écoute si pas déjà active
  if (!manager.isCurrentlyListening()) {
    const started = await manager.startListening();
    if (!started) {
      unsubscribe();
      return false;
    }
  }

  state.isListening = true;
  console.log(`[VoiceKeyword Node ${nodeId}] Started listening for keyword "${state.keyword}"`);
  return true;
}

// Fonction pour arrêter l'écoute
async function stopVoiceListening(nodeId: number, state: VoiceKeywordNodeState): Promise<void> {
  if (!state.isListening) return;

  if (state.unsubscribe) {
    try {
      state.unsubscribe();
    } catch (error) {
      console.warn(`[VoiceKeyword] Error unsubscribing from voice results`, error);
    }
  }

  state.isListening = false;

  // Si plus aucun listener actif, arrêter la reconnaissance vocale
  let hasOtherListeners = false;
  for (const [id, s] of voiceKeywordStates) {
    if (id !== nodeId && s.isListening) {
      hasOtherListeners = true;
      break;
    }
  }

  if (!hasOtherListeners) {
    const manager = getVoiceRecognitionManager();
    await manager.stopListening();
    console.log('[VoiceKeyword] No more listeners, stopped voice recognition');
  }
}

// Pour les tests
export function clearVoiceKeywordRegistry(): void {
  voiceKeywordStates.forEach((_, nodeId) => {
    cleanupVoiceKeywordState(nodeId);
  });
  voiceKeywordStates.clear();
}

export function getActiveListenersCount(): number {
  let count = 0;
  for (const state of voiceKeywordStates.values()) {
    if (state.isListening) {
      count++;
    }
  }
  return count;
}

const VoiceKeywordConditionNode = registerConditionNode({
  id: 'condition.voice_keyword',
  name: 'Voice Keyword',
  description: 'Propage le signal lorsque le mot-clé vocal est détecté (ex: "LUCA")',
  icon: 'mic',
  iconFamily: 'material',

  // État de la condition
  checkCondition: () => false, // La détection vocale est basée sur les événements externes
  getSignalData: () => ({ voiceKeywordDetected: true }),
  waitingForLabel: 'keyword',

  // Inputs additionnels personnalisés
  inputs: [
    {
      type: 'text',
      name: 'keyword',
      label: 'Keyword',
      description: 'Mot-clé à détecter dans la reconnaissance vocale',
      value: 'LUCA',
    },
    {
      type: 'switch',
      name: 'exact_match',
      label: 'Correspondance exacte',
      value: false,
    },
  ],

  // Configuration de l'abonnement externe pour la reconnaissance vocale
  externalSubscription: {
    subscribe: (nodeId: number, settings: any, onConditionChange: (detected: boolean) => void) => {
      // Initialiser l'état
      const config = {
        keyword: settings.keyword || 'LUCA',
        exactMatch: settings.exact_match ?? false,
      };
      const state = initVoiceKeywordState(nodeId, config);

      // Démarrer l'écoute
      startVoiceListening(nodeId, state, onConditionChange).catch((error) => {
        console.warn(`[VoiceKeyword Node ${nodeId}] Failed to start listening`, error);
      });

      // Retourner la fonction de désabonnement
      return () => {
        stopVoiceListening(nodeId, state).catch((error) => {
          console.warn(`[VoiceKeyword Node ${nodeId}] Failed to stop listening`, error);
        });
        cleanupVoiceKeywordState(nodeId);
      };
    },
  },

  // Settings additionnels
  additionalSettings: {
    keyword: 'LUCA',
    exact_match: false,
  },
});

export default VoiceKeywordConditionNode;
