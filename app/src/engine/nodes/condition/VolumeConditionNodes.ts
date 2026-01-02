/**
 * VolumeConditionNodes
 * Nodes conditionnels qui propagent le signal si les boutons volume sont appuyés.
 *
 * Utilise le ConditionHandler centralisé pour la gestion des modes (continu, timer, switch).
 */

import { registerConditionNode, getConditionState } from '../ConditionHandler';
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
  color: string;
  icon: string;
}) {
  const { id, name, description, direction, color, icon } = options;

  return registerConditionNode({
    id,
    name,
    description,
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

          const conditionState = getConditionState(nodeId);
          if (!conditionState?.hasActiveSignal) return;

          const pressed = event.action === 'press';
          const condition = settings.invertSignal ? !pressed : pressed;

          console.log(
            `[VolumeConditionNode] Node ${nodeId} volume ${direction}: action=${event.action}, condition=${condition}`
          );

          if (event.action === 'press' && condition) {
            onConditionChange(true);
          } else if (event.action === 'release') {
            onConditionChange(false);
          }
        });
      },
    },

    // Description dynamique
    getDescription: (settings) => {
      const invert = settings?.invertSignal ?? false;
      return `Propage si bouton ${name} ${invert ? 'relâché' : 'appuyé'}`;
    },

    // HTML personnalisé
    customBodyHTML: (settings) => {
      const invert = settings?.invertSignal ?? false;
      return `
        <div class="condition-status">
          <span class="status-text">Propage si ${name} ${invert ? 'relâché' : 'appuyé'}</span>
        </div>
      `;
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
  color: '#4CAF50',
  icon: 'volume-up',
});

const VolumeDownConditionNode = createVolumeConditionNode({
  id: 'condition.volume.down',
  name: 'Volume -',
  description: 'Propage si le bouton volume - est appuyé',
  direction: 'down',
  color: '#03A9F4',
  icon: 'volume-down',
});

export { VolumeUpConditionNode, VolumeDownConditionNode };
