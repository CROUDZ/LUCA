/**
 * Test du setup Trigger -> Condition -> Action
 * Ce test vérifie que le signal se propage correctement à travers une condition
 */

jest.resetModules();
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const { initializeSignalSystem, resetSignalSystem, getSignalSystem } = require('../app/src/engine/SignalSystem');
const { triggerNode } = require('../app/src/engine/nodes/TriggerNode');
const { getPingCount, resetPingCount } = require('../app/src/engine/nodes/PingNode');
import type { Graph } from '../app/src/types';

// Mock du volume controller pour simuler le bouton volume appuyé
jest.mock('../app/src/utils/volumeController', () => ({
  isVolumeButtonPressed: jest.fn((direction: string) => direction === 'up'),
  getLastVolumeButtonEvent: jest.fn(() => ({
    direction: 'up',
    action: 'keydown',
    pressed: true,
    timestamp: Date.now(),
  })),
  ensureVolumeMonitoring: jest.fn(),
  subscribeToVolumeButtons: jest.fn(() => jest.fn()),
}));

describe('Trigger -> Condition -> Action Flow', () => {
  let graph: Graph;

  beforeEach(async () => {
    // Créer un graphe de test: Trigger (1) -> Volume+ Condition (2) -> Ping (3)
    graph = {
      nodes: new Map([
        [
          1,
          {
            id: 1,
            name: 'Trigger',
            type: 'input.trigger',
            data: { settings: { continuousMode: false } },
            inputs: [],
            outputs: [2],
          },
        ],
        [
          2,
          {
            id: 2,
            name: 'Volume+ Condition',
            type: 'condition.volume.up',
            data: { settings: { invertSignal: false } },
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

    // Charger toutes les nodes et exécuter le graphe
    const { loadAllNodes } = require('../app/src/engine/NodeRegistry');
    loadAllNodes();

    const { executeGraph } = require('../app/src/engine/engine');
    await executeGraph(graph);
    resetPingCount();
  });

  afterEach(() => {
    resetSignalSystem();
  });

  it('should propagate signal from Trigger through VolumeCondition to Ping when volume button is pressed', async () => {
    const ss = getSignalSystem();
    expect(ss).toBeDefined();
    if (!ss) return;

    // Le bouton volume+ est "appuyé" (via le mock)
    const volumeController = require('../app/src/utils/volumeController');
    volumeController.isVolumeButtonPressed.mockReturnValue(true);

    // Déclencher le trigger (node ID = 1)
    triggerNode(1);

    // Attendre un peu pour la propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Vérifier que le ping a été déclenché
    const pings = getPingCount();
    expect(pings).toBeGreaterThan(0);

    console.log('Pings received:', pings);
  });

  it('should block signal when volume button is NOT pressed', async () => {
    const ss = getSignalSystem();
    expect(ss).toBeDefined();
    if (!ss) return;

    // Mock pour que le bouton ne soit PAS appuyé
    const volumeController = require('../app/src/utils/volumeController');
    volumeController.isVolumeButtonPressed.mockReturnValue(false);

    resetPingCount();

    // Déclencher le trigger (node ID = 1)
    triggerNode(1);

    // Attendre un peu pour la propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Vérifier qu'AUCUN ping n'a été déclenché (condition bloque)
    const pings = getPingCount();
    expect(pings).toBe(0);

    console.log('Pings received (should be 0):', pings);
  });
});
