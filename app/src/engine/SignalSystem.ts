/**
 * SignalSystem - Système de propagation de signaux continus dans le graphe
 *
 * Ce système utilise uniquement des signaux continus (états ON/OFF) pour une stabilité maximale.
 *
 * Fonctionnement :
 * - Chaque node peut être dans un état ON ou OFF
 * - Quand une node s'active (ON), elle propage l'état ON à ses sorties
 * - Quand une node se désactive (OFF), elle propage l'état OFF à ses sorties
 * - Les nodes condition évaluent l'état entrant et décident de la propagation
 * - Les nodes action s'exécutent quand elles reçoivent ON et s'arrêtent sur OFF
 * - Gestion d'un contexte partagé (variables) entre toutes les nodes
 * - Support des événements personnalisés pour communication inter-nodes
 */

import type { Graph } from '../types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export type SignalState = 'ON' | 'OFF';

export interface Signal {
  id: string;
  sourceNodeId: number;
  timestamp: number;
  state: SignalState; // Toujours ON ou OFF
  data?: any;
  context?: ExecutionContext;
  // Indique si c'est un OFF explicite (toggle, stop manuel) vs un pulse automatique
  explicitOff?: boolean;
}

export interface SignalHandler {
  (signal: Signal): Promise<SignalPropagation> | SignalPropagation;
}

export interface SignalPropagation {
  propagate: boolean; // Si true, le signal continue vers les nodes suivantes
  state?: SignalState; // État à propager (par défaut: même état que le signal reçu)
  data?: any; // Données à transmettre avec le signal
  targetOutputs?: number[]; // Sorties spécifiques (pour les branches conditionnelles)
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
// État des nodes
// ============================================================================

interface NodeState {
  state: SignalState;
  data?: any;
  lastUpdate: number;
  activeConnections: Set<number>; // IDs des nodes sources qui maintiennent cet état ON
}

// ============================================================================
// Classe SignalSystem
// ============================================================================

export class SignalSystem {
  public graph: Graph;
  private handlers = new Map<number, SignalHandler>();
  private nodeStates = new Map<number, NodeState>();
  private globalContext: ExecutionContext;
  private eventHandlers = new Map<string, EventSubscription[]>();
  private processingSignals = new Set<string>();
  private activePropagations = 0;
  private stats = {
    totalSignals: 0,
    failedSignals: 0,
    averageExecutionTime: 0,
    lastEmittedEvent: null as string | null,
  };

  constructor(graph: Graph) {
    this.graph = graph;
    this.globalContext = this.createNewContext();

    // Initialiser tous les nodes à OFF
    this.graph.nodes.forEach((_node, nodeId) => {
      this.nodeStates.set(nodeId, {
        state: 'OFF',
        lastUpdate: Date.now(),
        activeConnections: new Set(),
      });
    });
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
   * Obtenir l'état actuel d'une node
   */
  getNodeState(nodeId: number): SignalState {
    return this.nodeStates.get(nodeId)?.state ?? 'OFF';
  }

  /**
   * Obtenir les données d'état d'une node
   */
  getNodeData(nodeId: number): any {
    return this.nodeStates.get(nodeId)?.data;
  }

  /**
   * Vérifier si une node est active (ON)
   */
  isNodeActive(nodeId: number): boolean {
    return this.getNodeState(nodeId) === 'ON';
  }

  /**
   * Obtenir toutes les nodes actives
   */
  getActiveNodes(): number[] {
    const activeNodes: number[] = [];
    this.nodeStates.forEach((state, nodeId) => {
      if (state.state === 'ON') {
        activeNodes.push(nodeId);
      }
    });
    return activeNodes;
  }

  setVariable(name: string, value: any): void {
    this.globalContext.variables.set(name, value);
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

  emitEvent(eventName: string, data?: any): void {
    this.stats.lastEmittedEvent = eventName;
    const handlers = this.eventHandlers.get(eventName);
    if (!handlers?.length) return;

    for (const sub of handlers) {
      try {
        Promise.resolve(sub.handler(data));
      } catch (error) {
        logger.error(`[SignalSystem] Event error ${eventName}:`, error);
      }
    }
  }

  subscribeToEvent(eventName: string, nodeId: number, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    const subscription: EventSubscription = { eventName, handler, nodeId };
    this.eventHandlers.get(eventName)!.push(subscription);

    return () => {
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        const idx = handlers.indexOf(subscription);
        if (idx > -1) handlers.splice(idx, 1);
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

  registerHandler(nodeId: number, handler: SignalHandler): void {
    this.handlers.set(nodeId, handler);
    if (!this.nodeStates.has(nodeId)) {
      this.nodeStates.set(nodeId, {
        state: 'OFF',
        lastUpdate: Date.now(),
        activeConnections: new Set(),
      });
    }
  }

  /**
   * Désinscrire un handler
   */
  unregisterHandler(nodeId: number): void {
    this.handlers.delete(nodeId);

    // Réinitialiser l'état
    if (this.nodeStates.has(nodeId)) {
      this.nodeStates.set(nodeId, {
        state: 'OFF',
        lastUpdate: Date.now(),
        activeConnections: new Set(),
      });
    }
  }

  /**
   * Basculer l'état d'une node (ON <-> OFF)
   * C'est la méthode principale pour activer/désactiver des nodes
   *
   * @param sourceNodeId - Node qui change d'état
   * @param targetState - État cible ('ON' ou 'OFF'), ou undefined pour basculer
   * @param data - Données à associer à l'état
   * @param context - Contexte d'exécution
   */
  async setNodeState(
    sourceNodeId: number,
    targetState?: SignalState,
    data?: any,
    context?: ExecutionContext,
    options?: { explicitOff?: boolean; forcePropagation?: boolean }
  ): Promise<SignalState> {
    const currentState = this.getNodeState(sourceNodeId);
    const newState = targetState ?? (currentState === 'ON' ? 'OFF' : 'ON');

    // Pour les triggers et événements, toujours propager (forcePropagation)
    // Sinon, vérifier si l'état change réellement
    // CORRECTION: Toujours propager pour les changements d'état, même si l'état cible est le même
    // Car cela peut être un nouveau cycle de propagation
    const shouldCheckData = !options?.forcePropagation && currentState === newState;
    if (shouldCheckData) {
      const currentData = this.getNodeData(sourceNodeId);
      if (data && currentData && JSON.stringify(data) === JSON.stringify(currentData)) {
        logger.debug(
          `[SignalSystem] Node ${sourceNodeId} déjà dans l'état ${newState} avec mêmes données, propagation ignorée`
        );
        return currentState;
      }
      // Si pas de données ou données différentes, continuer la propagation
    }

    // Mettre à jour l'état de la node
    const nodeState = this.nodeStates.get(sourceNodeId);
    if (nodeState) {
      nodeState.state = newState;
      nodeState.data = data;
      nodeState.lastUpdate = Date.now();
    } else {
      this.nodeStates.set(sourceNodeId, {
        state: newState,
        data,
        lastUpdate: Date.now(),
        activeConnections: new Set(),
      });
    }

    const signal: Signal = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceNodeId,
      timestamp: Date.now(),
      state: newState,
      data,
      context: context || this.globalContext,
      explicitOff: newState === 'OFF' && options?.explicitOff !== false,
    };

    this.stats.totalSignals++;
    this.emitEvent(`signal.state.${newState.toLowerCase()}`, {
      nodeId: sourceNodeId,
      timestamp: Date.now(),
      state: newState,
    });

    await this.propagateSignal(signal, sourceNodeId);

    return newState;
  }

  /**
   * Activer une node (passer à ON)
   */
  async activateNode(
    nodeId: number,
    data?: any,
    context?: ExecutionContext,
    options?: { forcePropagation?: boolean }
  ): Promise<void> {
    await this.setNodeState(nodeId, 'ON', data, context, options);
  }

  /**
   * Désactiver une node (passer à OFF)
   */
  async deactivateNode(
    nodeId: number,
    data?: any,
    context?: ExecutionContext,
    options?: { forcePropagation?: boolean }
  ): Promise<void> {
    await this.setNodeState(nodeId, 'OFF', data, context, options);
  }

  /**
   * Basculer l'état d'une node
   */
  async toggleNode(
    nodeId: number,
    data?: any,
    context?: ExecutionContext,
    options?: { forcePropagation?: boolean }
  ): Promise<SignalState> {
    return await this.setNodeState(nodeId, undefined, data, context, options);
  }

  /**
   * DEPRECATED: Maintenu pour compatibilité - utiliser setNodeState à la place
   */
  async toggleContinuousSignal(
    sourceNodeId: number,
    data?: any,
    context?: ExecutionContext,
    options?: { forceState?: 'start' | 'stop' }
  ): Promise<'started' | 'stopped'> {
    const targetState =
      options?.forceState === 'start' ? 'ON' : options?.forceState === 'stop' ? 'OFF' : undefined;

    const newState = await this.setNodeState(sourceNodeId, targetState, data, context);
    return newState === 'ON' ? 'started' : 'stopped';
  }

  /**
   * DEPRECATED: Maintenu pour compatibilité
   */
  isContinuousSignalActive(nodeId: number): boolean {
    return this.isNodeActive(nodeId);
  }

  /**
   * DEPRECATED: Maintenu pour compatibilité
   */
  getContinuousSignalData(nodeId: number): { data?: any; startedAt: number } | undefined {
    const state = this.nodeStates.get(nodeId);
    if (state && state.state === 'ON') {
      return {
        data: state.data,
        startedAt: state.lastUpdate,
      };
    }
    return undefined;
  }

  /**
   * DEPRECATED: Maintenu pour compatibilité
   */
  getActiveContinuousSignals(): Map<number, { data?: any; startedAt: number }> {
    const activeSignals = new Map<number, { data?: any; startedAt: number }>();
    this.nodeStates.forEach((state, nodeId) => {
      if (state.state === 'ON') {
        activeSignals.set(nodeId, {
          data: state.data,
          startedAt: state.lastUpdate,
        });
      }
    });
    return activeSignals;
  }

  /**
   * Arrêter toutes les nodes actives
   */
  async stopAllActiveNodes(): Promise<void> {
    const activeNodes = this.getActiveNodes();
    for (const nodeId of activeNodes) {
      await this.deactivateNode(nodeId);
    }
  }

  /**
   * DEPRECATED: Maintenu pour compatibilité
   */
  async stopAllContinuousSignals(): Promise<void> {
    await this.stopAllActiveNodes();
  }

  /**
   * DEPRECATED: Émettre un signal - utiliser setNodeState à la place
   */
  async emitSignal(sourceNodeId: number, data?: any, context?: ExecutionContext): Promise<void> {
    // Pour les triggers et tests, on force toujours un nouveau pulse
    // même si l'état est déjà ON
    await this.pulseNode(sourceNodeId, data, context);
  }

  /**
   * DEPRECATED: Émettre un signal immédiat - utiliser setNodeState à la place
   */
  async emitSignalImmediate(
    sourceNodeId: number,
    data?: any,
    context?: ExecutionContext
  ): Promise<void> {
    await this.pulseNode(sourceNodeId, data, context);
  }

  /**
   * Émettre un pulse (ON puis OFF immédiatement après propagation)
   * Utile pour les triggers et événements ponctuels
   */
  async pulseNode(sourceNodeId: number, data?: any, context?: ExecutionContext): Promise<void> {
    // Émettre ON avec forcePropagation pour garantir la propagation même si déjà ON
    await this.setNodeState(sourceNodeId, 'ON', data, context, {
      explicitOff: false,
      forcePropagation: true,
    });

    // Attendre un court délai pour que le signal ON se propage complètement
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Émettre OFF immédiatement pour terminer le pulse (non explicite)
    await this.setNodeState(sourceNodeId, 'OFF', data, context, {
      explicitOff: false,
      forcePropagation: true,
    });
  }

  /**
   * Propager un signal à travers le graphe
   */
  private async propagateSignal(
    signal: Signal,
    currentNodeId: number,
    allowedOutputs?: number[]
  ): Promise<void> {
    this.activePropagations++;

    try {
      const signalKey = `${signal.id}_${currentNodeId}`;
      if (this.processingSignals.has(signalKey)) return;
      this.processingSignals.add(signalKey);

      try {
        const node = this.graph.nodes.get(currentNodeId);
        if (!node) return;

        if (signal.context) {
          signal.context.executionStack.push(currentNodeId);
        }

        let outputNodes = node.outputs;
        if (allowedOutputs?.length) {
          outputNodes = outputNodes.filter((o) => allowedOutputs.includes(o));
        }

        for (const outputNodeId of outputNodes) {
          const handler = this.handlers.get(outputNodeId);

          if (handler) {
            try {
              const startTime = Date.now();
              const result = await Promise.resolve(handler(signal));
              this.stats.averageExecutionTime =
                (this.stats.averageExecutionTime + Date.now() - startTime) / 2;

              const propagatedState = result.state ?? signal.state;
              this.emitEvent('signal.propagated', {
                fromNodeId: currentNodeId,
                toNodeId: outputNodeId,
                signalId: signal.id,
                state: propagatedState,
              });

              const outputNodeState = this.nodeStates.get(outputNodeId);
              let stateChanged = false;
              let oldState: SignalState = 'OFF';

              if (outputNodeState) {
                oldState = outputNodeState.state;

                if (propagatedState === 'ON') {
                  const wasNew = !outputNodeState.activeConnections.has(currentNodeId);
                  outputNodeState.activeConnections.add(currentNodeId);
                  if (oldState !== 'ON' || wasNew) stateChanged = true;
                  outputNodeState.state = 'ON';
                  outputNodeState.data = result.data ?? signal.data;
                  outputNodeState.lastUpdate = Date.now();
                } else if (propagatedState === 'OFF') {
                  outputNodeState.activeConnections.delete(currentNodeId);
                  if (outputNodeState.activeConnections.size === 0) {
                    if (oldState !== 'OFF') stateChanged = true;
                    outputNodeState.state = 'OFF';
                    outputNodeState.data = result.data ?? signal.data;
                    outputNodeState.lastUpdate = Date.now();
                  }
                }
              }

              if (result.propagate) {
                let shouldPropagate = stateChanged || propagatedState === 'ON';

                if (
                  outputNodeState &&
                  propagatedState === 'OFF' &&
                  outputNodeState.activeConnections.size > 0
                ) {
                  shouldPropagate = false;
                }

                const isPulse =
                  signal.data && typeof signal.data === 'object' && '_pulse' in signal.data;
                if (isPulse) shouldPropagate = true;

                if (shouldPropagate) {
                  const newSignal: Signal = {
                    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    sourceNodeId: outputNodeId,
                    timestamp: Date.now(),
                    state: propagatedState,
                    data: result.data ?? signal.data,
                    context: signal.context,
                  };

                  if (result.targetOutputs?.length) {
                    await this.propagateSignal(newSignal, outputNodeId, result.targetOutputs);
                  } else {
                    await this.propagateSignal(newSignal, outputNodeId);
                  }
                }
              } else {
                this.emitEvent('signal.blocked', {
                  nodeId: outputNodeId,
                  reason: 'handler_stopped_propagation',
                  state: signal.state,
                });
              }
            } catch (error) {
              logger.error(`[SignalSystem] Error in node ${outputNodeId}:`, error);
              this.stats.failedSignals++;
              this.emitEvent('signal.blocked', {
                nodeId: outputNodeId,
                reason: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          } else {
            const outputNodeState = this.nodeStates.get(outputNodeId);
            if (outputNodeState) {
              let shouldPropagate = true;

              if (signal.state === 'ON') {
                outputNodeState.activeConnections.add(currentNodeId);
                outputNodeState.state = 'ON';
                outputNodeState.data = signal.data;
                outputNodeState.lastUpdate = Date.now();
              } else {
                outputNodeState.activeConnections.delete(currentNodeId);
                if (outputNodeState.activeConnections.size === 0) {
                  outputNodeState.state = 'OFF';
                  outputNodeState.data = signal.data;
                  outputNodeState.lastUpdate = Date.now();
                } else {
                  shouldPropagate = false;
                }
              }

              if (shouldPropagate) {
                this.emitEvent('signal.propagated', {
                  fromNodeId: currentNodeId,
                  toNodeId: outputNodeId,
                  signalId: signal.id,
                  state: signal.state,
                });
                await this.propagateSignal(signal, outputNodeId);
              }
            }
          }
        }
      } finally {
        setTimeout(() => this.processingSignals.delete(signalKey), 500);
      }
    } finally {
      this.activePropagations--;
    }
  }
  /**
   * Réinitialiser le système
   */
  reset(): void {
    this.handlers.clear();
    this.processingSignals.clear();
    this.activePropagations = 0;
    this.globalContext = this.createNewContext();
    this.eventHandlers.clear();

    // Réinitialiser tous les états à OFF
    this.nodeStates.forEach((state) => {
      state.state = 'OFF';
      state.data = undefined;
      state.lastUpdate = Date.now();
      state.activeConnections.clear();
    });

    this.stats.totalSignals = 0;
    this.stats.failedSignals = 0;
    this.stats.averageExecutionTime = 0;
    this.stats.lastEmittedEvent = null;

    logger.info('[SignalSystem] Système réinitialisé');
  }

  /**
   * Obtenir les statistiques du système
   */
  getStats(): {
    registeredHandlers: number;
    totalSignals: number;
    failedSignals: number;
    averageExecutionTime: number;
    variablesCount: number;
    eventHandlersCount: number;
    lastEmittedEvent: string | null;
    activeNodes: number;
    processingSignals: number;
    isIdle: boolean;
  } {
    return {
      registeredHandlers: this.handlers.size,
      totalSignals: this.stats.totalSignals,
      failedSignals: this.stats.failedSignals,
      averageExecutionTime: this.stats.averageExecutionTime,
      variablesCount: this.globalContext.variables.size,
      eventHandlersCount: this.eventHandlers.size,
      lastEmittedEvent: (this.stats.lastEmittedEvent ?? null) as string | null,
      activeNodes: this.getActiveNodes().length,
      processingSignals: this.processingSignals.size,
      isIdle: this.activePropagations === 0,
    };
  }
}

// ============================================================================
// Instance globale (singleton)
// ============================================================================
let globalSignalSystem: SignalSystem | null = null;

export function initializeSignalSystem(graph: Graph): SignalSystem {
  globalSignalSystem = new SignalSystem(graph);
  logger.info('[SignalSystem] Système initialisé');
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
  logger.info('[SignalSystem] Système global réinitialisé');
}
