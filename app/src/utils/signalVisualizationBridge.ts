/**
 * SignalVisualizationBridge - Pont entre SignalSystem et WebView
 * 
 * Ce service écoute les événements du SignalSystem et envoie les messages
 * appropriés au WebView pour la visualisation en temps réel
 */

import { getSignalSystem } from '../engine/SignalSystem';
import { logger } from './logger';
import type { WebViewMessage, WebViewMessageType } from '../types';

type SendMessageFn = (message: WebViewMessage) => boolean;

class SignalVisualizationBridge {
  private sendMessage: SendMessageFn | null = null;
  private unsubscribers: (() => void)[] = [];
  private isConnected = false;
  private triggerNodeId: number | null = null;

  /**
   * Connecter le bridge au WebView
   */
  connect(sendMessageFn: SendMessageFn): void {
    if (this.isConnected) {
      this.disconnect();
    }

    this.sendMessage = sendMessageFn;
    this.isConnected = true;
    this.setupListeners();
    logger.info('[SignalVizBridge] Connected to WebView');
  }

  /**
   * Déconnecter le bridge
   */
  disconnect(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.sendMessage = null;
    this.isConnected = false;
    this.triggerNodeId = null;
    logger.info('[SignalVizBridge] Disconnected');
  }

  /**
   * Définir le trigger node ID actuel
   */
  setTriggerNodeId(nodeId: number | null): void {
    this.triggerNodeId = nodeId;
  }

  /**
   * Configurer les listeners du SignalSystem
   */
  private setupListeners(): void {
    const ss = getSignalSystem();
    if (!ss) {
      logger.warn('[SignalVizBridge] SignalSystem not available yet');
      return;
    }

    // Écouter le démarrage d'un signal continu
    const unsubStart = ss.subscribeToEvent('signal.continuous.started', 0, (data: any) => {
      this.send('SIGNAL_START', { 
        triggerNodeId: data?.nodeId || this.triggerNodeId,
        timestamp: Date.now(),
      });
    });
    this.unsubscribers.push(unsubStart);

    // Écouter l'arrêt d'un signal continu
    const unsubStop = ss.subscribeToEvent('signal.continuous.stopped', 0, (data: any) => {
      this.send('SIGNAL_STOP', { 
        nodeId: data?.nodeId,
        timestamp: Date.now(),
      });
    });
    this.unsubscribers.push(unsubStop);

    // Écouter la propagation des signaux
    const unsubPropagate = ss.subscribeToEvent('signal.propagated', 0, (data: any) => {
      this.send('SIGNAL_PROPAGATE', {
        fromNodeId: data?.fromNodeId,
        toNodeId: data?.toNodeId,
        timestamp: Date.now(),
      });
    });
    this.unsubscribers.push(unsubPropagate);

    // Écouter les signaux bloqués
    const unsubBlocked = ss.subscribeToEvent('signal.blocked', 0, (data: any) => {
      this.send('SIGNAL_BLOCKED', {
        nodeId: data?.nodeId,
        reason: data?.reason,
        timestamp: Date.now(),
      });
    });
    this.unsubscribers.push(unsubBlocked);

    logger.info('[SignalVizBridge] Listeners configured');
  }

  /**
   * Reconnecter les listeners après un reset du SignalSystem
   */
  reconnectListeners(): void {
    if (!this.isConnected) return;
    
    // Nettoyer les anciens listeners
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    
    // Reconnecter
    this.setupListeners();
  }

  /**
   * Envoyer un message au WebView
   */
  private send(type: WebViewMessageType, payload?: any): void {
    if (!this.sendMessage || !this.isConnected) {
      return;
    }

    try {
      this.sendMessage({ type, payload });
      logger.debug(`[SignalVizBridge] Sent: ${type}`, payload);
    } catch (error) {
      logger.error('[SignalVizBridge] Failed to send message:', error);
    }
  }

  /**
   * Notifier manuellement le WebView d'un événement
   */
  notifyNodeActive(nodeId: number): void {
    this.send('NODE_ACTIVE', { nodeId });
  }

  notifyNodeInactive(nodeId: number): void {
    this.send('NODE_INACTIVE', { nodeId });
  }

  notifySignalPath(path: Array<{ nodeId: number; action: string; nextNodeId?: number }>): void {
    this.send('SIGNAL_PATH', { path, delay: 200 });
  }
}

// Instance singleton
export const signalVisualizationBridge = new SignalVisualizationBridge();
