/**
 * VoiceRecognition - Utilitaire avancé pour la reconnaissance vocale
 *
 * Ce module gère la reconnaissance vocale continue avec compréhension linguistique
 * avancée pour détecter des mots-clés et phrases cibles de manière fiable.
 */

import { NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';
import permissions from './permissions';

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export interface VoiceRecognitionError {
  code: string;
  message: string;
  timestamp: number;
}

export interface MatchResult {
  matched: boolean;
  score: number;
  normalizedTranscript: string;
  normalizedTarget?: string;
  matchedTarget?: string;
  matchType?: 'exact' | 'fuzzy' | 'phonetic' | 'partial';
  details?: {
    editDistance?: number;
    tokenSimilarity?: number;
    phoneticSimilarity?: number;
    contextualMatch?: boolean;
  };
}

export interface AnalysisOptions {
  threshold?: number;
  caseSensitive?: boolean;
  phonetic?: boolean;
  fuzzy?: boolean;
  contextWindowMs?: number;
  minTokenOverlap?: number;
  allowPartialMatch?: boolean;
}

export type VoiceRecognitionState = 'idle' | 'listening' | 'processing' | 'error';

export type VoiceRecognitionEventHandler = (result: VoiceRecognitionResult) => void;
export type VoiceRecognitionErrorHandler = (error: VoiceRecognitionError) => void;
export type VoiceRecognitionStateHandler = (state: VoiceRecognitionState) => void;
export type VoiceRecognitionMatchHandler = (result: MatchResult, transcript: string) => void;

interface TranscriptContext {
  transcript: string;
  timestamp: number;
  confidence: number;
}

// ============================================================================
// PIPELINE LINGUISTIQUE
// ============================================================================

class LinguisticProcessor {
  private static readonly STOP_WORDS = new Set([
    'euh', 'bah', 'hum', 'ben', 'bof', 'hein', 'voilà', 'quoi', 'donc', 'alors'
  ]);

  private static readonly ACCENT_MAP: Record<string, string> = {
    'à': 'a', 'â': 'a', 'á': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'î': 'i', 'ï': 'i', 'í': 'i',
    'ô': 'o', 'ö': 'o', 'ó': 'o',
    'ù': 'u', 'û': 'u', 'ü': 'u', 'ú': 'u',
    'ç': 'c', 'ñ': 'n'
  };

  private static readonly PHONETIC_GROUPS: Record<string, string[]> = {
    's': ['s', 'c', 'ss', 'ç'],
    'k': ['c', 'k', 'q', 'qu', 'ck'],
    'f': ['f', 'ph'],
    'j': ['j', 'g'],
    'an': ['an', 'en', 'am', 'em'],
    'in': ['in', 'ein', 'ain', 'im'],
    'on': ['on', 'om'],
    'o': ['o', 'au', 'eau'],
    'e': ['e', 'é', 'è', 'ê', 'ai', 'ei']
  };

  /**
   * Étape 1: Normalisation linguistique avancée
   */
  static normalize(text: string, options: { removeAccents?: boolean; removePunctuation?: boolean } = {}): string {
    let normalized = text.toLowerCase().trim();

    // Supprimer la ponctuation
    if (options.removePunctuation !== false) {
      normalized = normalized.replace(/[.,!?;:'"()[\]{}]/g, ' ');
    }

    // Normaliser les espaces multiples
    normalized = normalized.replace(/\s+/g, ' ');

    // Supprimer les accents
    if (options.removeAccents !== false) {
      normalized = this.removeAccents(normalized);
    }

    return normalized.trim();
  }

  /**
   * Étape 2: Nettoyage du bruit verbal
   */
  static removeNoise(text: string): string {
    const words = text.split(/\s+/);
    return words
      .filter(word => !this.STOP_WORDS.has(word))
      .join(' ');
  }

  /**
   * Étape 3: Tokenization intelligente
   */
  static tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Supprimer les accents
   */
  private static removeAccents(text: string): string {
    return text.split('').map(char => this.ACCENT_MAP[char] || char).join('');
  }

  /**
   * Créer une représentation phonétique simplifiée
   */
  static toPhonetic(text: string): string {
    let phonetic = this.normalize(text);

    // Appliquer les transformations phonétiques
    Object.entries(this.PHONETIC_GROUPS).forEach(([sound, variants]) => {
      variants.forEach(variant => {
        const regex = new RegExp(variant, 'gi');
        phonetic = phonetic.replace(regex, sound);
      });
    });

    // Supprimer les doublons consécutifs
    phonetic = phonetic.replace(/(.)\1+/g, '$1');

    return phonetic;
  }

  /**
   * Stemming simple (réduction à la racine)
   */
  static stem(word: string): string {
    // Règles simples pour le français
    const suffixes = ['ment', 'ation', 'ateur', 'ance', 'ence', 'isme', 'able', 'ible', 'eux', 'euse', 'er', 'ir', 's', 'es'];
    
    let stem = word;
    for (const suffix of suffixes) {
      if (stem.endsWith(suffix) && stem.length > suffix.length + 2) {
        stem = stem.slice(0, -suffix.length);
        break;
      }
    }
    
    return stem;
  }
}

// ============================================================================
// MOTEUR DE SIMILARITÉ
// ============================================================================

class SimilarityEngine {
  /**
   * Distance de Levenshtein (edit distance)
   */
  static levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Similarité normalisée (0-1)
   */
  static normalizedSimilarity(s1: string, s2: string): number {
    const distance = this.levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen === 0 ? 1 : 1 - (distance / maxLen);
  }

  /**
   * Similarité basée sur les tokens (Jaccard)
   */
  static tokenSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Similarité avec stemming
   */
  static stemmedTokenSimilarity(tokens1: string[], tokens2: string[]): number {
    const stemmed1 = tokens1.map(t => LinguisticProcessor.stem(t));
    const stemmed2 = tokens2.map(t => LinguisticProcessor.stem(t));
    return this.tokenSimilarity(stemmed1, stemmed2);
  }

  /**
   * Correspondance de sous-séquence
   */
  static hasSubsequence(text: string, pattern: string): boolean {
    let patternIndex = 0;
    for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
      if (text[i] === pattern[patternIndex]) {
        patternIndex++;
      }
    }
    return patternIndex === pattern.length;
  }

  /**
   * Score composite pondéré
   */
  static compositeScore(
    exactSimilarity: number,
    tokenSimilarity: number,
    phoneticSimilarity: number,
    weights: { exact: number; token: number; phonetic: number } = { exact: 0.5, token: 0.3, phonetic: 0.2 }
  ): number {
    return (
      exactSimilarity * weights.exact +
      tokenSimilarity * weights.token +
      phoneticSimilarity * weights.phonetic
    );
  }
}

// ============================================================================
// ANALYSEUR DE TRANSCRIPTS
// ============================================================================

class TranscriptAnalyzer {
  private contextWindow: TranscriptContext[] = [];
  private readonly maxContextSize = 5;

  /**
   * Ajouter un transcript au contexte
   */
  addToContext(transcript: string, confidence: number): void {
    this.contextWindow.push({
      transcript,
      timestamp: Date.now(),
      confidence
    });

    if (this.contextWindow.length > this.maxContextSize) {
      this.contextWindow.shift();
    }
  }

  /**
   * Obtenir le contexte combiné dans une fenêtre temporelle
   */
  getContextualTranscript(windowMs: number = 5000): string {
    const now = Date.now();
    const relevant = this.contextWindow.filter(
      ctx => now - ctx.timestamp <= windowMs
    );

    return relevant.map(ctx => ctx.transcript).join(' ');
  }

  /**
   * Nettoyer le contexte ancien
   */
  clearOldContext(maxAgeMs: number = 10000): void {
    const now = Date.now();
    this.contextWindow = this.contextWindow.filter(
      ctx => now - ctx.timestamp <= maxAgeMs
    );
  }

  /**
   * Réinitialiser le contexte
   */
  resetContext(): void {
    this.contextWindow = [];
  }

  /**
   * Analyser la correspondance avec une cible
   */
  analyze(
    transcript: string,
    target: string | string[],
    options: AnalysisOptions = {}
  ): MatchResult {
    const {
      threshold = 0.7,
      caseSensitive = false,
      phonetic = true,
      fuzzy = true,
      contextWindowMs = 5000,
      minTokenOverlap = 0.5,
      allowPartialMatch = true
    } = options;

    const targets = Array.isArray(target) ? target : [target];
    let bestMatch: MatchResult = {
      matched: false,
      score: 0,
      normalizedTranscript: '',
    };

    // Combiner avec le contexte si demandé
    const fullTranscript = contextWindowMs > 0
      ? `${this.getContextualTranscript(contextWindowMs)} ${transcript}`.trim()
      : transcript;

    // Normaliser le transcript
    const normalizedTranscript = LinguisticProcessor.normalize(fullTranscript, {
      removeAccents: !caseSensitive,
      removePunctuation: true
    });

    const cleanTranscript = LinguisticProcessor.removeNoise(normalizedTranscript);
    const transcriptTokens = LinguisticProcessor.tokenize(cleanTranscript);

    // Tester chaque cible
    for (const targetStr of targets) {
      const normalizedTarget = LinguisticProcessor.normalize(targetStr, {
        removeAccents: !caseSensitive,
        removePunctuation: true
      });

      const cleanTarget = LinguisticProcessor.removeNoise(normalizedTarget);
      const targetTokens = LinguisticProcessor.tokenize(cleanTarget);

      // Correspondance exacte
      if (cleanTranscript === cleanTarget || cleanTranscript.includes(cleanTarget)) {
        return {
          matched: true,
          score: 1.0,
          normalizedTranscript: cleanTranscript,
          normalizedTarget: cleanTarget,
          matchedTarget: targetStr,
          matchType: 'exact'
        };
      }

      // Calcul des similarités
      let exactSimilarity = SimilarityEngine.normalizedSimilarity(cleanTranscript, cleanTarget);
      let tokenSim = SimilarityEngine.tokenSimilarity(transcriptTokens, targetTokens);
      let stemmedTokenSim = SimilarityEngine.stemmedTokenSimilarity(transcriptTokens, targetTokens);
      let phoneticSim = 0;

      if (phonetic) {
        const phoneticTranscript = LinguisticProcessor.toPhonetic(cleanTranscript);
        const phoneticTarget = LinguisticProcessor.toPhonetic(cleanTarget);
        phoneticSim = SimilarityEngine.normalizedSimilarity(phoneticTranscript, phoneticTarget);
      }

      // Utiliser le meilleur score de similarité token
      const bestTokenSim = Math.max(tokenSim, stemmedTokenSim);

      // Score composite
      const compositeScore = SimilarityEngine.compositeScore(
        exactSimilarity,
        bestTokenSim,
        phoneticSim
      );

      // Déterminer le type de correspondance
      let matchType: MatchResult['matchType'] = 'fuzzy';
      if (exactSimilarity > 0.95) matchType = 'exact';
      else if (phoneticSim > exactSimilarity && phoneticSim > 0.8) matchType = 'phonetic';
      else if (allowPartialMatch && bestTokenSim >= minTokenOverlap) matchType = 'partial';

      // Vérifier les seuils
      const matched = compositeScore >= threshold || 
                     (allowPartialMatch && bestTokenSim >= minTokenOverlap);

      const result: MatchResult = {
        matched,
        score: compositeScore,
        normalizedTranscript: cleanTranscript,
        normalizedTarget: cleanTarget,
        matchedTarget: targetStr,
        matchType,
        details: {
          editDistance: SimilarityEngine.levenshteinDistance(cleanTranscript, cleanTarget),
          tokenSimilarity: bestTokenSim,
          phoneticSimilarity: phoneticSim,
          contextualMatch: contextWindowMs > 0 && fullTranscript !== transcript
        }
      };

      if (result.score > bestMatch.score) {
        bestMatch = result;
      }
    }

    return bestMatch;
  }
}

// ============================================================================
// VOICE RECOGNITION MANAGER
// ============================================================================

class VoiceRecognitionManager {
  private state: VoiceRecognitionState = 'idle';
  private isListening: boolean = false;
  private resultHandlers: Set<VoiceRecognitionEventHandler> = new Set();
  private errorHandlers: Set<VoiceRecognitionErrorHandler> = new Set();
  private stateHandlers: Set<VoiceRecognitionStateHandler> = new Set();
  private matchHandlers: Set<VoiceRecognitionMatchHandler> = new Set();
  private eventEmitter: NativeEventEmitter | null = null;
  private subscriptions: any[] = [];
  
  private analyzer: TranscriptAnalyzer = new TranscriptAnalyzer();
  private currentTarget: string | string[] | null = null;
  private analysisOptions: AnalysisOptions = {};

  constructor() {
    this.initializeNativeModule();
  }

  private initializeNativeModule(): void {
    try {
      const VoiceRecognitionModule = (NativeModules as any)?.VoiceRecognitionModule;

      if (VoiceRecognitionModule) {
        this.eventEmitter = new NativeEventEmitter(VoiceRecognitionModule);

        const resultSub = this.eventEmitter.addListener(
          'voiceRecognition.result',
          this.handleResult.bind(this)
        );
        this.subscriptions.push(resultSub);

        const errorSub = this.eventEmitter.addListener(
          'voiceRecognition.error',
          this.handleError.bind(this)
        );
        this.subscriptions.push(errorSub);

        const stateSub = this.eventEmitter.addListener(
          'voiceRecognition.state',
          this.handleStateChange.bind(this)
        );
        this.subscriptions.push(stateSub);

        console.log('[VoiceRecognition] Native module initialized');
      } else {
        this.setupDeviceEventEmitterFallback();
      }
    } catch (error) {
      console.warn('[VoiceRecognition] Failed to initialize native module', error);
      this.setupDeviceEventEmitterFallback();
    }
  }

  private setupDeviceEventEmitterFallback(): void {
    try {
      if (DeviceEventEmitter) {
        const resultSub = DeviceEventEmitter.addListener(
          'voiceRecognition.result',
          this.handleResult.bind(this)
        );
        this.subscriptions.push(resultSub);

        const errorSub = DeviceEventEmitter.addListener(
          'voiceRecognition.error',
          this.handleError.bind(this)
        );
        this.subscriptions.push(errorSub);

        const stateSub = DeviceEventEmitter.addListener(
          'voiceRecognition.state',
          this.handleStateChange.bind(this)
        );
        this.subscriptions.push(stateSub);

        console.log('[VoiceRecognition] Using DeviceEventEmitter fallback');
      }
    } catch (error) {
      console.warn('[VoiceRecognition] DeviceEventEmitter fallback failed', error);
    }
  }

  private handleResult(data: any): void {
    const result: VoiceRecognitionResult = {
      transcript: data?.transcript || data?.text || '',
      isFinal: data?.isFinal ?? true,
      confidence: data?.confidence ?? 1.0,
      timestamp: Date.now(),
    };

    console.log(`[VoiceRecognition] Result: "${result.transcript}" (final: ${result.isFinal}, conf: ${result.confidence.toFixed(2)})`);

    // Ajouter au contexte
    this.analyzer.addToContext(result.transcript, result.confidence);

    // Analyser la correspondance si une cible est définie
    if (this.currentTarget) {
      const matchResult = this.analyzer.analyze(
        result.transcript,
        this.currentTarget,
        this.analysisOptions
      );

      if (matchResult.matched) {
        console.log(`[VoiceRecognition] Match detected! Score: ${matchResult.score.toFixed(2)}, Type: ${matchResult.matchType}`);
        
        this.matchHandlers.forEach((handler) => {
          try {
            handler(matchResult, result.transcript);
          } catch (error) {
            console.warn('[VoiceRecognition] Match handler error', error);
          }
        });
      }
    }

    // Notifier les handlers de résultats
    this.resultHandlers.forEach((handler) => {
      try {
        handler(result);
      } catch (error) {
        console.warn('[VoiceRecognition] Result handler error', error);
      }
    });
  }

  private handleError(data: any): void {
    const error: VoiceRecognitionError = {
      code: data?.code || 'UNKNOWN_ERROR',
      message: data?.message || 'Unknown error occurred',
      timestamp: Date.now(),
    };

    console.warn(`[VoiceRecognition] Error: ${error.code} - ${error.message}`);
    this.setState('error');

    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.warn('[VoiceRecognition] Error handler error', err);
      }
    });
  }

  private handleStateChange(data: any): void {
    const newState = data?.state as VoiceRecognitionState;
    if (newState) {
      this.setState(newState);
    }
  }

  private setState(newState: VoiceRecognitionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.isListening = newState === 'listening';

      this.stateHandlers.forEach((handler) => {
        try {
          handler(newState);
        } catch (error) {
          console.warn('[VoiceRecognition] State handler error', error);
        }
      });
    }
  }

  /**
   * Définir la cible de détection
   */
  setTarget(target: string | string[], options?: AnalysisOptions): void {
    this.currentTarget = target;
    this.analysisOptions = {
      threshold: 0.7,
      phonetic: true,
      fuzzy: true,
      contextWindowMs: 5000,
      minTokenOverlap: 0.5,
      allowPartialMatch: true,
      ...options
    };

    console.log('[VoiceRecognition] Target set:', Array.isArray(target) ? target.join(', ') : target);
  }

  /**
   * Supprimer la cible
   */
  clearTarget(): void {
    this.currentTarget = null;
    this.analysisOptions = {};
    this.analyzer.resetContext();
  }

  /**
   * Démarrer l'écoute vocale
   */
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('[VoiceRecognition] Already listening');
      return true;
    }

    const hasPermission = await permissions.ensureMicrophonePermission();
    if (!hasPermission) {
      console.warn('[VoiceRecognition] Microphone permission denied');
      this.handleError({
        code: 'PERMISSION_DENIED',
        message: 'Microphone permission is required for voice recognition',
      });
      return false;
    }

    try {
      const VoiceRecognitionModule = (NativeModules as any)?.VoiceRecognitionModule;

      if (VoiceRecognitionModule && typeof VoiceRecognitionModule.startListening === 'function') {
        await VoiceRecognitionModule.startListening({
          language: 'fr-FR',
          continuous: true,
          partialResults: true,
        });
        this.setState('listening');
        this.analyzer.resetContext();
        console.log('[VoiceRecognition] Started listening');
        return true;
      } else {
        console.warn('[VoiceRecognition] Native module not available, using simulation mode');
        this.setState('listening');
        return true;
      }
    } catch (error) {
      console.error('[VoiceRecognition] Failed to start listening', error);
      this.handleError({
        code: 'START_FAILED',
        message: error instanceof Error ? error.message : 'Failed to start voice recognition',
      });
      return false;
    }
  }

  /**
   * Arrêter l'écoute vocale
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      const VoiceRecognitionModule = (NativeModules as any)?.VoiceRecognitionModule;

      if (VoiceRecognitionModule && typeof VoiceRecognitionModule.stopListening === 'function') {
        await VoiceRecognitionModule.stopListening();
      }

      this.setState('idle');
      console.log('[VoiceRecognition] Stopped listening');
    } catch (error) {
      console.warn('[VoiceRecognition] Error stopping voice recognition', error);
      this.setState('idle');
    }
  }

  /**
   * S'abonner aux résultats de reconnaissance
   */
  onResult(handler: VoiceRecognitionEventHandler): () => void {
    this.resultHandlers.add(handler);
    return () => {
      this.resultHandlers.delete(handler);
    };
  }

  /**
   * S'abonner aux erreurs
   */
  onError(handler: VoiceRecognitionErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * S'abonner aux changements d'état
   */
  onStateChange(handler: VoiceRecognitionStateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  /**
   * S'abonner aux correspondances détectées
   */
  onMatch(handler: VoiceRecognitionMatchHandler): () => void {
    this.matchHandlers.add(handler);
    return () => {
      this.matchHandlers.delete(handler);
    };
  }

  /**
   * Obtenir l'état actuel
   */
  getState(): VoiceRecognitionState {
    return this.state;
  }

  /**
   * Vérifier si l'écoute est active
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Analyser un transcript manuellement
   */
  analyzeTranscript(
    transcript: string,
    target: string | string[],
    options?: AnalysisOptions
  ): MatchResult {
    return this.analyzer.analyze(transcript, target, options);
  }

  /**
   * Simuler un résultat de reconnaissance (pour les tests)
   */
  simulateResult(transcript: string, isFinal: boolean = true, confidence: number = 1.0): void {
    this.handleResult({ transcript, isFinal, confidence });
  }

  /**
   * Nettoyer les ressources
   */
  cleanup(): void {
    this.subscriptions.forEach((sub) => {
      try {
        if (sub && typeof sub.remove === 'function') {
          sub.remove();
        }
      } catch (error) {
        // Ignorer les erreurs de nettoyage
      }
    });
    this.subscriptions = [];
    this.resultHandlers.clear();
    this.errorHandlers.clear();
    this.stateHandlers.clear();
    this.matchHandlers.clear();
    this.analyzer.resetContext();
    this.isListening = false;
    this.state = 'idle';
  }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

let voiceRecognitionManager: VoiceRecognitionManager | null = null;

export function getVoiceRecognitionManager(): VoiceRecognitionManager {
  if (!voiceRecognitionManager) {
    voiceRecognitionManager = new VoiceRecognitionManager();
  }
  return voiceRecognitionManager;
}

export function resetVoiceRecognitionManager(): void {
  if (voiceRecognitionManager) {
    voiceRecognitionManager.cleanup();
    voiceRecognitionManager = null;
  }
}

/**
 * Analyser un transcript par rapport à une cible (API publique standalone)
 */
export function analyzeTranscript(
  transcript: string,
  target: string | string[],
  options?: AnalysisOptions
): MatchResult {
  const analyzer = new TranscriptAnalyzer();
  return analyzer.analyze(transcript, target, options);
}

/**
 * Utilitaires linguistiques exposés
 */
export const linguistic = {
  normalize: LinguisticProcessor.normalize,
  removeNoise: LinguisticProcessor.removeNoise,
  tokenize: LinguisticProcessor.tokenize,
  toPhonetic: LinguisticProcessor.toPhonetic,
  stem: LinguisticProcessor.stem,
};

/**
 * Utilitaires de similarité exposés
 */
export const similarity = {
  levenshtein: SimilarityEngine.levenshteinDistance,
  normalized: SimilarityEngine.normalizedSimilarity,
  tokenSimilarity: SimilarityEngine.tokenSimilarity,
  compositeScore: SimilarityEngine.compositeScore,
};

export default {
  getManager: getVoiceRecognitionManager,
  resetManager: resetVoiceRecognitionManager,
  analyzeTranscript,
  linguistic,
  similarity,
};