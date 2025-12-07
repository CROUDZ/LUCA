/**
 * Tests du système de signaux
 */

// Mocker 'react-native' pour Jest (Alert utilisé par PingNode)
jest.resetModules();
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const { initializeSignalSystem, resetSignalSystem } = require('../src/engine/SignalSystem');
const { setFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');
const { triggerNode } = require('../src/engine/nodes/TriggerNode');
const { getPingCount, resetPingCount } = require('../src/engine/nodes/PingNode');
import type { Graph } from '../app/src/types';

describe('Signal System', () => {
  let graph: Graph;

  beforeEach(async () => {
    // Créer un graphe de test simple
    // Trigger (1) -> FlashLight (2) -> Ping (3)
    graph = {
      nodes: new Map([
        [1, { id: 1, name: 'Trigger', type: 'input.trigger', data: {}, inputs: [], outputs: [2] }],
        [
          2,
          {
            id: 2,
            name: 'FlashLight',
            type: 'condition.flashlight',
            // Par défaut on ne veut pas que le toggle de la lampe émette
            // automatiquement un signal dans ce test (cela causerait
            // des pings supplémentaires). On teste ici la chaîne
            // Trigger -> FlashLight -> Ping uniquement.
            data: { autoEmitOnChange: false },
            inputs: [1],
            outputs: [3],
          },
        ],
        [3, { id: 3, name: 'Ping', type: 'action.ping', data: {}, inputs: [2], outputs: [] }],
      ]),
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
    };

    // Initialiser le système
    initializeSignalSystem(graph);

    // Charger toutes les nodes et exécuter le graphe pour que les handlers
    // des nodes (ex: FlashLight, Ping) s'enregistrent dans le SignalSystem.
    const { loadAllNodes } = require('../src/engine/NodeRegistry');
    loadAllNodes();

    const { executeGraph } = require('../src/engine/engine');
    // Exécuter le graphe afin d'enregistrer les handlers des nodes
    // (les nodes font des registerHandler dans leur exécution)
    // Nous ignorons le résultat d'évaluation dans ces tests
    await executeGraph(graph);
    resetPingCount();
  });

  afterEach(() => {
    resetSignalSystem();
  });

  it('should propagate signal when flashlight is on', async () => {
    // Activer la lampe torche
    await setFlashlightState(true);

    // Déclencher le signal
    triggerNode(1, { test: 'data' });

    // Attendre la propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Vérifier que le ping a été exécuté
    expect(getPingCount()).toBe(1);
  });

  it('should block signal when flashlight is off', async () => {
    // Désactiver la lampe torche
    await setFlashlightState(false);

    // Déclencher le signal
    triggerNode(1, { test: 'data' });

    // Attendre
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Vérifier que le ping n'a PAS été exécuté
    expect(getPingCount()).toBe(0);
  });

  it('should handle multiple signals', async () => {
    await setFlashlightState(true);

    // Déclencher plusieurs signaux
    triggerNode(1);
    triggerNode(1);
    triggerNode(1);

    // Attendre
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Vérifier le compteur
    expect(getPingCount()).toBe(3);
  });
});

export {};
