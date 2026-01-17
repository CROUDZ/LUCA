import { registerConditionNode } from '../ConditionHandler';
import {
  getVoiceRecognitionManager,
  type MatchResult,
  type AnalysisOptions,
} from '../../../utils/voiceRecognition';
import { programState } from '../../ProgramState';

// État de la reconnaissance vocale par node
interface VoiceKeywordNodeState {
  target: string | string[];
  analysisOptions: AnalysisOptions;
  isListening: boolean;
  unsubscribeMatch: (() => void) | null;
  unsubscribeResult: (() => void) | null;
  targetChanged: boolean;
  onConditionChange: ((detected: boolean) => void) | null;
  // Flag pour éviter les détections multiples dans une même phrase
  matchDetectedForCurrentUtterance: boolean;
}

const voiceKeywordStates = new Map<number, VoiceKeywordNodeState>();

// Fonction pour initialiser ou mettre à jour l'état de la node
function initVoiceKeywordState(nodeId: number, config: any): VoiceKeywordNodeState {
  const existingState = voiceKeywordStates.get(nodeId);
  const newTarget = config.keyword || 'LUCA';

  // Options d'analyse - toujours en mode intelligent
  const newAnalysisOptions: AnalysisOptions = {
    threshold: 0.7,
    fuzzy: true,
    phonetic: true,
    contextWindowMs: 5000,
    minTokenOverlap: 0.5,
    allowPartialMatch: true,
    caseSensitive: false,
  };

  // Si l'état existe déjà, vérifier si la cible a changé
  if (existingState) {
    const targetHasChanged = JSON.stringify(existingState.target) !== JSON.stringify(newTarget) ||
                             JSON.stringify(existingState.analysisOptions) !== JSON.stringify(newAnalysisOptions);
    
    // Si la cible a changé ET qu'on est en train d'écouter, arrêter l'écoute pour forcer un restart
    if (targetHasChanged && existingState.isListening) {
      console.log(
        `[VoiceKeyword Node ${nodeId}] Target changed from "${existingState.target}" to "${newTarget}", stopping current listening session`
      );
      // Arrêter l'écoute actuelle de manière synchrone
      stopVoiceListening(nodeId, existingState).catch((error) => {
        console.warn(`[VoiceKeyword Node ${nodeId}] Error stopping listening after target change`, error);
      });
    }
    
    existingState.target = newTarget;
    existingState.analysisOptions = newAnalysisOptions;
    existingState.targetChanged = targetHasChanged;
    return existingState;
  }

  // Créer un nouvel état
  const state: VoiceKeywordNodeState = {
    target: newTarget,
    analysisOptions: newAnalysisOptions,
    isListening: false,
    unsubscribeMatch: null,
    unsubscribeResult: null,
    targetChanged: false,
    onConditionChange: null,
    matchDetectedForCurrentUtterance: false,
  };
  voiceKeywordStates.set(nodeId, state);
  return state;
}

// Fonction pour nettoyer l'état
function cleanupVoiceKeywordState(nodeId: number): void {
  const state = voiceKeywordStates.get(nodeId);
  if (state) {
    if (state.unsubscribeMatch) {
      try {
        state.unsubscribeMatch();
      } catch (error) {
        console.warn(`[VoiceKeyword] Error cleaning up match listener for node ${nodeId}`, error);
      }
    }
    if (state.unsubscribeResult) {
      try {
        state.unsubscribeResult();
      } catch (error) {
        console.warn(`[VoiceKeyword] Error cleaning up result listener for node ${nodeId}`, error);
      }
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
  // Mettre à jour le callback
  state.onConditionChange = onConditionChange;

  const manager = getVoiceRecognitionManager();

  // TOUJOURS mettre à jour la cible dans le manager en premier
  manager.setTarget(state.target, state.analysisOptions);
  console.log(
    `[VoiceKeyword Node ${nodeId}] Set target in manager: "${Array.isArray(state.target) ? state.target.join('", "') : state.target}"`
  );

  // Si déjà en écoute
  if (state.isListening) {
    if (state.targetChanged) {
      console.log(
        `[VoiceKeyword Node ${nodeId}] Target was updated while listening (targetChanged flag cleared)`
      );
      state.targetChanged = false;
    }
    return true;
  }

  // Vérifier si le manager est dans un état incohérent
  if (getActiveListenersCount() === 0 && manager.isCurrentlyListening()) {
    try {
      await manager.stopListening();
    } catch (error) {
      console.warn('[VoiceKeyword] Failed to reset stale voice recognition state', error);
    }
  }

  // Définir la cible dans le manager
  manager.setTarget(state.target, state.analysisOptions);

  // S'abonner aux correspondances détectées
  const unsubscribeMatch = manager.onMatch((matchResult: MatchResult, transcript: string) => {
    const currentState = voiceKeywordStates.get(nodeId);
    if (!currentState || !currentState.isListening) return;

    // Ignorer si on a déjà détecté un match pour cette phrase (éviter les déclenchements multiples)
    if (currentState.matchDetectedForCurrentUtterance) {
      console.log(
        `[VoiceKeyword Node ${nodeId}] Ignoring match (already triggered for current utterance)`
      );
      return;
    }

    console.log(
      `[VoiceKeyword Node ${nodeId}] Match detected! Transcript: "${transcript}" | Target: "${matchResult.matchedTarget}" | Score: ${matchResult.score.toFixed(2)} | Type: ${matchResult.matchType}`
    );

    // Marquer qu'on a détecté un match pour cette phrase
    currentState.matchDetectedForCurrentUtterance = true;

    // Déclencher la condition
    currentState.onConditionChange?.(true);
  });

  state.unsubscribeMatch = unsubscribeMatch;

  // S'abonner aux résultats bruts pour détection avec confidence > 0.90 ET réinitialisation sur isFinal
  const unsubscribeResult = manager.onResult((result) => {
    const currentState = voiceKeywordStates.get(nodeId);
    if (!currentState || !currentState.isListening) return;

    console.log(
      `[VoiceKeyword Node ${nodeId}] Transcript: "${result.transcript}" (confidence: ${result.confidence.toFixed(2)}, final: ${result.isFinal})`
    );

    // Si c'est le résultat final, réinitialiser le flag pour la prochaine phrase
    if (result.isFinal) {
      if (currentState.matchDetectedForCurrentUtterance) {
        console.log(
          `[VoiceKeyword Node ${nodeId}] 🔄 Final result received, resetting for next utterance`
        );
      }
      currentState.matchDetectedForCurrentUtterance = false;
      return; // Ne pas re-traiter le résultat final si on a déjà déclenché
    }

    // Ignorer si on a déjà détecté un match pour cette phrase
    if (currentState.matchDetectedForCurrentUtterance) {
      return;
    }

    // Détecter le mot-clé avec confidence élevée (seulement pour les résultats partiels non encore matchés)
    if (result.confidence >= 0.90 && result.transcript.trim() !== '') {
      const target = Array.isArray(currentState.target) ? currentState.target : [currentState.target];
      const transcript = result.transcript.toLowerCase();
      
      console.log(
        `[VoiceKeyword Node ${nodeId}] Checking high confidence result | Current targets: [${target.join(', ')}] | Transcript: "${transcript}"`
      );
      
      // Vérifier si la transcription contient l'un des mots-clés
      for (const keyword of target) {
        const keywordLower = keyword.toLowerCase();
        if (transcript.includes(keywordLower)) {
          console.log(
            `[VoiceKeyword Node ${nodeId}] ✅ KEYWORD MATCH! Transcript: "${result.transcript}" | Target: "${keyword}" | Confidence: ${result.confidence.toFixed(2)}`
          );
          // Marquer qu'on a détecté un match pour cette phrase
          currentState.matchDetectedForCurrentUtterance = true;
          currentState.onConditionChange?.(true);
          return;
        } else {
          console.log(
            `[VoiceKeyword Node ${nodeId}] ❌ No match: "${keywordLower}" not in "${transcript}"`
          );
        }
      }
    }
  });

  state.unsubscribeResult = unsubscribeResult;

  // Démarrer l'écoute si pas déjà active
  if (!manager.isCurrentlyListening()) {
    const started = await manager.startListening();
    if (!started) {
      unsubscribeMatch();
      unsubscribeResult();
      return false;
    }
  } else {
    console.log(`[VoiceKeyword Node ${nodeId}] Reusing active voice recognition session`);
  }

  state.isListening = true;
  console.log(
    `[VoiceKeyword Node ${nodeId}] Started listening for target "${Array.isArray(state.target) ? state.target.join('", "') : state.target}"`
  );
  return true;
}

// Fonction pour arrêter l'écoute
async function stopVoiceListening(nodeId: number, state: VoiceKeywordNodeState): Promise<void> {
  if (!state.isListening) return;

  if (state.unsubscribeMatch) {
    try {
      state.unsubscribeMatch();
    } catch (error) {
      console.warn(`[VoiceKeyword] Error unsubscribing from match events`, error);
    }
  }

  if (state.unsubscribeResult) {
    try {
      state.unsubscribeResult();
    } catch (error) {
      console.warn(`[VoiceKeyword] Error unsubscribing from result events`, error);
    }
  }

  state.isListening = false;

  // Si plus aucun listener actif, arrêter la reconnaissance vocale et effacer la cible
  let hasOtherListeners = false;
  for (const [id, s] of voiceKeywordStates) {
    if (id !== nodeId && s.isListening) {
      hasOtherListeners = true;
      break;
    }
  }

  if (!hasOtherListeners) {
    const manager = getVoiceRecognitionManager();
    manager.clearTarget();
    await manager.stopListening();
    console.log('[VoiceKeyword] No more listeners, stopped voice recognition and cleared target');
  }
}

// Arrête toutes les écoutes actives et nettoie les handlers
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
    manager.clearTarget();
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
  doc: `excerpt: Détecte quand vous dites un mot-clé spécifique avec compréhension linguistique avancée.
---
Ce bloc écoute votre voix et détecte intelligemment un mot-clé ou une phrase spécifique (par exemple "LUCA" ou "allume la lumière"). Il utilise une compréhension linguistique avancée pour reconnaître votre intention même si vous faites des fautes de prononciation ou reformulez légèrement.

**Comment l'utiliser :**
1. Choisissez le mot-clé ou la phrase que vous voulez détecter (par défaut "LUCA")
2. Le bloc commence à écouter quand le flux arrive
3. Dites le mot-clé ou une variante proche à voix haute
4. Le bloc reconnaît votre parole intelligemment et déclenche la suite !

**Détection intelligente :**
Le système utilise une compréhension linguistique avancée qui tolère les variations, fautes de prononciation et reformulations. Il détecte aussi les résultats avec une confiance élevée (> 90%).

**Exemples de détection intelligente :**
- Cible: "allume la lumière" → Détecte: "allume lumière", "allumer la lumière", "allum la lumiere"
- Cible: "LUCA" → Détecte: "Luca", "lucka", "louca"
- Supporte les phrases fragmentées: "allume" puis "la lumière" détectées ensemble`,
  icon: 'mic',
  iconFamily: 'material',

  // État de la condition
  checkCondition: () => false,
  getSignalData: () => ({ voiceKeywordDetected: true }),
  waitingForLabel: 'keyword',

  // Inputs additionnels personnalisés
  inputs: [
    {
      type: 'text',
      name: 'keyword',
      label: 'Keyword / Phrase',
      description: 'Mot-clé ou phrase à détecter avec compréhension linguistique intelligente',
      value: 'LUCA',
    },
  ],

  // Configuration de l'abonnement externe pour la reconnaissance vocale
  externalSubscription: {
    subscribe: (nodeId: number, settings: any, onConditionChange: (detected: boolean) => void) => {
      console.log(`[VoiceKeyword Node ${nodeId}] Subscribe called with settings:`, settings);
      
      // Initialiser ou mettre à jour l'état
      const config = {
        keyword: settings.keyword || 'LUCA',
      };
      
      console.log(`[VoiceKeyword Node ${nodeId}] Using keyword: "${config.keyword}"`);
      
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
  },
});

export default VoiceKeywordConditionNode;