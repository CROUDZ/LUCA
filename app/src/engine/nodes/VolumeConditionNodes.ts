import { registerNode } from '../NodeRegistry';
import type {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeMeta,
} from '../../types/node.types';
import { getSignalSystem, type Signal, type SignalPropagation } from '../SignalSystem';
import { logger } from '../../utils/logger';
import { buildNodeCardHTML } from './templates/nodeCard';
import {
  getLastVolumeButtonEvent,
  isVolumeButtonPressed,
  subscribeToVolumeButtons,
  type VolumeDirection,
  type VolumeButtonEvent,
} from '../../utils/volumeController';

// Stockage des états des nodes pour le mode continu
const nodeStates = new Map<number, {
  hasActiveSignal: boolean;
  lastSignalData: any;
  unsubscribeVolume: (() => void) | null;
  isOutputActive: boolean;  // État actuel de la sortie (mode switch)
  timerHandle: ReturnType<typeof setTimeout> | null;  // Timer pour le mode timer
}>();

function createExecute(direction: VolumeDirection): NodeDefinition['execute'] {
  return async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
    const ss = getSignalSystem();
    if (!ss) {
      return { success: false, error: 'Signal system not initialized', outputs: {} };
    }

    const invert = context.settings?.invertSignal ?? false;
    const switchMode = context.settings?.switchMode ?? false;
    const timerDuration = context.settings?.timerDuration ?? 0; // 0 = pas de timer (continu)
    const nodeId = context.nodeId;

    // Initialiser l'état de la node
    if (!nodeStates.has(nodeId)) {
      nodeStates.set(nodeId, {
        hasActiveSignal: false,
        lastSignalData: null,
        unsubscribeVolume: null,
        isOutputActive: false,
        timerHandle: null,
      });
    }

    const state = nodeStates.get(nodeId)!;

    // Fonction pour activer la sortie
    const activateOutput = async () => {
      if (state.isOutputActive) return; // Déjà actif
      
      state.isOutputActive = true;
      
      logger.info(`[VolumeConditionNode] Node ${nodeId} OUTPUT ON (timer=${timerDuration}s, switch=${switchMode})`);
      
      await ss.setNodeState(nodeId, 'ON', {
        ...state.lastSignalData,
        volumeButton: direction,
        volumePressed: true,
        lastVolumeEvent: getLastVolumeButtonEvent(direction),
      }, undefined, { forcePropagation: true });

      // Si mode timer (et pas mode switch), programmer l'arrêt
      if (timerDuration > 0 && !switchMode) {
        if (state.timerHandle) {
          clearTimeout(state.timerHandle);
        }
        state.timerHandle = setTimeout(() => {
          deactivateOutput();
        }, timerDuration * 1000);
      }
    };

    // Fonction pour désactiver la sortie
    const deactivateOutput = async () => {
      if (!state.isOutputActive) return; // Déjà inactif
      
      if (state.timerHandle) {
        clearTimeout(state.timerHandle);
        state.timerHandle = null;
      }
      
      state.isOutputActive = false;
      
      logger.info(`[VolumeConditionNode] Node ${nodeId} OUTPUT OFF`);
      
      await ss.setNodeState(nodeId, 'OFF', {
        ...state.lastSignalData,
        volumeButton: direction,
        volumePressed: false,
      }, undefined, { forcePropagation: true });
    };

    // Fonction pour basculer la sortie (mode switch)
    const toggleOutput = async () => {
      if (state.isOutputActive) {
        await deactivateOutput();
      } else {
        await activateOutput();
      }
    };

    // Fonction appelée quand la condition est détectée
    const onConditionMet = async () => {
      if (!state.hasActiveSignal) return;

      logger.info(
        `[VolumeConditionNode] Node ${nodeId} condition MET, switchMode=${switchMode}, timerDuration=${timerDuration}`
      );

      if (switchMode) {
        // Mode switch : basculer l'état à chaque appui
        await toggleOutput();
      } else if (!state.isOutputActive) {
        // Mode normal : activer si pas déjà actif
        await activateOutput();
      }
    };

    // S'abonner aux événements de bouton volume pour réagir en temps réel
    if (state.unsubscribeVolume) {
      state.unsubscribeVolume();
    }
    
    state.unsubscribeVolume = subscribeToVolumeButtons((event: VolumeButtonEvent) => {
      if (event.direction === direction) {
        const pressed = event.action === 'press';
        const condition = invert ? !pressed : pressed;
        
        if (event.action === 'press' && condition) {
          // Bouton appuyé et condition remplie
          onConditionMet();
        } else if (event.action === 'release') {
          // Bouton relâché
          // En mode continu sans timer et sans switch, désactiver quand le bouton est relâché
          if (!switchMode && timerDuration === 0 && state.isOutputActive && state.hasActiveSignal) {
            const stillPressed = isVolumeButtonPressed(direction);
            const stillCondition = invert ? !stillPressed : stillPressed;
            if (!stillCondition) {
              logger.info(`[VolumeConditionNode] Node ${nodeId} button released, deactivating (continuous mode)`);
              deactivateOutput();
            }
          }
        }
      }
    });

    // Handler enregistré pour chaque signal reçu
    ss.registerHandler(nodeId, async (signal: Signal): Promise<SignalPropagation> => {
      logger.info(
        `[VolumeConditionNode] Node ${nodeId} received signal: state=${signal.state}`
      );

      // Si signal OFF, nettoyer l'état et propager OFF
      if (signal.state === 'OFF') {
        state.hasActiveSignal = false;
        state.lastSignalData = null;
        
        // Nettoyer le timer si actif
        if (state.timerHandle) {
          clearTimeout(state.timerHandle);
          state.timerHandle = null;
        }
        
        // Désactiver la sortie si elle était active
        if (state.isOutputActive) {
          state.isOutputActive = false;
          return { 
            propagate: true, 
            state: 'OFF',
            data: { ...signal.data, volumePressed: false } 
          };
        }
        
        return { propagate: true, state: 'OFF', data: signal.data };
      }

      // Signal ON : mémoriser et vérifier la condition
      state.hasActiveSignal = true;
      state.lastSignalData = signal.data;
      
      // Vérifier immédiatement si la condition est déjà vraie
      const pressed = isVolumeButtonPressed(direction);
      const condition = invert ? !pressed : pressed;
      
      logger.info(
        `[VolumeConditionNode] Node ${nodeId} signal ON received, checking condition: pressed=${pressed}, condition=${condition}`
      );
      
      if (condition) {
        // Condition déjà remplie au moment où le signal arrive
        state.isOutputActive = true;
        
        // Si mode timer (et pas switch), programmer l'arrêt
        if (timerDuration > 0 && !switchMode) {
          if (state.timerHandle) {
            clearTimeout(state.timerHandle);
          }
          state.timerHandle = setTimeout(() => {
            deactivateOutput();
          }, timerDuration * 1000);
        }
        
        return {
          propagate: true,
          state: 'ON',
          data: {
            ...signal.data,
            volumeButton: direction,
            volumePressed: pressed,
            lastVolumeEvent: getLastVolumeButtonEvent(direction),
          },
        };
      }
      
      // Condition non remplie : émettre un événement signal.blocked pour le visuel
      logger.info(
        `[VolumeConditionNode] Node ${nodeId} signal ON pending, waiting for condition`
      );
      
      ss.emitEvent('signal.blocked', {
        nodeId,
        reason: 'condition_not_met',
        waitingFor: `volume_${direction}`,
      });
      
      return { propagate: false, data: signal.data };
    });

    return { success: true, outputs: {} };
  };
}

function buildHTML(
  options: { name: string; description: string; color: string; icon: string },
  settings: Record<string, any>,
  nodeMeta?: NodeMeta
) {
  const invertSignal = settings?.invertSignal ?? false;
  const switchMode = settings?.switchMode ?? false;
  const timerDuration = settings?.timerDuration ?? 0;
  
  let subtitle = invertSignal ? 'Signal inversé' : 'Signal direct';
  if (switchMode) {
    subtitle += ' • Mode Switch';
  } else if (timerDuration > 0) {
    subtitle += ` • Timer ${timerDuration}s`;
  } else {
    subtitle += ' • Continu';
  }

  const body = `
    <div class="volume-node${invertSignal ? ' inverted' : ''}${switchMode ? ' switch-mode' : ''}">
      <p class="node-card__description">${options.description}</p>
      
      <!-- Contrôles de configuration -->
      <div class="condition-settings">
        <!-- Mode Switch -->
        <div class="setting-row">
          <label class="setting-label">
            <span class="setting-text">Mode Switch</span>
            <span class="setting-hint">Bascule ON/OFF à chaque appui</span>
          </label>
          <label class="toggle-switch">
            <input type="checkbox" class="switch-mode-toggle" ${switchMode ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <!-- Timer Duration (visible uniquement si pas en mode switch) -->
        <div class="setting-row timer-setting" ${switchMode ? 'style="display:none;"' : ''}>
          <label class="setting-label">
            <span class="setting-text">Timer (secondes)</span>
            <span class="setting-hint">0 = continu tant que maintenu</span>
          </label>
          <input type="number" class="timer-duration-input" value="${timerDuration}" min="0" max="300" step="0.5" placeholder="0">
        </div>
      </div>
    </div>
  `;

  return buildNodeCardHTML({
    title: `${options.name} Condition`,
    subtitle,
    description: subtitle,
    iconName: options.icon,
    category: nodeMeta?.category || 'Condition',
    accentColor: options.color,
    body,
  });
}

function createVolumeConditionNode(options: {
  id: string;
  name: string;
  description: string;
  direction: VolumeDirection;
  color: string;
  icon: string;
}): NodeDefinition {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: 'Condition',
    icon: options.icon,
    iconFamily: 'material',
    color: options.color,
    inputs: [
      {
        name: 'signal_in',
        type: 'any',
        label: 'Signal In',
        description: "Signal d'entrée filtré par le bouton de volume",
      },
    ],
    outputs: [
      {
        name: 'signal_out',
        type: 'any',
        label: 'Signal Out',
        description: 'Signal propagé lorsque la condition sur le bouton de volume est vraie',
      },
    ],
    defaultSettings: {
      invertSignal: false,
      switchMode: false,       // Mode switch (toggle à chaque appui)
      timerDuration: 0,        // Durée en secondes (0 = continu tant que maintenu)
    },
    execute: createExecute(options.direction),
    validate: () => true,
    generateHTML: (settings: Record<string, any>, nodeMeta?: NodeMeta) =>
      buildHTML(options, settings, nodeMeta),
  };
}

const VolumeUpConditionNode = createVolumeConditionNode({
  id: 'condition.volume.up',
  name: 'Volume +',
  description: 'Propage si le bouton volume + est actif',
  direction: 'up',
  color: '#4CAF50',
  icon: 'volume-up',
});

const VolumeDownConditionNode = createVolumeConditionNode({
  id: 'condition.volume.down',
  name: 'Volume -',
  description: 'Propage si le bouton volume - est actif',
  direction: 'down',
  color: '#03A9F4',
  icon: 'volume-down',
});

registerNode(VolumeUpConditionNode);
registerNode(VolumeDownConditionNode);

export {
  VolumeUpConditionNode,
  VolumeDownConditionNode,
};
