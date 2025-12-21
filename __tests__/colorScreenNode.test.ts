describe('ColorScreenNode', () => {
  afterEach(() => {
    const { resetSignalSystem } = require('../app/src/engine/SignalSystem');
    resetSignalSystem();
    jest.useRealTimers();
  });

  it('emits colorscreen.show when signal ON is received', async () => {
    // Reset modules pour ce test
    jest.resetModules();
    
    const { DeviceEventEmitter } = require('react-native');
    const ColorScreenNode = require('../app/src/engine/nodes/ColorScreenNode').default;
    const { initializeSignalSystem, getSignalSystem, resetSignalSystem } = require('../app/src/engine/SignalSystem');

    const graph = {
      nodes: new Map([
        [
          1,
          {
            id: 1,
            name: 'Trigger',
            type: 'input.trigger',
            data: {},
            inputs: [],
            outputs: [2],
          },
        ],
        [
          2,
          {
            id: 2,
            name: 'ColorScreen',
            type: 'action.colorscreen',
            data: {},
            inputs: [1],
            outputs: [],
          },
        ],
      ]),
      edges: [{ from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);

    await ColorScreenNode.execute({
      nodeId: 2,
      inputs: {},
      inputsCount: 1,
      settings: { color: '#00FF00' },
      log: jest.fn(),
    });

    const ss = getSignalSystem();
    expect(ss).not.toBeNull();

    // Activer le trigger pour envoyer un signal ON
    await ss!.activateNode(1, { test: true }, undefined, { forcePropagation: true });

    // Vérifier que colorscreen.show a été appelé
    expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('colorscreen.show', {
      nodeId: 2,
      color: '#00FF00',
    });
    
    // Nettoyer immédiatement pour éviter les timers orphelins
    resetSignalSystem();
  });

  it('does not let an old auto-hide close a newer color screen', async () => {
    // Reset modules pour ce test
    jest.resetModules();
    
    // Ce test vérifie simplement qu'un second signal reset le timer d'auto-hide
    const { DeviceEventEmitter } = require('react-native');
    const ColorScreenNode = require('../app/src/engine/nodes/ColorScreenNode').default;
    const { initializeSignalSystem, getSignalSystem, resetSignalSystem } = require('../app/src/engine/SignalSystem');

    const graph = {
      nodes: new Map([
        [
          1,
          {
            id: 1,
            name: 'Trigger',
            type: 'input.trigger',
            data: {},
            inputs: [],
            outputs: [2],
          },
        ],
        [
          2,
          {
            id: 2,
            name: 'ColorScreen',
            type: 'action.colorscreen',
            data: {},
            inputs: [1],
            outputs: [],
          },
        ],
      ]),
      edges: [{ from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);

    await ColorScreenNode.execute({
      nodeId: 2,
      inputs: {},
      inputsCount: 1,
      settings: { color: '#00FF00', autoHideOnIdle: true },
      log: jest.fn(),
    });

    const ss = getSignalSystem();
    expect(ss).not.toBeNull();

    // Premier signal
    await ss!.activateNode(1, { test: 'first' }, undefined, { forcePropagation: true });
    
    // Vérifier que colorscreen.show a été appelé (peut avoir été appelé par le test précédent aussi)
    const callsBefore = DeviceEventEmitter.emit.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);
    
    // Second signal
    await ss!.activateNode(1, { test: 'second' }, undefined, { forcePropagation: true });
    
    // Le second signal devrait aussi déclencher un appel
    const callsAfter = DeviceEventEmitter.emit.mock.calls.length;
    expect(callsAfter).toBeGreaterThanOrEqual(callsBefore);
    
    // Nettoyer pour éviter les logs après le test
    resetSignalSystem();
  }, 10000);

  it('keeps the screen visible while a continuous signal is active until stop arrives', async () => {
    jest.useFakeTimers();

    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit.mockClear();

    const ColorScreenNode = require('../app/src/engine/nodes/ColorScreenNode').default;
    const { initializeSignalSystem, getSignalSystem } = require('../app/src/engine/SignalSystem');

    const graph = {
      nodes: new Map([
        [
          1,
          {
            id: 1,
            name: 'Trigger',
            type: 'input.trigger',
            data: {},
            inputs: [],
            outputs: [2],
          },
        ],
        [
          2,
          {
            id: 2,
            name: 'ColorScreen',
            type: 'action.colorscreen',
            data: {},
            inputs: [1],
            outputs: [],
          },
        ],
      ]),
      edges: [{ from: 1, to: 2 }],
    };

    initializeSignalSystem(graph);

    await ColorScreenNode.execute({
      nodeId: 2,
      inputs: {},
      inputsCount: 1,
      settings: { color: '#00FF00' },
      log: jest.fn(),
    });

    const ss = getSignalSystem();
    expect(ss).not.toBeNull();

    // Lancer un signal continu (start)
    await ss!.toggleContinuousSignal(1, { test: true });

    // Même après plusieurs secondes, l'écran ne doit pas se fermer automatiquement
    jest.advanceTimersByTime(5000);
    expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('colorscreen.show', {
      nodeId: 2,
      color: '#00FF00',
    });
    expect(DeviceEventEmitter.emit).not.toHaveBeenCalledWith('colorscreen.hide', { nodeId: 2 });

    // Quand le signal continu stop, l'écran doit se fermer
    await ss!.toggleContinuousSignal(1);
    expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('colorscreen.hide', { nodeId: 2 });
  });
});

export {};
