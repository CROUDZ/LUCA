/**
 * VoiceRecognition - Utilitaire pour la reconnaissance vocale
 *
 * Ce module gère la reconnaissance vocale continue pour détecter des mots-clés.
 * Il utilise l'API de reconnaissance vocale native d'Android via un module natif.
 */

import { NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';

import permissions from './permissions';

// Types pour les événements de reconnaissance vocale
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

export type VoiceRecognitionState = 'idle' | 'listening' | 'processing' | 'error';

export type VoiceRecognitionEventHandler = (result: VoiceRecognitionResult) => void;
export type VoiceRecognitionErrorHandler = (error: VoiceRecognitionError) => void;
export type VoiceRecognitionStateHandler = (state: VoiceRecognitionState) => void;

// Singleton pour gérer l'état de la reconnaissance vocale
class VoiceRecognitionManager {
  private state: VoiceRecognitionState = 'idle';
  private isListening: boolean = false;
  private resultHandlers: Set<VoiceRecognitionEventHandler> = new Set();
  private errorHandlers: Set<VoiceRecognitionErrorHandler> = new Set();
  private stateHandlers: Set<VoiceRecognitionStateHandler> = new Set();
  private eventEmitter: NativeEventEmitter | null = null;
  private subscriptions: any[] = [];

  constructor() {
    this.initializeNativeModule();
  }

  private initializeNativeModule(): void {
    try {
      const VoiceRecognitionModule = (NativeModules as any)?.VoiceRecognitionModule;

      if (VoiceRecognitionModule) {
        this.eventEmitter = new NativeEventEmitter(VoiceRecognitionModule);

        // Écouter les résultats de reconnaissance
        const resultSub = this.eventEmitter.addListener(
          'voiceRecognition.result',
          this.handleResult.bind(this)
        );
        this.subscriptions.push(resultSub);

        // Écouter les erreurs
        const errorSub = this.eventEmitter.addListener(
          'voiceRecognition.error',
          this.handleError.bind(this)
        );
        this.subscriptions.push(errorSub);

        // Écouter les changements d'état
        const stateSub = this.eventEmitter.addListener(
          'voiceRecognition.state',
          this.handleStateChange.bind(this)
        );
        this.subscriptions.push(stateSub);

        console.log('[VoiceRecognition] Native module initialized');
      } else {
        console.warn('[VoiceRecognition] Native module not available');
        // Fallback: utiliser DeviceEventEmitter
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

    console.log(`[VoiceRecognition] Result: "${result.transcript}" (final: ${result.isFinal})`);

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
   * Démarrer l'écoute vocale
   */
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('[VoiceRecognition] Already listening');
      return true;
    }

    // Vérifier la permission du micro
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
        console.log('[VoiceRecognition] Started listening');
        return true;
      } else {
        // Mode simulation pour les tests/développement
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
   * Simuler un résultat de reconnaissance (pour les tests)
   */
  simulateResult(transcript: string, isFinal: boolean = true): void {
    this.handleResult({ transcript, isFinal, confidence: 1.0 });
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
    this.isListening = false;
    this.state = 'idle';
  }
}

// Instance singleton
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
 * Vérifier si un mot-clé est présent dans un transcript
 */
export function matchesKeyword(
  transcript: string,
  keyword: string,
  options?: { caseSensitive?: boolean; exactMatch?: boolean }
): boolean {
  const caseSensitive = options?.caseSensitive ?? false;
  const exactMatch = options?.exactMatch ?? false;

  const normalizedTranscript = caseSensitive ? transcript : transcript.toLowerCase();
  const normalizedKeyword = caseSensitive ? keyword : keyword.toLowerCase();

  if (exactMatch) {
    // Correspondance exacte (mot entier)
    const words = normalizedTranscript.split(/\s+/);
    return words.includes(normalizedKeyword);
  }

  // Correspondance partielle
  return normalizedTranscript.includes(normalizedKeyword);
}

export default {
  getManager: getVoiceRecognitionManager,
  resetManager: resetVoiceRecognitionManager,
  matchesKeyword,
};
