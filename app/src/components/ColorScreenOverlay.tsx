/**
 * ColorScreenOverlay - Composant d'affichage plein écran d'une couleur
 *
 * Ce composant affiche une couleur en plein écran, masquant complètement
 * l'interface utilisateur incluant les barres natives (header/footer).
 *
 * Utilise StatusBar pour masquer les éléments système et occupe tout l'écran.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  StatusBar,
  DeviceEventEmitter,
  BackHandler,
} from 'react-native';
import { logger } from '../utils/logger';
import { getSignalSystem } from '../engine/SignalSystem';

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

  // Gestion de l'affichage de l'écran
  const handleShow = useCallback((data: ColorScreenData) => {
    logger.info(`[ColorScreenOverlay] Affichage couleur: ${data.color}`);
    setColor(data.color);
    setVisible(true);
  }, []);

  // Gestion de la fermeture de l'écran
  const handleHide = useCallback((data: { nodeId: number }) => {
    logger.info(`[ColorScreenOverlay] Fermeture écran (node ${data.nodeId})`);
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
        logger.info('[ColorScreenOverlay] Subscribed to SignalSystem events');
      } catch (e) {
        logger.warn('[ColorScreenOverlay] Failed to subscribe to SignalSystem', e);
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
      onRequestClose={() => {
        // Ne rien faire - l'écran ne peut être fermé que par le système
      }}
    >
      <StatusBar hidden={true} />
      <View style={[styles.container, { backgroundColor: color }]} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
