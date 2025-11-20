/**
 * Hook pour gérer la communication avec la WebView
 */

import { useRef, useState, useCallback } from 'react';
import type { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { logger } from '../utils/logger';
import type { WebViewMessage, DrawflowExport } from '../types';
import { ErrorCode } from '../types';
import { logError, createAppError } from '../utils/errorHandler';
import { nodeRegistry } from '../engine/NodeRegistry';

interface UseWebViewMessagingOptions {
  onReady?: () => void;
  onExport?: (data: DrawflowExport) => void;
  onImported?: () => void;
  onRequestImport?: () => void;
  onNodeSettingsChanged?: (payload: any) => void;
}

export function useWebViewMessaging(options: UseWebViewMessagingOptions = {}) {
  const webRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);

  /**
   * Envoyer un message à la WebView
   */
  const sendMessage = useCallback(
    (message: WebViewMessage) => {
      if (!isReady) {
        const error = createAppError(
          ErrorCode.WEBVIEW_NOT_READY,
          'Cannot send message: WebView is not ready'
        );
        logError(error, 'useWebViewMessaging');
        return false;
      }

      if (!webRef.current) {
        logError(new Error('WebView ref is null'), 'useWebViewMessaging');
        return false;
      }

      try {
        webRef.current.postMessage(JSON.stringify(message));
  logger.debug('📤 Sent to WebView:', message.type);
        return true;
      } catch (error) {
        logError(
          error instanceof Error ? error : new Error(String(error)),
          'useWebViewMessaging.sendMessage'
        );
        return false;
      }
    },
    [isReady]
  );

  /**
   * Gérer les messages reçus de la WebView
   */
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
  logger.debug('📨 Message from WebView:', message.type);

        switch (message.type) {
          case 'READY':
            setIsReady(true);
            options.onReady?.();
            break;

          case 'EXPORT':
            options.onExport?.(message.payload);
            break;

          case 'IMPORTED':
            options.onImported?.();
            break;

          case 'REQUEST_IMPORT':
            options.onRequestImport?.();
            break;

          case 'NODE_SETTING_CHANGED':
            options.onNodeSettingsChanged?.(message.payload);
            break;

          default:
            logger.warn('⚠️ Unknown message type:', message.type);
        }
      } catch (error) {
        const appError = createAppError(
          ErrorCode.PARSE_ERROR,
          'Failed to parse WebView message',
          error
        );
        logError(appError, 'useWebViewMessaging.handleMessage');
      }
    },
    [options]
  );

  /**
   * Charger un graphe dans la WebView
   */
  const loadGraph = useCallback(
    (graphData: DrawflowExport) => {
      return sendMessage({
        type: 'LOAD_GRAPH',
        payload: graphData,
      });
    },
    [sendMessage]
  );

  /**
   * Ajouter un nœud
   */
  const addNode = useCallback(
    (nodeType: string, x?: number, y?: number, data?: Record<string, any>) => {
      // Récupérer les informations de la node depuis le registry
      const nodeDefinition = nodeRegistry.getNode(nodeType);

      let nodeData = null;
      if (nodeDefinition) {
        // Préparer les données pour la WebView
        nodeData = {
          name: nodeDefinition.name,
          description: nodeDefinition.description,
          icon: nodeDefinition.icon,
          inputs: nodeDefinition.inputs.length,
          outputs: nodeDefinition.outputs.length,
          class: `${nodeDefinition.category.toLowerCase()}-node`,
          data: { type: nodeType, ...data },
          html: nodeDefinition.generateHTML
            ? nodeDefinition.generateHTML(data || {})
            : `<div class="title"><span class="node-icon">${nodeDefinition.icon || '📦'}</span> ${
                nodeDefinition.name
              }</div><div class="content">${nodeDefinition.description}</div>`,
        };

  logger.debug('📦 Node data prepared:', nodeData);
      }

      return sendMessage({
        type: 'ADD_NODE',
        payload: { nodeType, x, y, data, nodeData },
      });
    },
    [sendMessage]
  );

  /**
   * Demander l'export du graphe
   */
  const requestExport = useCallback(() => {
    return sendMessage({
      type: 'REQUEST_EXPORT',
      payload: {},
    });
  }, [sendMessage]);

  /**
   * Effacer le graphe
   */
  const clearGraph = useCallback(() => {
    return sendMessage({
      type: 'CLEAR',
      payload: {},
    });
  }, [sendMessage]);

  return {
    webRef,
    isReady,
    handleMessage,
    sendMessage,
    loadGraph,
    addNode,
    requestExport,
    clearGraph,
  };
}
