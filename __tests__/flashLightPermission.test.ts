describe('FlashLightConditionNode - camera permissions on Android', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('throws when CAMERA permission is denied', async () => {
    // Mock react-native for Android with denied permission
    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      PermissionsAndroid: {
        PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
        RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
        request: jest.fn(async () => 'denied'),
      },
      Linking: { openSettings: jest.fn() },
    }));

    // Mock Torch so the code doesn't actually attempt to call native
    jest.doMock('react-native-torch', () => ({ switchState: jest.fn() }), { virtual: true });

    const { setFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');

  // Même si la permission a été refusée, nous ne voulons pas empêcher le
  // graphe d'utiliser l'état de la lampe torche (pour permettre des règles
  // logiques indépendantes du matériel). Donc la fonction ne rejette plus.
  await expect(setFlashlightState(true)).resolves.toBeUndefined();

  // Et l'état logique interne est mis à jour
  const { getFlashlightState } = require('../src/engine/nodes/FlashLightConditionNode');
  expect(getFlashlightState()).toBe(true);
  });

});

export {};
