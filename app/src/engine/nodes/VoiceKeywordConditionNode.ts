/**
 * VoiceKeywordConditionNode
 *
 * Node conditionnel qui écoute un mot-clé vocal (par défaut "LUCA").
 * Lorsque le mot-clé est détecté, la condition est remplie et le signal est propagé.
 *
 * Catégorie: Condition
 * Type: condition.voice_keyword
 *
 * Particularités:
 * - Auto-émission désactivée par défaut (car sinon il faudrait écouter tout le temps)
 * - Inversement possible du signal
 * - Fonctionne en mode "interrupteur" : le Trigger démarre l'écoute, le mot-clé la valide
 *
 * Exemple de setup:
 * Trigger --> VoiceKeyword --> Ping
 * 1. Appuyer sur Trigger (démarre l'écoute via signal continu)
 * 2. Dire "LUCA"
 * 3. Le Ping se déclenche
 * 4. Ré-appuyer sur Trigger pour arrêter l'écoute
 */

import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { buildNodeCardHTML } from './templates/nodeCard';
import {
  getVoiceRecognitionManager,
  matchesKeyword,
  type VoiceRecognitionResult,
} from '../../utils/voiceRecognition';

// Registry pour les nodes avec écoute active
interface VoiceKeywordConfig {
  keyword: string;
  invert: boolean;
  caseSensitive: boolean;
  exactMatch: boolean;
  unsubscribe: (() => void) | null;
}

const activeListeners = new Map<number, VoiceKeywordConfig>();

// Fonction pour nettoyer un listener
function cleanupListener(nodeId: number): void {
  const config = activeListeners.get(nodeId);
  if (config?.unsubscribe) {
    try {
      config.unsubscribe();
    } catch (error) {
      logger.warn(`[VoiceKeyword] Error cleaning up listener for node ${nodeId}`, error);
    }
  }
  activeListeners.delete(nodeId);
}

// Fonction pour gérer le résultat de la reconnaissance vocale
async function handleVoiceResult(
  nodeId: number,
  config: VoiceKeywordConfig,
  result: VoiceRecognitionResult
): Promise<void> {
  const ss = getSignalSystem();
  if (!ss) return;

  const matches = matchesKeyword(result.transcript, config.keyword, {
    caseSensitive: config.caseSensitive,
    exactMatch: config.exactMatch,
  });

  logger.debug(
    `[VoiceKeyword Node ${nodeId}] Transcript: "${result.transcript}" | Keyword: "${config.keyword}" | Matches: ${matches}`
  );

  // Si le mot-clé est détecté (ou inversé)
  const conditionMet = config.invert ? !matches : matches;

  if (conditionMet && result.isFinal) {
    logger.info(
      `[VoiceKeyword Node ${nodeId}] Keyword "${config.keyword}" detected! Emitting signal.`
    );

    // Émettre un signal quand le mot-clé est détecté
    await ss.emitSignal(nodeId, {
      fromEvent: 'voice.keyword.detected',
      keyword: config.keyword,
      transcript: result.transcript,
      confidence: result.confidence,
      timestamp: result.timestamp,
    });
  }
}

// Fonction pour démarrer l'écoute pour un node
async function startListeningForNode(nodeId: number, config: VoiceKeywordConfig): Promise<boolean> {
  const manager = getVoiceRecognitionManager();

  // Nettoyer l'ancien listener si existant
  cleanupListener(nodeId);

  // S'abonner aux résultats
  const unsubscribe = manager.onResult((result) => {
    handleVoiceResult(nodeId, config, result);
  });

  config.unsubscribe = unsubscribe;
  activeListeners.set(nodeId, config);

  // Démarrer l'écoute si pas déjà active
  if (!manager.isCurrentlyListening()) {
    const started = await manager.startListening();
    if (!started) {
      cleanupListener(nodeId);
      return false;
    }
  }

  logger.info(`[VoiceKeyword Node ${nodeId}] Started listening for keyword "${config.keyword}"`);
  return true;
}

// Fonction pour arrêter l'écoute pour un node
async function stopListeningForNode(nodeId: number): Promise<void> {
  cleanupListener(nodeId);

  // Si plus aucun listener actif, arrêter la reconnaissance vocale
  if (activeListeners.size === 0) {
    const manager = getVoiceRecognitionManager();
    await manager.stopListening();
    logger.info('[VoiceKeyword] All listeners removed, stopped voice recognition');
  }
}

// Pour les tests
export function clearVoiceKeywordRegistry(): void {
  activeListeners.forEach((_, nodeId) => {
    cleanupListener(nodeId);
  });
  activeListeners.clear();
}

export function getActiveListenersCount(): number {
  return activeListeners.size;
}

const VOICE_KEYWORD_COLOR = '#9C27B0'; // Violet pour la reconnaissance vocale

const VoiceKeywordConditionNode: NodeDefinition = {
  id: 'condition.voice_keyword',
  name: 'Voice Keyword',
  description: 'Propage le signal lorsque le mot-clé vocal est détecté (ex: "LUCA")',
  category: 'Condition',
  icon: 'mic',
  iconFamily: 'material',
  color: VOICE_KEYWORD_COLOR,

  inputs: [
    {
      name: 'signal_in',
      type: 'any',
      label: 'Signal In',
      description: "Signal d'entrée (start: démarre l'écoute, stop: arrête l'écoute)",
      required: false,
    },
  ],

  outputs: [
    {
      name: 'signal_out',
      type: 'any',
      label: 'Signal Out',
      description: 'Signal propagé lorsque le mot-clé est détecté',
    },
  ],

  defaultSettings: {
    keyword: 'LUCA',
    invertSignal: false,
    caseSensitive: false,
    exactMatch: false,
  },

  execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    try {
      const ss = getSignalSystem();
      if (!ss) {
        return { success: false, error: 'Signal system not initialized', outputs: {} };
      }

      const keyword = context.settings?.keyword || 'LUCA';
      const invert = context.settings?.invertSignal ?? false;
      const caseSensitive = context.settings?.caseSensitive ?? false;
      const exactMatch = context.settings?.exactMatch ?? false;

      const config: VoiceKeywordConfig = {
        keyword,
        invert,
        caseSensitive,
        exactMatch,
        unsubscribe: null,
      };

      // Enregistrer le handler pour ce node
      ss.registerHandler(context.nodeId, async (signal: Signal): Promise<SignalPropagation> => {
        logger.debug(
          `[VoiceKeyword Node ${context.nodeId}] Received signal: state=${signal.state}`
        );

        // Gérer les états ON/OFF
        if (signal.state === 'ON') {
          // Démarrer l'écoute
          const started = await startListeningForNode(context.nodeId, {
            ...config,
            unsubscribe: null,
          });
          if (!started) {
            logger.warn(`[VoiceKeyword Node ${context.nodeId}] Failed to start listening`);
          }
          // Ne pas propager le signal de démarrage, attendre la détection du mot-clé
          return { propagate: false, data: signal.data };
        } else if (signal.state === 'OFF') {
          // Arrêter l'écoute
          await stopListeningForNode(context.nodeId);
          // Propager le signal d'arrêt
          return { propagate: true, data: { ...signal.data, voiceListeningStopped: true } };
        }

        // Pour les signaux non-continus, on vérifie si le mot-clé a déjà été détecté
        // (le signal vient de l'émission interne après détection du mot-clé)
        if (signal.data?.fromEvent === 'voice.keyword.detected') {
          return {
            propagate: true,
            data: {
              ...signal.data,
              keywordMatched: true,
            },
          };
        }

        // Signal normal sans mode continu - démarrer l'écoute temporairement
        // (comportement legacy pour compatibilité)
        const started = await startListeningForNode(context.nodeId, {
          ...config,
          unsubscribe: null,
        });
        return { propagate: false, data: { ...signal.data, listeningStarted: started } };
      });

      return {
        success: true,
        outputs: {
          signal_out: `Listening for keyword: ${keyword}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        outputs: {},
      };
    }
  },

  validate: (): boolean | string => {
    const ss = getSignalSystem();
    if (!ss) {
      return 'Signal system not initialized';
    }
    return true;
  },

  generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta): string => {
    const keyword = settings?.keyword || 'LUCA';
    const invertSignal = settings?.invertSignal ?? false;
    const caseSensitive = settings?.caseSensitive ?? false;
    const exactMatch = settings?.exactMatch ?? false;

    const shortKeyword = keyword.length > 22 ? `${keyword.substring(0, 22)}…` : keyword;

    const chips: Array<{
      label: string;
      tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    }> = [{ label: `"${keyword}"`, tone: 'info' }];

    if (invertSignal) {
      chips.push({ label: 'Inversé', tone: 'warning' });
    }
    if (caseSensitive) {
      chips.push({ label: 'Sensible casse', tone: 'default' });
    }
    if (exactMatch) {
      chips.push({ label: 'Exact', tone: 'default' });
    }

    const body = `
      <div class="voice-keyword-node${invertSignal ? ' inverted' : ''}">
        <div class="keyword-display">
          <label class="voice-keyword-control">
            <span class="keyword-label">Mot-clé</span>
            <input type="text" class="voice-keyword-input" value="${keyword}" placeholder="LUCA" />
          </label>
        </div>
      </div>
    `;

    return buildNodeCardHTML({
      title: 'Voice Keyword',
      subtitle: invertSignal ? `Inversé • "${shortKeyword}"` : `Direct • "${shortKeyword}"`,
      description: `Détecte le mot-clé "${keyword}"`,
      iconName: 'mic',
      category: nodeMeta?.category || 'Condition',
      accentColor: VOICE_KEYWORD_COLOR,
      chips,
      body,
    });
  },
};

registerNode(VoiceKeywordConditionNode);

export default VoiceKeywordConditionNode;
