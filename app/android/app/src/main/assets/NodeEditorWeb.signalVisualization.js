/**
 * NodeEditorWeb.signalVisualization.js
 *
 * Module de visualisation des signaux en temps réel dans le graphe
 * Permet de voir les signaux se propager visuellement entre les nœuds
 */

(function () {
  'use strict';

  // État des signaux actifs
  const activeSignals = new Set();
  const signalAnimationTimeouts = new Map();

  /**
   * Active visuellement un nœud comme source de signal continu
   */
  function activateNode(nodeId) {
    const nodeEl = document.getElementById('node-' + nodeId);
    if (!nodeEl) return;

    activeSignals.add(nodeId);
    nodeEl.classList.add('signal-active');

    // Ajouter l'indicateur si pas déjà présent
    if (!nodeEl.querySelector('.node-signal-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'node-signal-indicator';
      nodeEl.appendChild(indicator);
    }

    console.log('[SignalViz] Node activated:', nodeId);
  }

  /**
   * Désactive visuellement un nœud
   */
  function deactivateNode(nodeId) {
    const nodeEl = document.getElementById('node-' + nodeId);
    if (!nodeEl) return;

    activeSignals.delete(nodeId);
    nodeEl.classList.remove('signal-active', 'signal-receiving', 'signal-propagating');

    // Retirer l'indicateur
    const indicator = nodeEl.querySelector('.node-signal-indicator');
    if (indicator) {
      indicator.remove();
    }

    console.log('[SignalViz] Node deactivated:', nodeId);
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
    const editor = window.DrawflowEditor?.editor;
    if (!editor) return;

    // Trouver la connexion entre les deux nœuds
    const connections = document.querySelectorAll('.connection');
    connections.forEach((conn) => {
      const pathEl = conn.querySelector('path.main-path');
      if (!pathEl) return;

      // Vérifier si cette connexion lie les deux nœuds
      const classList = Array.from(conn.classList);
      const hasFrom = classList.some((c) => c.includes('node_out_node-' + fromNodeId));
      const hasTo = classList.some((c) => c.includes('node_in_node-' + toNodeId));

      if (hasFrom && hasTo) {
        conn.classList.add('signal-flowing');

        setTimeout(() => {
          conn.classList.remove('signal-flowing');
        }, duration);

        // Créer une particule qui suit le chemin
        createSignalParticle(pathEl, duration);
      }
    });
  }

  /**
   * Crée une particule animée le long d'un chemin SVG
   */
  function createSignalParticle(pathEl, duration) {
    const svg = pathEl.closest('svg');
    if (!svg) return;

    const particle = document.createElement('div');
    particle.className = 'connection-signal-particle';
    document.body.appendChild(particle);

    const pathLength = pathEl.getTotalLength();
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        const point = pathEl.getPointAtLength(progress * pathLength);
        const svgRect = svg.getBoundingClientRect();

        particle.style.left = svgRect.left + point.x - 5 + 'px';
        particle.style.top = svgRect.top + point.y - 5 + 'px';

        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    }

    requestAnimationFrame(animate);
  }

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
      conn.classList.remove('signal-flowing');
    });

    // Remove all particles
    document.querySelectorAll('.connection-signal-particle').forEach((p) => p.remove());

    activeSignals.clear();
    console.log('[SignalViz] All visuals reset');
  }

  /**
   * Handler pour les messages de React Native
   */
  function handleSignalMessage(msg) {
    switch (msg.type) {
      case 'SIGNAL_START':
        // Programme démarré - activer le trigger
        if (msg.payload?.triggerNodeId) {
          activateNode(msg.payload.triggerNodeId);
        }
        break;

      case 'SIGNAL_STOP':
        // Programme arrêté - tout reset
        resetAllVisuals();
        break;

      case 'SIGNAL_PROPAGATE':
        // Signal qui se propage
        if (msg.payload?.fromNodeId) {
          flashNodePropagating(msg.payload.fromNodeId);
        }
        if (msg.payload?.toNodeId) {
          flashNodeReceiving(msg.payload.toNodeId);
          if (msg.payload.fromNodeId) {
            animateConnection(msg.payload.fromNodeId, msg.payload.toNodeId);
          }
        }
        break;

      case 'SIGNAL_BLOCKED':
        // Signal bloqué sur une condition
        if (msg.payload?.nodeId) {
          flashNodeBlocked(msg.payload.nodeId);
        }
        break;

      case 'SIGNAL_PATH':
        // Chemin complet de propagation
        if (msg.payload?.path) {
          propagateSignalVisual(msg.payload.path, msg.payload.delay || 200);
        }
        break;

      case 'NODE_ACTIVE':
        // Marquer un nœud comme actif
        if (msg.payload?.nodeId) {
          activateNode(msg.payload.nodeId);
        }
        break;

      case 'NODE_INACTIVE':
        // Marquer un nœud comme inactif
        if (msg.payload?.nodeId) {
          deactivateNode(msg.payload.nodeId);
        }
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

  console.log('[SignalViz] Module loaded');
})();
