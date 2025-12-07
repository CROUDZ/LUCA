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
 * - Gestion d'un contexte partagé (variables) entre toutes les nodes
 * - Support des événements personnalisés pour communication inter-nodes
 */

import type { Graph } from '../types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface Signal {
  id: string;
  sourceNodeId: number;
  timestamp: number;
  data?: any;
  // Contexte partagé pour cette propagation de signal
  context?: ExecutionContext;
}

export interface SignalHandler {
  (signal: Signal): Promise<SignalPropagation> | SignalPropagation;
}

export interface SignalPropagation {
  propagate: boolean; // Si true, le signal continue vers les nodes suivantes
  data?: any; // Données à transmettre avec le signal
  // Possibilité de cibler des sorties spécifiques (pour les branches conditionnelles)
  targetOutputs?: number[];
  // Délai avant propagation (en ms)
  delay?: number;
}

export interface SignalCallback {
  nodeId: number;
  handler: SignalHandler;
}

// ============================================================================
// Contexte d'exécution partagé
// ============================================================================

export interface ExecutionContext {
  // Variables globales accessibles par toutes les nodes
  variables: Map<string, any>;
  // Pile d'exécution pour debug
  executionStack: number[];
  // Timestamp de début d'exécution
  startTime: number;
  // Métadonnées personnalisées
  metadata: Map<string, any>;
}

// ============================================================================
// Système d'événements personnalisés
// ============================================================================

export type EventHandler = (data: any) => void | Promise<void>;

export interface EventSubscription {
  eventName: string;
  handler: EventHandler;
  nodeId: number;
}

// ============================================================================
// Classe SignalSystem
// ============================================================================

export class SignalSystem {
  private graph: Graph;
  private handlers: Map<number, SignalHandler> = new Map();
  private signalQueue: Signal[] = [];
  private isProcessing: boolean = false;

  // Contexte d'exécution global
  private globalContext: ExecutionContext;

  // Système d'événements
  private eventHandlers: Map<string, EventSubscription[]> = new Map();

  // Statistiques et métriques
  private stats: {
    totalSignals: number;
    failedSignals: number;
    averageExecutionTime: number;
    lastEmittedEvent?: string | null;
  } = {
    totalSignals: 0,
    failedSignals: 0,
    averageExecutionTime: 0,
    lastEmittedEvent: null,
  };

  constructor(graph: Graph) {
    this.graph = graph;
    this.globalContext = this.createNewContext();
  }

  /**
   * Créer un nouveau contexte d'exécution
   */
  private createNewContext(): ExecutionContext {
    return {
      variables: new Map(),
      executionStack: [],
      startTime: Date.now(),
      metadata: new Map(),
    };
  }

  /**
   * Obtenir le contexte global
   */
  getContext(): ExecutionContext {
    return this.globalContext;
  }

  /**
   * Définir une variable dans le contexte global
   */
  setVariable(name: string, value: any): void {
    this.globalContext.variables.set(name, value);
    logger.debug(`[SignalSystem] Variable définie: ${name} =`, value);
  }

  /**
   * Obtenir une variable du contexte global
   */
  getVariable(name: string, defaultValue?: any): any {
    return this.globalContext.variables.get(name) ?? defaultValue;
  }

  /**
   * Vérifier si une variable existe
   */
  hasVariable(name: string): boolean {
    return this.globalContext.variables.has(name);
  }

  /**
   * Supprimer une variable
   */
  deleteVariable(name: string): boolean {
    return this.globalContext.variables.delete(name);
  }

  /**
   * Obtenir toutes les variables
   */
  getAllVariables(): Record<string, any> {
    const vars: Record<string, any> = {};
    this.globalContext.variables.forEach((value, key) => {
      vars[key] = value;
    });
    return vars;
  }

  /**
   * Émettre un événement personnalisé
   */
  emitEvent(eventName: string, data?: any): void {
    const handlers = this.eventHandlers.get(eventName);
    // Always record the last emitted event for diagnostics even if there
    // are no subscribers. Tests rely on this metric to assert emission.
    this.stats.lastEmittedEvent = eventName;

    if (handlers && handlers.length > 0) {
      // Use info for normal event emissions to avoid LogBox stack traces
      // for everyday event traffic. Keep warn/error for real problems.
      logger.info(
        `[SignalSystem] Événement émis: ${eventName} (subscribers: ${handlers.length})`,
        data
      );
      handlers.forEach((subscription) => {
        try {
          Promise.resolve(subscription.handler(data));
        } catch (error) {
          logger.error(
            `[SignalSystem] Erreur lors du traitement de l'événement ${eventName}:`,
            error
          );
        }
      });
      // lastEmittedEvent set above when event emitted
    }
  }

  /**
   * S'abonner à un événement
   */
  subscribeToEvent(eventName: string, nodeId: number, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    const subscription: EventSubscription = { eventName, handler, nodeId };
    this.eventHandlers.get(eventName)!.push(subscription);

    // Node subscription is a normal operation — keep it at info level to avoid
    // surfacing a full stack trace in development tools.
    logger.info(
      `[SignalSystem] Node ${nodeId} abonnée à l'événement: ${eventName} (total subscribers: ${
        this.eventHandlers.get(eventName)!.length
      })`
    );

    // Retourner une fonction de désabonnement
    return () => {
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(subscription);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Désabonner toutes les souscriptions d'une node
   */
  unsubscribeNode(nodeId: number): void {
    this.eventHandlers.forEach((handlers, eventName) => {
      const filtered = handlers.filter((sub) => sub.nodeId !== nodeId);
      if (filtered.length > 0) {
        this.eventHandlers.set(eventName, filtered);
      } else {
        this.eventHandlers.delete(eventName);
      }
    });
  }

  /**
   * Enregistrer un handler pour une node
   */
  registerHandler(nodeId: number, handler: SignalHandler): void {
    this.handlers.set(nodeId, handler);
    // Handlers registration is expected during node initialization; use info
    // level so LogBox does not show an error stack for routine operations.
    logger.info(
      `[SignalSystem] Handler enregistré pour node ${nodeId}. Total handlers: ${this.handlers.size}`
    );
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
  async emitSignal(sourceNodeId: number, data?: any, context?: ExecutionContext): Promise<void> {
    const signal: Signal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceNodeId,
      timestamp: Date.now(),
      data,
      context: context || this.globalContext,
    };

    logger.debug(`[SignalSystem] Signal émis depuis node ${sourceNodeId}`, signal);
    this.stats.totalSignals++;

    // Ajouter à la queue
    this.signalQueue.push(signal);

    // Traiter la queue si pas déjà en cours
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Émettre un signal immédiatement sans passer par la queue (synchronous propagation)
   * Utile pour des sources haute fréquence qui ne doivent pas créer une longue file d'attente.
   */
  async emitSignalImmediate(
    sourceNodeId: number,
    data?: any,
    context?: ExecutionContext
  ): Promise<void> {
    const signal: Signal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceNodeId,
      timestamp: Date.now(),
      data,
      context: context || this.globalContext,
    };

    logger.debug(`[SignalSystem] Immediate signal emitted from node ${sourceNodeId}`);

    this.stats.totalSignals++;

    // Direct propagation without queue
    await this.propagateSignal(signal, sourceNodeId);
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
  private async propagateSignal(
    signal: Signal,
    currentNodeId: number,
    allowedOutputs?: number[]
  ): Promise<void> {
    const node = this.graph.nodes.get(currentNodeId);
    if (!node) return;

    // Ajouter à la pile d'exécution
    if (signal.context) {
      signal.context.executionStack.push(currentNodeId);
    }

    // Récupérer les nodes de sortie (nodes connectées)
    let outputNodes = node.outputs;
    // If a subset of outputs is allowed, apply filter
    if (allowedOutputs && allowedOutputs.length > 0) {
      outputNodes = outputNodes.filter((o) => allowedOutputs.includes(o));
    }

    for (const outputNodeId of outputNodes) {
      const handler = this.handlers.get(outputNodeId);

      if (handler) {
        try {
          logger.debug(`[SignalSystem] Propagation du signal vers node ${outputNodeId}`);

          const startTime = Date.now();

          // Exécuter le handler
          const result = await Promise.resolve(handler(signal));

          const executionTime = Date.now() - startTime;

          // Mettre à jour les statistiques
          this.stats.averageExecutionTime = (this.stats.averageExecutionTime + executionTime) / 2;

          // Si le handler demande de continuer la propagation
          if (result.propagate) {
            // Gérer le délai si spécifié
            if (result.delay && result.delay > 0) {
              await new Promise((resolve) => setTimeout(resolve, result.delay));
            }

            // Créer un nouveau signal avec les données mises à jour
            const newSignal: Signal = {
              ...signal,
              id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: result.data ?? signal.data,
              context: signal.context,
            };

            // Si des outputs spécifiques sont ciblés (filtrer parmi les sorties du node cible),
            // on appelera propagateSignal sur le node cible en limitant ses outputs
            if (result.targetOutputs && result.targetOutputs.length > 0) {
              await this.propagateSignal(newSignal, outputNodeId, result.targetOutputs);
            } else {
              // Propager récursivement vers toutes les sorties
              await this.propagateSignal(newSignal, outputNodeId);
            }
          }
        } catch (error) {
          logger.error(
            `[SignalSystem] Erreur lors du traitement du signal par node ${outputNodeId}:`,
            error
          );
          this.stats.failedSignals++;
        }
      } else {
        // Si pas de handler, propager directement
        logger.debug(
          `[SignalSystem] Pas de handler pour node ${outputNodeId}, propagation directe`
        );
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
    this.globalContext = this.createNewContext();
    this.eventHandlers.clear();
    this.stats.totalSignals = 0;
    this.stats.failedSignals = 0;
    this.stats.averageExecutionTime = 0;
    this.stats.lastEmittedEvent = null;
  }

  /**
   * Obtenir les statistiques du système
   */
  getStats(): {
    registeredHandlers: number;
    queuedSignals: number;
    isProcessing: boolean;
    totalSignals: number;
    failedSignals: number;
    averageExecutionTime: number;
    variablesCount: number;
    eventHandlersCount: number;
    lastEmittedEvent: string | null;
  } {
    return {
      registeredHandlers: this.handlers.size,
      queuedSignals: this.signalQueue.length,
      isProcessing: this.isProcessing,
      totalSignals: this.stats.totalSignals,
      failedSignals: this.stats.failedSignals,
      averageExecutionTime: this.stats.averageExecutionTime,
      variablesCount: this.globalContext.variables.size,
      eventHandlersCount: this.eventHandlers.size,
      lastEmittedEvent: (this.stats.lastEmittedEvent ?? null) as string | null,
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
  // No Source node available — nothing to stop here
}
