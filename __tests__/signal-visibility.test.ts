/**
 * Test de visibilité des signaux
 * Vérifie que les signaux sont visibles lors de la propagation
 */

jest.resetModules();
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const { initializeSignalSystem, resetSignalSystem, getSignalSystem } = require('../app/src/engine/SignalSystem');
import type { Graph } from '../app/src/types';

describe('Signal Visibility', () => {
  let graph: Graph;
  let propagationEvents: any[] = [];

  beforeEach(async () => {
    propagationEvents = [];

    // Créer un graphe simple: Trigger (1) -> Condition (2) -> Action (3)
    graph = {
      nodes: new Map([
        [
          1,
          {
            id: 1,
            name: 'Trigger',
            type: 'input.trigger',
            data: { settings: { continuousMode: true } }, // Mode continu
            inputs: [],
            outputs: [2],
          },
        ],
        [
          2,
          {
            id: 2,
            name: 'Condition',
            type: 'test.condition',
            data: { settings: {} },
            inputs: [1],
            outputs: [3],
          },
        ],
        [
          3,
          {
            id: 3,
            name: 'Action',
            type: 'test.action',
            data: { settings: {} },
            inputs: [2],
            outputs: [],
          },
        ],
      ]),
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
    };

    // Initialiser le système
    const ss = initializeSignalSystem(graph);

    // S'abonner aux événements de propagation
    ss.subscribeToEvent('signal.propagated', 1, (data: any) => {
      propagationEvents.push(data);
      console.log('🔵 Signal propagated:', data);
    });

    // Enregistrer les handlers pour les nodes de test
    ss.registerHandler(2, async (signal: any) => {
      console.log('🟡 Condition received signal:', signal.state);
      // La condition propage toujours
      return {
        propagate: true,
        state: signal.state,
        data: signal.data,
      };
    });

    ss.registerHandler(3, async (signal: any) => {
      console.log('🟢 Action received signal:', signal.state);
      return {
        propagate: false, // Fin de la chaîne
        data: signal.data,
      };
    });
  });

  afterEach(() => {
    resetSignalSystem();
  });

  it('should show signal propagation from Trigger to Action', async () => {
    const ss = getSignalSystem();
    expect(ss).toBeDefined();
    if (!ss) return;

    console.log('\n📍 Starting test: activating node 1');

    // Activer le trigger (mode continu)
    await ss.activateNode(1);

    // Attendre la propagation
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log('\n📊 Propagation events:', propagationEvents.length);
    console.log('📊 Active nodes:', ss.getActiveNodes());

    // Vérifier que tous les nodes sont actifs
    expect(ss.isNodeActive(1)).toBe(true);
    expect(ss.isNodeActive(2)).toBe(true);
    expect(ss.isNodeActive(3)).toBe(true);

    // Vérifier que les signaux ont été propagés
    expect(propagationEvents.length).toBeGreaterThanOrEqual(2);
    
    // Vérifier les transitions
    const transitions = propagationEvents.map((e) => `${e.fromNodeId} → ${e.toNodeId} (${e.state})`);
    console.log('📈 Transitions:', transitions);

    expect(transitions).toContain('1 → 2 (ON)');
    expect(transitions).toContain('2 → 3 (ON)');

    console.log('\n📍 Deactivating node 1');

    // Désactiver le trigger
    await ss.deactivateNode(1);

    // Attendre la propagation
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log('📊 Active nodes after deactivation:', ss.getActiveNodes());

    // Vérifier que tous les nodes sont désactivés
    expect(ss.isNodeActive(1)).toBe(false);
    expect(ss.isNodeActive(2)).toBe(false);
    expect(ss.isNodeActive(3)).toBe(false);
  });
});
