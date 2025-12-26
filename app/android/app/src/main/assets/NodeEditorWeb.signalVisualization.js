/**
 * NodeEditorWeb.signalVisualization.js
 *
 * Module de visualisation des signaux en temps réel dans le graphe
 * Permet de voir les signaux se propager visuellement entre les nœuds
 * Version simplifiée sans particules (uniquement animations CSS)
 */

(function () {
  'use strict';

  // État des signaux actifs
  const activeSignals = new Set();
  const signalAnimationTimeouts = new Map();
  // Connexions actives (signal ON qui passe par là)
  const activeConnections = new Map(); // Map<connectionKey, intervalId>
  // Flux continus en cours - Map<nodeId, Set<connectionKey>>
  const continuousFlows = new Map();

  /**
   * Trouver l'élément de connexion entre deux nœuds
   */
  function findConnectionElement(fromNodeId, toNodeId) {
    const connections = document.querySelectorAll('.connection');
    for (const conn of connections) {
      const classList = Array.from(conn.classList);
      // Drawflow utilise des classes comme: node_out_node-2 output_1 node_in_node-3 input_1
      const hasFrom = classList.some((c) => c.includes('node_out_node-' + fromNodeId));
      const hasTo = classList.some((c) => c.includes('node_in_node-' + toNodeId));
      if (hasFrom && hasTo) {
        return conn;
      }
    }
    return null;
  }

  /**
   * Trouver toutes les connexions sortantes d'un nœud
   */
  function findOutgoingConnections(nodeId) {
    const connections = [];
    document.querySelectorAll('.connection').forEach((conn) => {
      const classList = Array.from(conn.classList);
      if (classList.some((c) => c.includes('node_out_node-' + nodeId))) {
        // Extraire le nodeId de destination
        const toClass = classList.find((c) => c.includes('node_in_node-'));
        if (toClass) {
          const match = toClass.match(/node_in_node-(\d+)/);
          if (match) {
            connections.push({
              element: conn,
              toNodeId: parseInt(match[1], 10),
            });
          }
        }
      }
    });
    return connections;
  }

  /**
   * Active visuellement un nœud comme source de signal continu
   */
  function activateNode(nodeId) {
    const nodeEl = document.getElementById('node-' + nodeId);
    if (!nodeEl) {
      return;
    }

    // Éviter les activations multiples
    if (activeSignals.has(nodeId)) {
      return;
    }

    activeSignals.add(nodeId);
    nodeEl.classList.add('signal-active');

    // Ajouter l'indicateur si pas déjà présent
    if (!nodeEl.querySelector('.node-signal-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'node-signal-indicator';
      nodeEl.appendChild(indicator);
    }

    // Activer le flux continu sur les connexions sortantes
    startContinuousFlow(nodeId);
  }

  /**
   * Désactive visuellement un nœud
   */
  function deactivateNode(nodeId) {
    const nodeEl = document.getElementById('node-' + nodeId);

    // Retirer de la liste des signaux actifs
    activeSignals.delete(nodeId);

    if (nodeEl) {
      nodeEl.classList.remove(
        'signal-active',
        'signal-receiving',
        'signal-propagating',
        'signal-blocked'
      );

      // Retirer l'indicateur
      const indicator = nodeEl.querySelector('.node-signal-indicator');
      if (indicator) {
        indicator.remove();
      }
    }

    // Arrêter le flux continu depuis ce nœud
    stopContinuousFlow(nodeId);
  }

  /**
   * Démarre un flux continu de particules sur les connexions sortantes d'un nœud
   */
  function startContinuousFlow(nodeId) {
    const outgoing = findOutgoingConnections(nodeId);
    if (outgoing.length === 0) return;

    if (!continuousFlows.has(nodeId)) {
      continuousFlows.set(nodeId, new Set());
    }
    const flows = continuousFlows.get(nodeId);

    outgoing.forEach(({ element, toNodeId }) => {
      const connKey = nodeId + '->' + toNodeId;
      if (!flows.has(connKey)) {
        flows.add(connKey);
        element.classList.add('signal-flowing-continuous');
      }
    });
  }

  /**
   * Arrête le flux continu d'un nœud
   */
  function stopContinuousFlow(nodeId) {
    const flows = continuousFlows.get(nodeId);
    if (!flows) return;

    flows.forEach((connKey) => {
      activeConnections.delete(connKey);
    });
    continuousFlows.delete(nodeId);

    // Retirer les classes des connexions
    const outgoing = findOutgoingConnections(nodeId);
    outgoing.forEach(({ element }) => {
      element.classList.remove('signal-flowing-continuous');
    });
  }

  /**
   * Anime un signal arrivant sur un nœud
   */
  function flashNodeReceiving(nodeId, duration = 500) {
    const nodeEl = document.getElementById('node-' + nodeId);
    if (!nodeEl) return;

    // Clear any existing timeout
    if (signalAnimationTimeouts.has('receive-' + nodeId)) {
      clearTimeout(signalAnimationTimeouts.get('receive-' + nodeId));
    }

    nodeEl.classList.add('signal-receiving');

    const timeout = setTimeout(() => {
      nodeEl.classList.remove('signal-receiving');
      signalAnimationTimeouts.delete('receive-' + nodeId);
    }, duration);

    signalAnimationTimeouts.set('receive-' + nodeId, timeout);
  }

  /**
   * Anime un signal sortant d'un nœud (propagation)
   */
  function flashNodePropagating(nodeId, duration = 600) {
    const nodeEl = document.getElementById('node-' + nodeId);
    if (!nodeEl) return;

    if (signalAnimationTimeouts.has('propagate-' + nodeId)) {
      clearTimeout(signalAnimationTimeouts.get('propagate-' + nodeId));
    }

    nodeEl.classList.add('signal-propagating');

    const timeout = setTimeout(() => {
      nodeEl.classList.remove('signal-propagating');
      signalAnimationTimeouts.delete('propagate-' + nodeId);
    }, duration);

    signalAnimationTimeouts.set('propagate-' + nodeId, timeout);
  }

  /**
   * Anime un signal bloqué sur un nœud
   */
  function flashNodeBlocked(nodeId, duration = 400) {
    const nodeEl = document.getElementById('node-' + nodeId);
    if (!nodeEl) return;

    if (signalAnimationTimeouts.has('blocked-' + nodeId)) {
      clearTimeout(signalAnimationTimeouts.get('blocked-' + nodeId));
    }

    nodeEl.classList.add('signal-blocked');

    const timeout = setTimeout(() => {
      nodeEl.classList.remove('signal-blocked');
      signalAnimationTimeouts.delete('blocked-' + nodeId);
    }, duration);

    signalAnimationTimeouts.set('blocked-' + nodeId, timeout);
  }

  /**
   * Anime une connexion quand un signal passe
   */
  function animateConnection(fromNodeId, toNodeId, duration = 800) {
    // Utiliser notre nouvelle fonction pour trouver la connexion
    const conn = findConnectionElement(fromNodeId, toNodeId);
    if (!conn) {
      return;
    }

    conn.classList.add('signal-flowing');

    setTimeout(() => {
      conn.classList.remove('signal-flowing');
    }, duration);
  }

  /**
  /**
   * Propage visuellement un signal à travers le graphe
   */
  function propagateSignalVisual(path, delayBetweenNodes = 200) {
    if (!Array.isArray(path) || path.length === 0) return;

    path.forEach((step, index) => {
      setTimeout(() => {
        const { nodeId, action, nextNodeId } = step;

        if (action === 'receive') {
          flashNodeReceiving(nodeId);
        } else if (action === 'propagate') {
          flashNodePropagating(nodeId);
          if (nextNodeId) {
            animateConnection(nodeId, nextNodeId);
          }
        } else if (action === 'blocked') {
          flashNodeBlocked(nodeId);
        }
      }, index * delayBetweenNodes);
    });
  }

  /**
   * Réinitialise toutes les visualisations
   */
  function resetAllVisuals() {
    // Clear all timeouts
    signalAnimationTimeouts.forEach((timeout) => clearTimeout(timeout));
    signalAnimationTimeouts.clear();

    // Stop all continuous flows
    continuousFlows.forEach((flows, nodeId) => {
      activeConnections.delete(nodeId);
    });
    continuousFlows.clear();

    // Clear all active connection intervals
    activeConnections.forEach((intervalId) => clearInterval(intervalId));
    activeConnections.clear();

    // Remove all signal classes
    document.querySelectorAll('.drawflow-node').forEach((node) => {
      node.classList.remove(
        'signal-active',
        'signal-receiving',
        'signal-propagating',
        'signal-blocked'
      );
      const indicator = node.querySelector('.node-signal-indicator');
      if (indicator) indicator.remove();
    });

    document.querySelectorAll('.connection').forEach((conn) => {
      conn.classList.remove('signal-flowing', 'signal-flowing-continuous');
    });

    // Remove all particles
    document.querySelectorAll('.connection-signal-particle').forEach((p) => p.remove());

    activeSignals.clear();
  }

  /**
   * Handler pour les messages de React Native
   */
  function handleSignalMessage(msg) {
    switch (msg.type) {
      case 'SIGNAL_START':
        // Signal démarré sur un nœud - activer ce nœud
        if (msg.payload?.triggerNodeId) {
          activateNode(msg.payload.triggerNodeId);
        }
        break;

      case 'SIGNAL_STOP':
        // Signal arrêté sur un nœud spécifique (pas tout le graphe)
        if (msg.payload?.nodeId) {
          deactivateNode(msg.payload.nodeId);
        }
        break;

      case 'SIGNAL_PROPAGATE':
        // Signal qui se propage d'un nœud à un autre
        if (msg.payload?.fromNodeId != null && msg.payload?.toNodeId != null) {
          const fromId = msg.payload.fromNodeId;
          const toId = msg.payload.toNodeId;
          const state = msg.payload.state;

          if (state === 'ON') {
            // Signal ON : activer les deux nœuds et animer la connexion
            activateNode(fromId);
            activateNode(toId);
            flashNodePropagating(fromId);
            flashNodeReceiving(toId);
            animateConnection(fromId, toId);
          } else if (state === 'OFF') {
            // Signal OFF : désactiver le nœud destination
            deactivateNode(toId);
          }
        } else if (msg.payload?.fromNodeId != null) {
          // Seulement fromNodeId
          activateNode(msg.payload.fromNodeId);
          flashNodePropagating(msg.payload.fromNodeId);
        }
        break;

      case 'SIGNAL_BLOCKED':
        // Signal bloqué sur une condition - montrer le blocage
        if (msg.payload?.nodeId) {
          flashNodeBlocked(msg.payload.nodeId);
        }
        break;

      case 'SIGNAL_PATH':
        // Chemin complet de propagation (animation séquentielle)
        if (msg.payload?.path) {
          propagateSignalVisual(msg.payload.path, msg.payload.delay || 200);
        }
        break;

      case 'NODE_ACTIVE':
        // Marquer un nœud comme actif
        if (msg.payload?.nodeId != null) {
          activateNode(msg.payload.nodeId);
        }
        break;

      case 'NODE_INACTIVE':
        // Marquer un nœud comme inactif
        if (msg.payload?.nodeId != null) {
          deactivateNode(msg.payload.nodeId);
        }
        break;

      case 'RESET_ALL':
        // Réinitialiser toutes les visualisations (arrêt du programme)
        resetAllVisuals();
        break;
    }
  }

  // Exposer les fonctions au namespace global
  window.DrawflowEditor = window.DrawflowEditor || {};
  window.DrawflowEditor.signalViz = {
    activateNode,
    deactivateNode,
    flashNodeReceiving,
    flashNodePropagating,
    flashNodeBlocked,
    animateConnection,
    propagateSignalVisual,
    resetAllVisuals,
    handleSignalMessage,
    getActiveSignals: () => new Set(activeSignals),
  };
})();
