/**
 * SignalVisualizationBridge - Pont entre SignalSystem et WebView
 */

import { DeviceEventEmitter } from 'react-native';
import { getSignalSystem } from '../engine/SignalSystem';
import type { WebViewMessage, WebViewMessageType } from '../types';

type SendMessageFn = (message: WebViewMessage) => boolean;

class SignalVisualizationBridge {
  private sendMessage: SendMessageFn | null = null;
  private unsubscribers: (() => void)[] = [];
  private isConnected = false;
  private triggerNodeId: number | null = null;
  private signalSystemInitListener: any = null;

  connect(sendMessageFn: SendMessageFn): void {
    if (this.isConnected) this.disconnect();

    this.sendMessage = sendMessageFn;
    this.isConnected = true;
    this.setupListeners();

    this.signalSystemInitListener = DeviceEventEmitter.addListener('signalsystem.initialized', () =>
      this.reconnectListeners()
    );
  }

  disconnect(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.sendMessage = null;
    this.isConnected = false;
    this.triggerNodeId = null;

    if (this.signalSystemInitListener) {
      this.signalSystemInitListener.remove();
      this.signalSystemInitListener = null;
    }
  }

  setTriggerNodeId(nodeId: number | null): void {
    this.triggerNodeId = nodeId;
  }

  private setupListeners(): void {
    const ss = getSignalSystem();
    if (!ss) return;

    const unsubStart = ss.subscribeToEvent('signal.state.on', 0, (data: any) => {
      this.send('SIGNAL_START', {
        triggerNodeId: data?.nodeId || this.triggerNodeId,
        timestamp: Date.now(),
      });
      if (data?.nodeId) this.send('NODE_ACTIVE', { nodeId: data.nodeId });
    });
    this.unsubscribers.push(unsubStart);

    const unsubStop = ss.subscribeToEvent('signal.state.off', 0, (data: any) => {
      this.send('SIGNAL_STOP', { nodeId: data?.nodeId, timestamp: Date.now() });
      if (data?.nodeId) this.send('NODE_INACTIVE', { nodeId: data.nodeId });
    });
    this.unsubscribers.push(unsubStop);

    const unsubPropagate = ss.subscribeToEvent('signal.propagated', 0, (data: any) => {
      this.send('SIGNAL_PROPAGATE', {
        fromNodeId: data?.fromNodeId,
        toNodeId: data?.toNodeId,
        state: data?.state,
        timestamp: Date.now(),
      });
    });
    this.unsubscribers.push(unsubPropagate);

    const unsubBlocked = ss.subscribeToEvent('signal.blocked', 0, (data: any) => {
      this.send('SIGNAL_BLOCKED', {
        nodeId: data?.nodeId,
        reason: data?.reason,
        timestamp: Date.now(),
      });
    });
    this.unsubscribers.push(unsubBlocked);
  }

  reconnectListeners(): void {
    if (!this.isConnected) return;
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.setupListeners();
  }

  private send(type: WebViewMessageType, payload?: any): void {
    if (!this.sendMessage || !this.isConnected) return;
    try {
      this.sendMessage({ type, payload });
    } catch {}
  }

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

export const signalVisualizationBridge = new SignalVisualizationBridge();
