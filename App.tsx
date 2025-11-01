// App.tsx
import React, { useState, useRef } from 'react';
import { View, Dimensions, PanResponder, PanResponderInstance, Modal, TouchableOpacity, Text, Animated } from 'react-native';
import { styles } from './styles/styles';
import { BlockComponent } from './components/BlockComponent';
import { LinksComponent } from './components/LinksComponent';
import { Toolbar } from './components/Toolbar';
import { Instructions } from './components/Instructions';
import { getAnchorPosition } from './utils/getAnchorPosition';
import { isCompatible } from './utils/isCompatible';
import { checkLinkExists } from './utils/checkLinkExists';
import { Block, Link } from './interfaces/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BlockType {
  type: string;
  label: string;
  frontAnchors: { id: string; label: string }[];
}

const blockTypes: BlockType[] = [
  {
    type: 'if',
    label: 'If Block',
    frontAnchors: [
      { id: 'if', label: 'If' },
      { id: 'else', label: 'Else' },
    ],
  },
];

const App = () => {
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: 'block1',
      x: 100,
      y: 200,
      width: 120,
      height: 100,
      frontAnchors: blockTypes[0].frontAnchors,
    },
    {
      id: 'block2',
      x: 300,
      y: 200,
      width: 120,
      height: 100,
      frontAnchors: blockTypes[0].frontAnchors,
    },
  ]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedAnchor, setSelectedAnchor] = useState<{
    blockId: string;
    type: string;
  } | null>(null);
  const [showBlockList, setShowBlockList] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);

  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const draggingOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isBlockInteracting = useRef(false);

  const panResponderCanvas: PanResponderInstance = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Ne pas activer le pan si un bloc est en interaction
      if (isBlockInteracting.current) {
        return false;
      }

      // Activer uniquement avec 2 doigts
      const twoFingers = evt.nativeEvent.touches.length === 2;
      const hasMovement = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      
      return twoFingers && hasMovement;
    },
    onPanResponderGrant: () => {
      offset.setOffset({ x: (offset.x as any)._value, y: (offset.y as any)._value });
      offset.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: Animated.event(
      [null, { dx: offset.x, dy: offset.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: () => {
      offset.flattenOffset();
    },
    onPanResponderTerminate: () => {
      offset.flattenOffset();
    },
  });

  const handleAnchorPress = (blockId: string, type: string) => {
    if (selectedAnchor) {
      if (
        selectedAnchor.blockId === blockId &&
        selectedAnchor.type === type
      ) {
        setSelectedAnchor(null);
        return;
      }

      if (selectedAnchor.blockId === blockId) {
        return;
      }

      const exists = checkLinkExists(
        links,
        selectedAnchor.blockId,
        selectedAnchor.type,
        blockId,
        type
      );

      const compatible = isCompatible(selectedAnchor.type, type);

      if (!exists && compatible) {
        setLinks((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            fromBlockId: selectedAnchor.blockId,
            fromAnchorType: selectedAnchor.type,
            toBlockId: blockId,
            toAnchorType: type,
          },
        ]);
      }

      setSelectedAnchor(null);
    } else {
      setSelectedAnchor({ blockId, type });
    }
  };

  const updateBlockPosition = (blockId: string, dx: number, dy: number) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, x: block.x + dx, y: block.y + dy }
          : block
      )
    );
  };

  const deleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setLinks((prev) => prev.filter((l) => l.fromBlockId !== blockId && l.toBlockId !== blockId));
  };

  const addBlock = (bt: BlockType) => {
    const newBlock: Block = {
      id: `block${Date.now()}`,
      x: -(offset.x as any)._value + SCREEN_WIDTH / 2,
      y: -(offset.y as any)._value + SCREEN_HEIGHT / 2,
      width: 120,
      height: 100,
      frontAnchors: bt.frontAnchors,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setShowBlockList(false);
  };

  return (
    <View style={styles.container} {...panResponderCanvas.panHandlers}>
      <LinksComponent
        links={links}
        blocks={blocks}
        getAnchorPosition={getAnchorPosition}
        offset={offset}
        draggingBlockId={draggingBlockId}
        draggingOffset={draggingOffset}
      />

      {blocks.map((block) => (
        <BlockComponent
          key={block.id}
          block={block}
          selectedAnchor={selectedAnchor}
          handleAnchorPress={handleAnchorPress}
          deleteBlock={deleteBlock}
          offset={offset}
          draggingOffset={draggingOffset}
          draggingBlockId={draggingBlockId}
          setDraggingBlockId={setDraggingBlockId}
          updatePosition={updateBlockPosition}
          isBlockInteracting={isBlockInteracting}
        />
      ))}

      <Toolbar
        onClear={() => setLinks([])}
        onAdd={() => setShowBlockList(true)}
      />

      <Instructions selectedAnchor={selectedAnchor} />

      <Modal
        visible={showBlockList}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockList(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {blockTypes.map((bt) => (
              <TouchableOpacity
                key={bt.type}
                style={styles.modalItem}
                onPress={() => addBlock(bt)}
              >
                <Text>{bt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowBlockList(false)}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default App;