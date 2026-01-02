import { registerConditionNode } from '../ConditionHandler';
import {
  getVoiceRecognitionManager,
  matchesKeyword,
  type VoiceRecognitionResult,
} from '../../../utils/voiceRecognition';
import { programState } from '../../ProgramState';

// État de la reconnaissance vocale par node
interface VoiceKeywordNodeState {
  keyword: string;
  exactMatch: boolean;
  isListening: boolean;
  unsubscribe: (() => void) | null;
  keywordChanged: boolean;
  onConditionChange: ((detected: boolean) => void) | null; // Callback peut changer à chaque update
}

const voiceKeywordStates = new Map<number, VoiceKeywordNodeState>();

// Fonction pour initialiser ou mettre à jour l'état de la node
function initVoiceKeywordState(nodeId: number, config: any): VoiceKeywordNodeState {
  const existingState = voiceKeywordStates.get(nodeId);
  const newKeyword = config.keyword || 'LUCA';
  const newExactMatch = config.exactMatch ?? false;

  // Si l'état existe déjà, juste mettre à jour le keyword
  if (existingState) {
    const keywordHasChanged = existingState.keyword !== newKeyword || existingState.exactMatch !== newExactMatch;
    existingState.keyword = newKeyword;
    existingState.exactMatch = newExactMatch;
    existingState.keywordChanged = keywordHasChanged;
    return existingState;
  }

  // Créer un nouvel état
  const state: VoiceKeywordNodeState = {
    keyword: newKeyword,
    exactMatch: newExactMatch,
    isListening: false,
    unsubscribe: null,
    keywordChanged: false,
    onConditionChange: null,
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
  // Mettre à jour le callback qui peut changer à chaque appel
  state.onConditionChange = onConditionChange;

  // Si déjà en écoute, pas besoin de recréer le handler
  if (state.isListening) {
    console.log(
      `[VoiceKeyword Node ${nodeId}] Already listening, updated keyword to "${state.keyword}"`
    );
    return true;
  }

  const manager = getVoiceRecognitionManager();

  // If the manager thinks it is listening but no listeners are registered, reset it to avoid a stale state.
  if (getActiveListenersCount() === 0 && manager.isCurrentlyListening()) {
    try {
      await manager.stopListening();
    } catch (error) {
      console.warn('[VoiceKeyword] Failed to reset stale voice recognition state', error);
    }
  }

  // S'abonner aux résultats de reconnaissance vocale
  // Le handler LIT LE KEYWORD depuis le state à chaque appel (pas de capture)
  const unsubscribe = manager.onResult((result: VoiceRecognitionResult) => {
    const currentState = voiceKeywordStates.get(nodeId);
    if (!currentState || !currentState.isListening) return;

    const matches = matchesKeyword(result.transcript, currentState.keyword, {
      caseSensitive: false,
      exactMatch: currentState.exactMatch,
    });

    console.log(
      `[VoiceKeyword Node ${nodeId}] Transcript: "${result.transcript}" | Keyword: "${currentState.keyword}" | Matches: ${matches}`
    );

    // Si le mot-clé est détecté
    if (matches && result.isFinal) {
      console.log(
        `[VoiceKeyword Node ${nodeId}] Keyword "${currentState.keyword}" detected! Triggering condition.`
      );
      currentState.onConditionChange?.(true);
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
  } else {
    console.log(`[VoiceKeyword Node ${nodeId}] Reusing active voice recognition session`);
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

// Arrête toutes les écoutes actives et nettoie les handlers.
async function stopAllVoiceListeners(reason: string = 'cleanup'): Promise<void> {
  const stopTasks: Array<Promise<void>> = [];

  for (const [nodeId, state] of voiceKeywordStates) {
    stopTasks.push(
      stopVoiceListening(nodeId, state).catch((error) => {
        console.warn(`[VoiceKeyword] Error stopping listener for node ${nodeId} (${reason})`, error);
      })
    );
  }

  await Promise.all(stopTasks);
  voiceKeywordStates.clear();

  try {
    const manager = getVoiceRecognitionManager();
    await manager.stopListening();
    console.log(`[VoiceKeyword] Voice recognition stopped (${reason})`);
  } catch (error) {
    console.warn(`[VoiceKeyword] Failed to stop voice recognition (${reason})`, error);
  }
}

// Pour les tests
export function clearVoiceKeywordRegistry(): void {
  void stopAllVoiceListeners('registry clear');
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

programState.subscribe((isRunning) => {
  if (!isRunning) {
    void stopAllVoiceListeners('program stopped');
  }
});

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
      // Initialiser ou mettre à jour l'état (détecte les changements de keyword)
      const config = {
        keyword: settings.keyword || 'LUCA',
        exactMatch: settings.exact_match ?? false,
      };
      const state = initVoiceKeywordState(nodeId, config);

      // Démarrer/relancer l'écoute (prend en compte les changements de keyword)
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
