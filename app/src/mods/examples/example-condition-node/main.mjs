/**
 * Example Condition Nodes - Demonstrates the new ConditionHandler API
 *
 * Ce mod montre comment créer des nodes de condition en utilisant le nouveau
 * système ConditionHandler. Il inclut trois exemples:
 *
 * 1. Battery Condition - Vérifie le niveau de batterie
 * 2. Time Range Condition - Vérifie si l'heure est dans une plage
 * 3. Random Condition - Condition aléatoire basée sur une probabilité
 *
 * @module example-condition-node
 */

// État interne du mod
const state = {
  batteryLevel: 100,
  conditionNodes: new Map(),
  activeTimers: new Map(),
  isActive: false,
};

// ============================================================================
// API Object - Sera injecté par le runner
// ============================================================================

let api = null;

// ============================================================================
// CONDITION NODE DEFINITIONS
// ============================================================================

/**
 * Configuration des nodes de condition exposés par ce mod
 */
const conditionNodeDefinitions = {
  'battery-condition': {
    config: {
      type: 'battery-condition',
      label: 'Battery Level',
      category: 'Conditions',
      description: 'Triggers when battery level is above/below a threshold',
      color: '#4CAF50',
      icon: 'battery-charging-full',
      iconFamily: 'material',
      defaultMode: 'continu',
      defaultTimerDuration: 0,
    },
    // Factory pour créer le runtime
    createRuntime: (nodeData) => ({
      checkCondition: () => {
        const threshold = nodeData.threshold ?? 50;
        const comparison = nodeData.comparison ?? 'above';

        if (comparison === 'above') {
          return state.batteryLevel >= threshold;
        } else {
          return state.batteryLevel <= threshold;
        }
      },
      // Pas d'eventSubscription car on utilise polling ou externe
      externalSubscription: {
        setup: (onStateChange) => {
          // Simuler un listener de batterie
          const intervalId = setInterval(() => {
            // En vrai, on appellerait une API native ici
            const threshold = nodeData.threshold ?? 50;
            const comparison = nodeData.comparison ?? 'above';

            let conditionMet;
            if (comparison === 'above') {
              conditionMet = state.batteryLevel >= threshold;
            } else {
              conditionMet = state.batteryLevel <= threshold;
            }

            onStateChange(conditionMet);
          }, 5000); // Check toutes les 5 secondes

          // Retourner la fonction de cleanup
          return () => {
            clearInterval(intervalId);
          };
        },
      },
    }),
  },

  'time-range-condition': {
    config: {
      type: 'time-range-condition',
      label: 'Time Range',
      category: 'Conditions',
      description: 'Triggers when current time is within a specified range',
      color: '#FF9800',
      icon: 'schedule',
      iconFamily: 'material',
      defaultMode: 'continu',
      defaultTimerDuration: 0,
    },
    createRuntime: (nodeData) => ({
      checkCondition: () => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const startHour = nodeData.startHour ?? 9;
        const startMinute = nodeData.startMinute ?? 0;
        const endHour = nodeData.endHour ?? 17;
        const endMinute = nodeData.endMinute ?? 0;

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        // Gérer le cas où la plage traverse minuit
        if (startMinutes <= endMinutes) {
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
      },
      externalSubscription: {
        setup: (onStateChange) => {
          // Vérifier toutes les minutes
          const intervalId = setInterval(() => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const startHour = nodeData.startHour ?? 9;
            const startMinute = nodeData.startMinute ?? 0;
            const endHour = nodeData.endHour ?? 17;
            const endMinute = nodeData.endMinute ?? 0;

            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            let inRange;
            if (startMinutes <= endMinutes) {
              inRange = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
            } else {
              inRange = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
            }

            onStateChange(inRange);
          }, 60000); // Check toutes les minutes

          return () => clearInterval(intervalId);
        },
      },
    }),
  },

  'random-condition': {
    config: {
      type: 'random-condition',
      label: 'Random Chance',
      category: 'Conditions',
      description: 'Triggers randomly based on a probability percentage',
      color: '#9C27B0',
      icon: 'casino',
      iconFamily: 'material',
      defaultMode: 'continu',
      defaultTimerDuration: 0,
    },
    createRuntime: (nodeData) => ({
      checkCondition: () => {
        const probability = nodeData.probability ?? 50;
        const random = Math.random() * 100;
        return random <= probability;
      },
      // Pas d'external subscription - évalué uniquement quand le signal arrive
    }),
  },
};

// ============================================================================
// IPC MESSAGE HANDLERS
// ============================================================================

/**
 * Initialisation du mod
 * @param {Object} params - Paramètres d'initialisation
 */
function handleInit(params) {
  api = params.api;
  state.isActive = true;

  api.log.info('Example Condition Node mod initialized');

  // Enregistrer les nodes de condition auprès du système
  registerConditionNodes();

  return { success: true };
}

/**
 * Enregistrer tous les nodes de condition
 */
function registerConditionNodes() {
  for (const [type, definition] of Object.entries(conditionNodeDefinitions)) {
    // Notifier le loader qu'on a un node de condition à enregistrer
    sendNotification('registerConditionNode', {
      config: definition.config,
      nodeType: type,
    });

    api.log.debug(`Registered condition node: ${type}`);
  }
}

/**
 * Exécution d'un node
 * @param {Object} params - Paramètres d'exécution
 */
function handleRun(params) {
  const { nodeId, nodeType, inputs, config } = params;
  const startTime = Date.now();

  api.log.debug(`Running node ${nodeType} (${nodeId})`, { inputs, config });

  // Vérifier si c'est un de nos nodes de condition
  const definition = conditionNodeDefinitions[nodeType];
  if (!definition) {
    return {
      error: { code: -32601, message: `Unknown node type: ${nodeType}` },
    };
  }

  // Créer le runtime avec les données du node
  const nodeData = { ...config, ...inputs };
  const runtime = definition.createRuntime(nodeData);

  // Évaluer la condition
  const conditionMet = runtime.checkCondition();

  // Gérer le mode (continu, timer, switch) selon la config
  const timerDuration = config.timerDuration ?? 0;
  const switchMode = config.switchMode ?? false;

  let outputState = false;

  if (switchMode) {
    // Mode switch: toggle quand la condition devient vraie
    const currentState = state.conditionNodes.get(nodeId)?.outputState ?? false;
    if (conditionMet) {
      outputState = !currentState;
    } else {
      outputState = currentState;
    }
  } else if (timerDuration > 0) {
    // Mode timer: activer pour une durée
    if (conditionMet) {
      outputState = true;
      // Le timer serait géré côté core via ConditionHandler
    }
  } else {
    // Mode continu: output = condition
    outputState = conditionMet;
  }

  // Sauvegarder l'état
  state.conditionNodes.set(nodeId, {
    outputState,
    conditionMet,
    lastEvaluation: Date.now(),
  });

  return {
    outputs: {
      output: outputState,
    },
    conditionMet,
    logs: [],
    duration: Date.now() - startTime,
  };
}

/**
 * Obtenir les nodes de condition enregistrés
 */
function handleGetConditionNodes() {
  const nodes = [];

  for (const [type, definition] of Object.entries(conditionNodeDefinitions)) {
    nodes.push({
      type,
      config: definition.config,
      // Note: on ne peut pas sérialiser les fonctions, donc on envoie juste la config
    });
  }

  return { nodes };
}

/**
 * Recevoir un signal sur un node
 * @param {Object} params - Paramètres du signal
 */
function handleSignal(params) {
  const { nodeId, inputId, state: signalState } = params;

  api.log.debug(`Signal received on ${nodeId}.${inputId}: ${signalState}`);

  // Traiter le signal comme une exécution
  const nodeState = state.conditionNodes.get(nodeId);
  if (nodeState) {
    // Le signal est traité, émettre le résultat
    sendNotification('emitSignal', {
      nodeId,
      outputId: 'output',
      state: nodeState.outputState,
    });
  }

  return { success: true };
}

/**
 * Changement d'état de condition notifié par le core
 * @param {Object} params - Paramètres du changement
 */
function handleConditionChange(params) {
  const { nodeId, conditionMet } = params;

  api.log.debug(`Condition change for ${nodeId}: ${conditionMet}`);

  // Mettre à jour notre état local si nécessaire
  const nodeState = state.conditionNodes.get(nodeId);
  if (nodeState) {
    nodeState.conditionMet = conditionMet;
    nodeState.lastEvaluation = Date.now();
  }

  return { success: true };
}

/**
 * Nettoyage avant arrêt
 */
function handleUnload() {
  api.log.info('Unloading Example Condition Node mod');

  // Nettoyer les timers
  for (const timerId of state.activeTimers.values()) {
    clearInterval(timerId);
  }
  state.activeTimers.clear();

  // Réinitialiser l'état
  state.conditionNodes.clear();
  state.isActive = false;

  return { success: true };
}

/**
 * Health check
 */
function handlePing() {
  return {
    pong: true,
    timestamp: Date.now(),
    activeNodes: state.conditionNodes.size,
  };
}

// ============================================================================
// IPC COMMUNICATION
// ============================================================================

/**
 * Envoyer une notification au loader (pas de réponse attendue)
 */
function sendNotification(method, params) {
  process.send({
    jsonrpc: '2.0',
    method,
    params,
  });
}

/**
 * Envoyer une réponse à une requête
 */
function sendResponse(id, result, error = null) {
  const response = {
    jsonrpc: '2.0',
    id,
  };

  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }

  process.send(response);
}

/**
 * Handler principal des messages IPC
 */
process.on('message', (message) => {
  const { id, method, params } = message;

  try {
    let result;

    switch (method) {
      case 'init':
        result = handleInit(params);
        break;
      case 'run':
        result = handleRun(params);
        break;
      case 'getConditionNodes':
        result = handleGetConditionNodes();
        break;
      case 'signal':
        result = handleSignal(params);
        break;
      case 'conditionChange':
        result = handleConditionChange(params);
        break;
      case 'unload':
        result = handleUnload();
        break;
      case 'ping':
        result = handlePing();
        break;
      default:
        sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` });
        return;
    }

    sendResponse(id, result);
  } catch (err) {
    sendResponse(id, null, { code: -32603, message: err.message });
  }
});

// Signaler que le runner est prêt
process.send({ jsonrpc: '2.0', method: 'ready', params: {} });
