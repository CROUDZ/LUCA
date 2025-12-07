/**
 * Example Mod: Counter & Timer Nodes
 * LUCA Modding System - API Version 1.0.0
 * 
 * This mod demonstrates:
 * - nodeInit() lifecycle hook
 * - run() execution handler
 * - onUnload() cleanup
 * - Storage API usage
 * - Logging API usage
 * - Signal emission
 * 
 * @module example-counter-node
 */

// État interne du mod (persiste entre les appels run())
const state = {
  counters: new Map(),
  timers: new Map(),
  initialized: false
};

/**
 * Initialisation du mod - appelé une fois au chargement
 * @param {import('../core/types').ModRuntimeAPI} api - API runtime fournie par LUCA
 */
export async function nodeInit(api) {
  api.log.info('Counter Node mod initializing...', { version: api.mod.version });
  
  // Restaurer l'état depuis le storage si disponible
  try {
    const savedCounters = await api.storage.get('counters');
    if (savedCounters && typeof savedCounters === 'object') {
      Object.entries(savedCounters).forEach(([key, value]) => {
        state.counters.set(key, value);
      });
      api.log.info(`Restored ${state.counters.size} counters from storage`);
    }
  } catch (err) {
    api.log.warn('Could not restore counters from storage', { error: err.message });
  }
  
  state.initialized = true;
  api.log.info('Counter Node mod initialized successfully');
  
  return { success: true };
}

/**
 * Exécution d'un node - appelé à chaque trigger
 * @param {object} params - Paramètres d'exécution
 * @param {string} params.nodeId - ID unique du node
 * @param {string} params.nodeType - Type de node (counter, timer, etc.)
 * @param {object} params.inputs - Valeurs des ports d'entrée
 * @param {object} params.config - Configuration du node
 * @param {import('../core/types').ModRuntimeAPI} api - API runtime
 */
export async function run({ nodeId, nodeType, inputs, config }, api) {
  api.log.debug(`Running node ${nodeType}:${nodeId}`, { inputs, config });
  
  switch (nodeType) {
    case 'counter':
      return await runCounter(nodeId, inputs, config, api);
    case 'timer':
      return await runTimer(nodeId, inputs, config, api);
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}

/**
 * Logique du node Counter
 */
async function runCounter(nodeId, inputs, config, api) {
  const { trigger, reset, step = 1 } = inputs;
  const { initialValue = 0, maxValue = null, wrapAround = false } = config;
  
  // Initialiser le compteur si nécessaire
  if (!state.counters.has(nodeId)) {
    state.counters.set(nodeId, initialValue);
  }
  
  let count = state.counters.get(nodeId);
  
  // Gérer le reset
  if (reset) {
    count = initialValue;
    api.log.info(`Counter ${nodeId} reset to ${count}`);
  }
  
  // Incrémenter sur trigger
  if (trigger) {
    count += step;
    
    // Gérer la valeur max
    if (maxValue !== null && count > maxValue) {
      if (wrapAround) {
        count = initialValue;
        api.log.debug(`Counter ${nodeId} wrapped around`);
      } else {
        count = maxValue;
        api.log.debug(`Counter ${nodeId} capped at max`);
      }
    }
    
    // Persister l'état
    state.counters.set(nodeId, count);
    
    // Sauvegarder en storage (async, non-bloquant)
    saveCountersToStorage(api).catch(err => {
      api.log.warn('Failed to save counter state', { error: err.message });
    });
    
    // Émettre le signal onIncrement
    api.emit('onIncrement', { nodeId, count, step });
  }
  
  return {
    outputs: {
      count
    }
  };
}

/**
 * Logique du node Timer
 */
async function runTimer(nodeId, inputs, config, api) {
  const { start, stop, interval = 1000 } = inputs;
  const { autoStart = false, repeatCount = -1 } = config;
  
  // Initialiser l'état du timer
  if (!state.timers.has(nodeId)) {
    state.timers.set(nodeId, {
      running: autoStart,
      startTime: autoStart ? Date.now() : null,
      tickCount: 0,
      lastTick: null
    });
  }
  
  const timer = state.timers.get(nodeId);
  
  // Gérer start/stop
  if (start && !timer.running) {
    timer.running = true;
    timer.startTime = Date.now();
    timer.tickCount = 0;
    api.log.info(`Timer ${nodeId} started`);
  }
  
  if (stop && timer.running) {
    timer.running = false;
    api.log.info(`Timer ${nodeId} stopped`);
  }
  
  // Calculer l'elapsed time
  const elapsed = timer.running && timer.startTime 
    ? Date.now() - timer.startTime 
    : 0;
  
  // Vérifier si on doit émettre un tick
  let shouldTick = false;
  if (timer.running) {
    const expectedTicks = Math.floor(elapsed / interval);
    if (expectedTicks > timer.tickCount) {
      // Vérifier repeatCount
      if (repeatCount < 0 || timer.tickCount < repeatCount) {
        shouldTick = true;
        timer.tickCount = expectedTicks;
        timer.lastTick = Date.now();
        
        // Émettre le signal tick
        api.emit('tick', { nodeId, tickCount: timer.tickCount, elapsed });
      } else {
        // Arrêter le timer si repeatCount atteint
        timer.running = false;
        api.log.info(`Timer ${nodeId} completed ${repeatCount} ticks`);
      }
    }
  }
  
  return {
    outputs: {
      tick: shouldTick,
      elapsed
    }
  };
}

/**
 * Sauvegarde asynchrone des compteurs
 */
async function saveCountersToStorage(api) {
  const countersObj = Object.fromEntries(state.counters);
  await api.storage.set('counters', countersObj);
}

/**
 * Nettoyage - appelé avant le déchargement du mod
 * @param {import('../core/types').ModRuntimeAPI} api
 */
export async function onUnload(api) {
  api.log.info('Counter Node mod unloading...');
  
  // Sauvegarder l'état final
  try {
    await saveCountersToStorage(api);
    api.log.info('Final state saved successfully');
  } catch (err) {
    api.log.error('Failed to save final state', { error: err.message });
  }
  
  // Nettoyer les timers
  state.timers.forEach((timer, nodeId) => {
    if (timer.running) {
      api.log.debug(`Stopping timer ${nodeId}`);
    }
  });
  
  // Reset de l'état
  state.counters.clear();
  state.timers.clear();
  state.initialized = false;
  
  api.log.info('Counter Node mod unloaded');
  return { success: true };
}

/**
 * Optionnel: Point d'entrée pour les tests
 */
export const __test__ = {
  getState: () => ({ ...state }),
  resetState: () => {
    state.counters.clear();
    state.timers.clear();
    state.initialized = false;
  }
};
