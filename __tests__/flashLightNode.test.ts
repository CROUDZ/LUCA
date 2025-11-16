// Tests pour l'intégration avec react-native-torch

describe('FlashLightConditionNode - react-native-torch integration', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('calls react-native-torch.switchState when available', async () => {
    const torchSwitchMock = jest.fn();

  // Mock react-native to avoid permission checks on iOS
  jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));

  // Mock le module natif
    jest.doMock('react-native-torch', () => ({
      switchState: torchSwitchMock,
    }), { virtual: true });

    // Importer le module après avoir mocké pour éviter le cache
    const { setFlashlightState, getFlashlightState } = require(
      '../src/engine/nodes/FlashLightConditionNode'
    );

    // Appel
    await setFlashlightState(true);

    // Vérifier que la méthode native a été appelée
    expect(torchSwitchMock).toHaveBeenCalledWith(true);

    // Vérifier que l'état local est correctement mis à jour
    expect(getFlashlightState()).toBe(true);
  });
});

export {};
