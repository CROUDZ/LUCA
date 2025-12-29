/**
 * ColorScreenOverlay - Composant d'affichage plein écran d'une couleur
 *
 * Ce composant affiche une couleur en plein écran, masquant complètement
 * l'interface utilisateur incluant les barres natives (header/footer).
 *
 * Utilise le mode immersif natif pour masquer complètement les barres système.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  StatusBar,
  DeviceEventEmitter,
  BackHandler,
  NativeModules,
  Platform,
} from 'react-native';
import { getSignalSystem } from '../engine/SignalSystem';

const { ImmersiveModeModule } = NativeModules;

interface ColorScreenData {
  nodeId: number;
  color: string;
}

export default function ColorScreenOverlay() {
  const [visible, setVisible] = useState(false);
  const [color, setColor] = useState('#FF0000');
  const visibleRef = useRef(false);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // Gestion du mode immersif (masquer status bar et navigation bar)
  useEffect(() => {
    if (Platform.OS === 'android' && ImmersiveModeModule) {
      if (visible) {
        // Activer le mode immersif quand l'écran s'affiche
        ImmersiveModeModule.enableImmersiveMode()
          .then((r: boolean) => {
            if (r) console.log('[ColorScreenOverlay] Mode immersif activé');
            else console.warn('[ColorScreenOverlay] Mode immersif non disponible');
          })
          .catch((e: Error) => console.warn('[ColorScreenOverlay] Erreur mode immersif:', e));
      } else {
        // Désactiver le mode immersif quand l'écran se ferme
        ImmersiveModeModule.disableImmersiveMode()
          .then((r: boolean) => {
            if (r) console.log('[ColorScreenOverlay] Mode immersif désactivé');
            else console.warn('[ColorScreenOverlay] Mode immersif non disponible');
          })
          .catch((e: Error) => console.warn('[ColorScreenOverlay] Erreur mode immersif:', e));
      }
    }
  }, [visible]);

  // Gestion de l'affichage de l'écran
  const handleShow = useCallback((data: ColorScreenData) => {
    console.log(`[ColorScreenOverlay] Affichage couleur: ${data.color}`);
    setColor(data.color);
    setVisible(true);
  }, []);

  // Gestion de la fermeture de l'écran
  const handleHide = useCallback((data: { nodeId: number }) => {
    console.log(`[ColorScreenOverlay] Fermeture écran (node ${data.nodeId})`);
    setVisible(false);
  }, []);

  useEffect(() => {
    // 1) Écoute via DeviceEventEmitter (fallback / compat)
    const showListener = DeviceEventEmitter.addListener('colorscreen.show', handleShow);
    const hideListener = DeviceEventEmitter.addListener('colorscreen.hide', handleHide);

    // 2) Écoute via SignalSystem (fiable côté JS)
    let ssUnsubShow: null | (() => void) = null;
    let ssUnsubHide: null | (() => void) = null;
    let lastSs: any = null;

    const subscribeToSignalSystem = () => {
      const ss = getSignalSystem();
      if (!ss || ss === lastSs) return;

      // Cleanup ancien
      try {
        ssUnsubShow?.();
      } catch {
        // ignore
      }
      try {
        ssUnsubHide?.();
      } catch {
        // ignore
      }

      lastSs = ss;
      try {
        ssUnsubShow = ss.subscribeToEvent('colorscreen.show', 0, handleShow);
        ssUnsubHide = ss.subscribeToEvent('colorscreen.hide', 0, handleHide);
        console.log('[ColorScreenOverlay] Subscribed to SignalSystem events');
      } catch (e) {
        console.warn('[ColorScreenOverlay] Failed to subscribe to SignalSystem', e);
      }
    };

    // Tentative initiale
    subscribeToSignalSystem();

    // Si le graphe est reconstruit, la singleton du SignalSystem change
    const ssInitListener = DeviceEventEmitter.addListener('signalsystem.initialized', () => {
      subscribeToSignalSystem();
    });

    // Empêcher le bouton retour de fermer l'écran pendant l'affichage
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visibleRef.current) return true;
      return false;
    });

    return () => {
      try {
        showListener.remove();
      } catch {
        // ignore
      }
      try {
        hideListener.remove();
      } catch {
        // ignore
      }
      try {
        ssInitListener.remove();
      } catch {
        // ignore
      }
      try {
        backHandler.remove();
      } catch {
        // ignore
      }
      try {
        ssUnsubShow?.();
      } catch {
        // ignore
      }
      try {
        ssUnsubHide?.();
      } catch {
        // ignore
      }
    };
  }, [handleShow, handleHide]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      // @ts-ignore - navigationBarTranslucent est disponible sur Android
      navigationBarTranslucent
      onRequestClose={() => {
        // Ne rien faire - l'écran ne peut être fermé que par le système
      }}
    >
      <StatusBar hidden={true} translucent backgroundColor="transparent" />
      <View style={[styles.container, { backgroundColor: color }]} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
