/**
 * SignalSystem - Système de propagation de signaux dans le graphe
 * 
 * Ce système permet aux nodes de communiquer entre elles via des signaux
 * qui se propagent à travers les connexions du graphe.
 * 
 * Fonctionnement :
 * - Les nodes "Condition" vérifient une condition et propagent le signal si elle est vraie
 * - Les nodes "Action" reçoivent le signal et exécutent une action
 * - Les signaux se propagent de manière asynchrone à travers le graphe
 */

import type { Graph } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface Signal {
  id: string;
  sourceNodeId: number;
  timestamp: number;
  data?: any;
}

export interface SignalHandler {
  (signal: Signal): Promise<SignalPropagation> | SignalPropagation;
}

export interface SignalPropagation {
  propagate: boolean; // Si true, le signal continue vers les nodes suivantes
  data?: any; // Données à transmettre avec le signal
}

export interface SignalCallback {
  nodeId: number;
  handler: SignalHandler;
}

// ============================================================================
// Classe SignalSystem
// ============================================================================

export class SignalSystem {
  private graph: Graph;
  private handlers: Map<number, SignalHandler> = new Map();
  private signalQueue: Signal[] = [];
  private isProcessing: boolean = false;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Enregistrer un handler pour une node
   */
  registerHandler(nodeId: number, handler: SignalHandler): void {
    this.handlers.set(nodeId, handler);
  }

  /**
   * Désinscrire un handler
   */
  unregisterHandler(nodeId: number): void {
    this.handlers.delete(nodeId);
  }

  /**
   * Émettre un signal depuis une node source
   */
  async emitSignal(sourceNodeId: number, data?: any): Promise<void> {
    const signal: Signal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceNodeId,
      timestamp: Date.now(),
      data,
    };

    console.log(`[SignalSystem] Signal émis depuis node ${sourceNodeId}`, signal);

    // Ajouter à la queue
    this.signalQueue.push(signal);

    // Traiter la queue si pas déjà en cours
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Traiter la queue de signaux
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.signalQueue.length > 0) {
      const signal = this.signalQueue.shift();
      if (signal) {
        await this.propagateSignal(signal, signal.sourceNodeId);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Propager un signal à travers le graphe
   */
  private async propagateSignal(signal: Signal, currentNodeId: number): Promise<void> {
    const node = this.graph.nodes.get(currentNodeId);
    if (!node) return;

    // Récupérer les nodes de sortie (nodes connectées)
    const outputNodes = node.outputs;

    for (const outputNodeId of outputNodes) {
      const handler = this.handlers.get(outputNodeId);
      
      if (handler) {
        try {
          console.log(`[SignalSystem] Propagation du signal vers node ${outputNodeId}`);
          
          // Exécuter le handler
          const result = await Promise.resolve(handler(signal));

          // Si le handler demande de continuer la propagation
          if (result.propagate) {
            // Créer un nouveau signal avec les données mises à jour
            const newSignal: Signal = {
              ...signal,
              id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: result.data ?? signal.data,
            };

            // Propager récursivement
            await this.propagateSignal(newSignal, outputNodeId);
          }
        } catch (error) {
          console.error(`[SignalSystem] Erreur lors du traitement du signal par node ${outputNodeId}:`, error);
        }
      } else {
        // Si pas de handler, propager directement
        console.log(`[SignalSystem] Pas de handler pour node ${outputNodeId}, propagation directe`);
        await this.propagateSignal(signal, outputNodeId);
      }
    }
  }

  /**
   * Réinitialiser le système
   */
  reset(): void {
    this.handlers.clear();
    this.signalQueue = [];
    this.isProcessing = false;
  }

  /**
   * Obtenir les statistiques du système
   */
  getStats(): {
    registeredHandlers: number;
    queuedSignals: number;
    isProcessing: boolean;
  } {
    return {
      registeredHandlers: this.handlers.size,
      queuedSignals: this.signalQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}

// ============================================================================
// Instance globale (singleton)
// ============================================================================

let globalSignalSystem: SignalSystem | null = null;

export function initializeSignalSystem(graph: Graph): SignalSystem {
  globalSignalSystem = new SignalSystem(graph);
  return globalSignalSystem;
}

export function getSignalSystem(): SignalSystem | null {
  return globalSignalSystem;
}

export function resetSignalSystem(): void {
  if (globalSignalSystem) {
    globalSignalSystem.reset();
  }
  globalSignalSystem = null;
}
