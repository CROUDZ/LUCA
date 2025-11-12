/**
 * Tests du système de signaux
 */

import { initializeSignalSystem, resetSignalSystem } from '../src/engine/SignalSystem';
import { setFlashlightState } from '../src/engine/nodes/FlashLightNode';
import { triggerNode } from '../src/engine/nodes/TriggerNode';
import { getPingCount, resetPingCount } from '../src/engine/nodes/PingNode';
import type { Graph } from '../src/types';

describe('Signal System', () => {
  let graph: Graph;

  beforeEach(() => {
    // Créer un graphe de test simple
    // Trigger (1) -> FlashLight (2) -> Ping (3)
    graph = {
      nodes: new Map([
        [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
        [2, { id: 2, name: 'FlashLight', type: 'condition.flashlight', data: {}, inputs: [1], outputs: [3] }],
        [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
      ]),
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
    };

    // Initialiser le système
    initializeSignalSystem(graph);
    resetPingCount();
  });

  afterEach(() => {
    resetSignalSystem();
  });

  it('should propagate signal when flashlight is on', async () => {
    // Activer la lampe torche
    setFlashlightState(true);

    // Déclencher le signal
    triggerNode(1, { test: 'data' });

    // Attendre la propagation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Vérifier que le ping a été exécuté
    expect(getPingCount()).toBe(1);
  });

  it('should block signal when flashlight is off', async () => {
    // Désactiver la lampe torche
    setFlashlightState(false);

    // Déclencher le signal
    triggerNode(1, { test: 'data' });

    // Attendre
    await new Promise(resolve => setTimeout(resolve, 100));

    // Vérifier que le ping n'a PAS été exécuté
    expect(getPingCount()).toBe(0);
  });

  it('should handle multiple signals', async () => {
    setFlashlightState(true);

    // Déclencher plusieurs signaux
    triggerNode(1);
    triggerNode(1);
    triggerNode(1);

    // Attendre
    await new Promise(resolve => setTimeout(resolve, 200));

    // Vérifier le compteur
    expect(getPingCount()).toBe(3);
  });
});
