// components/BlockComponent.tsx
import React, { useRef } from 'react';
import { Animated, PanResponder, PanResponderInstance, Alert, View } from 'react-native';
import { styles } from '../styles/styles';
import { FrontRow } from './FrontRow';
import { AnchorButton } from './AnchorButton';
import { Block } from '../interfaces/types';

interface BlockComponentProps {
  block: Block;
  selectedAnchor: { blockId: string; type: string } | null;
  handleAnchorPress: (blockId: string, type: string) => void;
  deleteBlock: (blockId: string) => void;
  offset: Animated.ValueXY;
  draggingOffset: Animated.ValueXY;
  draggingBlockId: string | null;
  setDraggingBlockId: (id: string | null) => void;
  updatePosition: (blockId: string, dx: number, dy: number) => void;
  isBlockInteracting: React.MutableRefObject<boolean>;
}

const DRAG_THRESHOLD = 8;
const LONG_PRESS_DURATION = 600;

const BlockComponent = ({
  block,
  selectedAnchor,
  handleAnchorPress,
  deleteBlock,
  offset,
  draggingOffset,
  draggingBlockId,
  setDraggingBlockId,
  updatePosition,
  isBlockInteracting,
}: BlockComponentProps) => {
  // TOUS les useRef doivent être déclarés au début, dans le même ordre à chaque render
  const longPressTimer = useRef<number | null>(null);
  const hasMoved = useRef(false);
  const isDragging = useRef(false);
  const hasShownAlert = useRef(false);
  
  const AnimatedView = Animated.createAnimatedComponent(View);

  const panResponder: PanResponderInstance = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const distance = Math.sqrt(
        gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy
      );
      return distance > 2;
    },
    onMoveShouldSetPanResponderCapture: () => isDragging.current,
    
    onPanResponderGrant: () => {
      // Signale au canvas qu'un bloc est en interaction
      isBlockInteracting.current = true;
      
      // Réinitialise tous les états
      hasMoved.current = false;
      isDragging.current = false;
      hasShownAlert.current = false;
      draggingOffset.setValue({ x: 0, y: 0 });
      setDraggingBlockId(block.id);
      
      // Lance le timer pour le long press
      longPressTimer.current = setTimeout(() => {
        if (!hasMoved.current && !hasShownAlert.current) {
          hasShownAlert.current = true;
          Alert.alert(
            'Supprimer le bloc',
            'Voulez-vous vraiment supprimer ce bloc ?',
            [
              { 
                text: 'Annuler', 
                style: 'cancel',
                onPress: () => {
                  // Réinitialise après annulation
                  draggingOffset.setValue({ x: 0, y: 0 });
                  setDraggingBlockId(null);
                  isBlockInteracting.current = false;
                }
              },
              { 
                text: 'Supprimer', 
                style: 'destructive',
                onPress: () => {
                  deleteBlock(block.id);
                  isBlockInteracting.current = false;
                }
              },
            ],
            { 
              cancelable: true,
              onDismiss: () => {
                draggingOffset.setValue({ x: 0, y: 0 });
                setDraggingBlockId(null);
                isBlockInteracting.current = false;
              }
            }
          );
        }
        longPressTimer.current = null;
      }, LONG_PRESS_DURATION);
    },
    
    onPanResponderMove: (_, gestureState) => {
      // Calcule la distance totale depuis le début
      const distance = Math.sqrt(
        gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy
      );
      
      // Si on dépasse le seuil, on active le drag
      if (distance > DRAG_THRESHOLD) {
        // Annule le long press si ce n'est pas déjà fait
        if (longPressTimer.current && !hasMoved.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        
        // Active le mode drag
        if (!hasMoved.current) {
          hasMoved.current = true;
          isDragging.current = true;
        }
        
        // Met à jour la position visuelle
        if (isDragging.current && !hasShownAlert.current) {
          draggingOffset.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      }
    },
    
    onPanResponderRelease: (_, gestureState) => {
      // Nettoie le timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      // Si on a bougé et qu'on n'a pas montré l'alerte, applique le déplacement
      if (hasMoved.current && !hasShownAlert.current) {
        updatePosition(block.id, gestureState.dx, gestureState.dy);
      }
      
      // Réinitialise tout
      draggingOffset.setValue({ x: 0, y: 0 });
      setDraggingBlockId(null);
      isBlockInteracting.current = false;
      hasMoved.current = false;
      isDragging.current = false;
      hasShownAlert.current = false;
    },
    
    onPanResponderTerminate: () => {
      // Nettoie tout en cas d'interruption
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      draggingOffset.setValue({ x: 0, y: 0 });
      setDraggingBlockId(null);
      isBlockInteracting.current = false;
      hasMoved.current = false;
      isDragging.current = false;
      hasShownAlert.current = false;
    },
  });

  const isAnchorSelected = (type: string) => {
    return selectedAnchor?.blockId === block.id && selectedAnchor?.type === type;
  };

  const blockStyle = {
    ...styles.block,
    position: 'absolute' as const,
    left: Animated.add(
      Animated.subtract(block.x, offset.x),
      draggingBlockId === block.id ? draggingOffset.x : 0
    ),
    top: Animated.add(
      Animated.subtract(block.y, offset.y),
      draggingBlockId === block.id ? draggingOffset.y : 0
    ),
    width: block.width,
    height: block.height,
    zIndex: draggingBlockId === block.id ? 1000 : 1,
    elevation: draggingBlockId === block.id ? 10 : 2,
  };

  return (
    <AnimatedView {...panResponder.panHandlers} style={blockStyle}>
      {block.frontAnchors.map((anchor) => (
        <FrontRow key={anchor.id} label={anchor.label}>
          <AnchorButton
            onPress={() => handleAnchorPress(block.id, `${anchor.id}-front`)}
            isSelected={isAnchorSelected(`${anchor.id}-front`)}
            style={styles.anchorButton}
          />
        </FrontRow>
      ))}

      <AnchorButton
        onPress={() => handleAnchorPress(block.id, 'back')}
        isSelected={isAnchorSelected('back')}
        style={[styles.anchorButton, styles.backAnchorButton]}
      />
    </AnimatedView>
  );
};

export { BlockComponent };