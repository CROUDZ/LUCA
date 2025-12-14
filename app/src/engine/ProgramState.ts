/**
 * ProgramState - État global du programme
 *
 * Cet état est INDÉPENDANT du SignalSystem et persiste même
 * quand le graphe est modifié et le SignalSystem reconstruit.
 */

import { logger } from '../utils/logger';

type StateListener = (isRunning: boolean) => void;

class ProgramStateManager {
  private _isRunning: boolean = false;
  private listeners: Set<StateListener> = new Set();

  get isRunning(): boolean {
    return this._isRunning;
  }

  start(): void {
    if (!this._isRunning) {
      logger.info('[ProgramState] ▶️ Programme DÉMARRÉ');
      this._isRunning = true;
      this.notifyListeners();
    }
  }

  stop(): void {
    if (this._isRunning) {
      logger.info('[ProgramState] ⏹️ Programme ARRÊTÉ');
      this._isRunning = false;
      this.notifyListeners();
    }
  }

  toggle(): boolean {
    if (this._isRunning) {
      this.stop();
    } else {
      this.start();
    }
    return this._isRunning;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Appeler immédiatement avec l'état actuel
    listener(this._isRunning);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this._isRunning);
      } catch (error) {
        logger.error('[ProgramState] Error in listener:', error);
      }
    });
  }
}

// Singleton global
export const programState = new ProgramStateManager();
