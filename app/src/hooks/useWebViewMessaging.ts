/**
 * Hook pour gérer la communication avec la WebView
 */

import { useRef, useState, useCallback } from 'react';
import { Keyboard } from 'react-native';
import type { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { WebViewMessage, DrawflowExport } from '../types';
import { ErrorCode } from '../types';
import { logError, createAppError } from '../utils/errorHandler';
import { nodeRegistry } from '../engine/NodeRegistry';
import { buildNodeCardHTML } from '../engine/nodes/templates/nodeCard';

interface UseWebViewMessagingOptions {
  onReady?: () => void;
  onExport?: (data: DrawflowExport) => void;
  onImported?: () => void;
  onRequestImport?: () => void;
  onNodeSettingsChanged?: (payload: any) => void;
  onNodeInputChanged?: (payload: any) => void;
  onThemeApplied?: (theme: 'light' | 'dark') => void;
}

export function useWebViewMessaging(options: UseWebViewMessagingOptions = {}) {
  const webRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  // Use a ref to synchronously reflect readiness to avoid race conditions
  // where `setIsReady(true)` hasn't propagated to the closure yet.
  const isReadyRef = useRef(false);

  /**
   * Envoyer un message à la WebView
   */
  const sendMessage = useCallback(
    (message: WebViewMessage) => {
      if (!isReadyRef.current) {
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
        console.log('📤 Sent to WebView:', message.type);
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
        console.log('📨 Message from WebView:', message.type);

        switch (message.type) {
          case 'READY':
            // Keep ref and state in sync. Set the ref first so any immediate
            // invocations of sendMessage from the onReady handler will succeed.
            isReadyRef.current = true;
            setIsReady(true);
            // Defer calling onReady to avoid synchronous side-effects during
            // mount that could change the hooks call order unexpectedly.
            try {
              setTimeout(() => options.onReady?.(), 0);
            } catch {
              // Fallback: call directly if setTimeout fails for any reason
              options.onReady?.();
            }
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
          case 'INPUT_VALUE_CHANGED':
            options.onNodeInputChanged?.(message.payload);
            break;
          case 'THEME_APPLIED':
            options.onThemeApplied?.(message.payload?.theme);
            break;

          case 'DISMISS_KEYBOARD':
            try {
              setTimeout(() => {
                try {
                  Keyboard.dismiss();
                } catch (e) {
                  console.warn('Failed to dismiss keyboard on first attempt:', e);
                }
                // Second attempt after a bit more delay for extra safety
                setTimeout(() => {
                  try {
                    Keyboard.dismiss();
                    console.log('📨 DISMISS_KEYBOARD: Keyboard.dismiss() called');
                  } catch (e) {
                    console.warn('Failed to dismiss keyboard on second attempt:', e);
                  }
                }, 120);
              }, 60);
            } catch (err) {
              console.warn('Failed to schedule keyboard dismiss:', err);
            }
            break;
            break;

          default:
            console.warn('⚠️ Unknown message type:', message.type);
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
        const fallbackHtml = buildNodeCardHTML({
          title: nodeDefinition.name,
          subtitle: nodeDefinition.description,
          iconName: nodeDefinition.icon,
          category: nodeDefinition.category,
          accentColor: nodeDefinition.color,
        });

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
            ? nodeDefinition.generateHTML(data || {}, {
                id: nodeDefinition.id,
                name: nodeDefinition.name,
                category: nodeDefinition.category,
                description: nodeDefinition.description,
                icon: nodeDefinition.icon,
                iconFamily: nodeDefinition.iconFamily,
                color: nodeDefinition.color,
              })
            : fallbackHtml,
        };

        console.log('📦 Node data prepared:', nodeData);
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

  /**
   * Envoyer le thème courant à la WebView
   */
  const setTheme = useCallback(
    (theme: 'dark' | 'light') => {
      return sendMessage({
        type: 'SET_THEME',
        payload: { theme },
      });
    },
    [sendMessage]
  );

  return {
    webRef,
    isReady,
    handleMessage,
    sendMessage,
    loadGraph,
    addNode,
    requestExport,
    clearGraph,
    setTheme,
  };
}
