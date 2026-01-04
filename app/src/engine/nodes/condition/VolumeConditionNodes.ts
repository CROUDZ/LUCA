/**
 * VolumeConditionNodes
 * Nodes conditionnels qui propagent le signal si les boutons volume sont appuyés.
 *
 * Utilise le ConditionHandler centralisé pour la gestion des modes (continu, timer, switch).
 */

import { registerConditionNode } from '../ConditionHandler';
import {
  getLastVolumeButtonEvent,
  isVolumeButtonPressed,
  subscribeToVolumeButtons,
  type VolumeDirection,
  type VolumeButtonEvent,
} from '../../../utils/volumeController';

// ============================================================================
// FACTORY POUR CRÉER UNE CONDITION VOLUME
// ============================================================================

function createVolumeConditionNode(options: {
  id: string;
  name: string;
  description: string;
  direction: VolumeDirection;
  color?: string;
  icon: string;
}) {
  const { id, name, description, direction, color, icon } = options;

  return registerConditionNode({
    id,
    name,
    description,
    doc: `excerpt: Détecte quand vous appuyez sur les boutons de volume.
---
Ce bloc vérifie si vous appuyez sur le bouton de volume (augmenter ou diminuer). Quand il détecte l'appui, il déclenche le signal pour continuer votre flux.

**Comment l'utiliser :**
1. Choisissez si vous voulez détecter le bouton volume + ou volume -
2. Le bloc attend que vous appuyiez sur ce bouton
3. Quand vous l'appuyez, il déclenche la suite de votre flux
4. Parfait pour créer des raccourcis avec les boutons physiques du téléphone !`,
    color,
    icon,

    // État de la condition
    checkCondition: () => isVolumeButtonPressed(direction),
    getSignalData: () => ({
      volumeButton: direction,
      volumePressed: isVolumeButtonPressed(direction),
      lastVolumeEvent: getLastVolumeButtonEvent(direction),
    }),
    waitingForLabel: `volume_${direction}`,

    // Abonnement externe aux événements volume (ne passe pas par SignalSystem)
    externalSubscription: {
      subscribe: (nodeId, settings, onConditionChange) => {
        return subscribeToVolumeButtons((event: VolumeButtonEvent) => {
          if (event.direction !== direction) return;

          const pressed = event.action === 'press';
          const condition = settings.invertSignal ? !pressed : pressed;

          console.log(
            `[VolumeConditionNode] Node ${nodeId} volume ${direction}: action=${event.action}, condition=${condition}`
          );

          onConditionChange(condition);
        });
      },
    },

  });
}

// ============================================================================
// DÉFINITIONS DES NODES
// ============================================================================

const VolumeUpConditionNode = createVolumeConditionNode({
  id: 'condition.volume.up',
  name: 'Volume +',
  description: 'Propage si le bouton volume + est appuyé',
  direction: 'up',
  icon: 'volume-up',
});

const VolumeDownConditionNode = createVolumeConditionNode({
  id: 'condition.volume.down',
  name: 'Volume -',
  description: 'Propage si le bouton volume - est appuyé',
  direction: 'down',
  icon: 'volume-down',
});

export { VolumeUpConditionNode, VolumeDownConditionNode };
