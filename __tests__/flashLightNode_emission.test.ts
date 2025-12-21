import {
  initializeSignalSystem,
  resetSignalSystem,
  getSignalSystem,
} from '../app/src/engine/SignalSystem';
import FlashLightConditionNode, {
  setFlashlightState,
  clearFlashlightAutoEmitRegistry,
  syncFlashlightFromNative,
} from '../app/src/engine/nodes/FlashLightConditionNode';
import type { Graph } from '../app/src/types';

jest.mock('react-native', () => ({
  NativeModules: {},
}));

jest.mock('../src/utils/permissions', () => ({
  __esModule: true,
  default: {
    ensureCameraPermission: jest.fn().mockResolvedValue(true),
    hasCameraPermission: jest.fn().mockResolvedValue(true),
  },
}));

describe('FlashLightConditionNode auto-émission', () => {
  afterEach(() => {
    resetSignalSystem();
    clearFlashlightAutoEmitRegistry();
    // reset internal module state so tests are deterministic
    const { resetFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');
    resetFlashlightState();
    jest.clearAllMocks();
  });

  it("propage un signal lorsque la condition devient vraie (signal ON actif)", async () => {
    // Graphe: Trigger (0) -> FlashLight (1) -> Receiver (2)
    const graph: Graph = {
      nodes: new Map([
        [
          0,
          {
            id: 0,
            name: 'Trigger',
            type: 'input.trigger',
            data: { type: 'input.trigger', settings: {} },
            inputs: [],
            outputs: [1],
          },
        ],
        [
          1,
          {
            id: 1,
            name: 'FlashLight',
            type: 'condition.flashlight',
            data: { type: 'condition.flashlight', settings: { invertSignal: false } },
            inputs: [0],
            outputs: [2],
          },
        ],
        [
          2,
          {
            id: 2,
            name: 'Receiver',
            type: 'test.receiver',
            data: { type: 'test.receiver' },
            inputs: [1],
            outputs: [],
          },
        ],
      ]),
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);
    const ss = getSignalSystem();
    if (!ss) throw new Error('SignalSystem not initialized');

    const receiverHandler = jest.fn().mockResolvedValue({ propagate: false });
    ss.registerHandler(2, receiverHandler);

    await FlashLightConditionNode.execute({
      nodeId: 1,
      inputs: {},
      inputsCount: 1,
      settings: { invertSignal: false },
      log: jest.fn(),
    });

    // D'abord, activer le trigger avec un signal ON
    // La condition est false (lampe éteinte), donc le signal est bloqué par la FlashLightCondition
    await ss.activateNode(0, {}, undefined, { forcePropagation: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // La condition est false, le receiver ne doit pas être appelé
    expect(receiverHandler).not.toHaveBeenCalled();
    
    // Maintenant, allumer la lampe - la condition devient vraie
    // et le signal doit se propager car la node a un signal ON en entrée
    await setFlashlightState(true, true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // La condition est maintenant vraie, le signal doit propager
    expect(receiverHandler).toHaveBeenCalled();
  });

  it("propage un signal lorsqu'un changement natif est détecté (avec signal ON actif)", async () => {
    // Graphe: Trigger (0) -> FlashLight (1) -> Receiver (2)
    const graph: Graph = {
      nodes: new Map([
        [
          0,
          {
            id: 0,
            name: 'Trigger',
            type: 'input.trigger',
            data: { type: 'input.trigger', settings: {} },
            inputs: [],
            outputs: [1],
          },
        ],
        [
          1,
          {
            id: 1,
            name: 'FlashLight',
            type: 'condition.flashlight',
            data: { type: 'condition.flashlight', settings: { invertSignal: false } },
            inputs: [0],
            outputs: [2],
          },
        ],
        [
          2,
          {
            id: 2,
            name: 'Receiver',
            type: 'test.receiver',
            data: { type: 'test.receiver' },
            inputs: [1],
            outputs: [],
          },
        ],
      ]),
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);
    const ss = getSignalSystem();
    if (!ss) throw new Error('SignalSystem not initialized');

    const receiverHandler = jest.fn().mockResolvedValue({ propagate: false });
    ss.registerHandler(2, receiverHandler);

    await FlashLightConditionNode.execute({
      nodeId: 1,
      inputs: {},
      inputsCount: 1,
      settings: { invertSignal: false },
      log: jest.fn(),
    });

    // D'abord, activer le trigger avec un signal ON
    await ss.activateNode(0, {}, undefined, { forcePropagation: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // Simuler un changement natif de la lampe (allumée)
    await syncFlashlightFromNative(true);
    // Attendre plus longtemps car la propagation est asynchrone
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(receiverHandler).toHaveBeenCalled();
  });
});
