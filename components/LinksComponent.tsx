// components/LinksComponent.tsx
import React from 'react';
import Svg, { Line } from 'react-native-svg';
import { Dimensions, StyleSheet, Animated } from 'react-native';
import { Block, Link } from '../interfaces/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LinksComponentProps {
  links: Link[];
  blocks: Block[];
  getAnchorPosition: (block: Block, type: string) => { x: number; y: number };
  offset: Animated.ValueXY;
  draggingBlockId: string | null;
  draggingOffset: Animated.ValueXY;
}

const LinksComponent = ({ links, blocks, getAnchorPosition, offset, draggingBlockId, draggingOffset }: LinksComponentProps) => {
  const AnimatedLine = Animated.createAnimatedComponent(Line);

  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      pointerEvents="none"
    >
      {links.map((link) => {
        const fromBlock = blocks.find((b) => b.id === link.fromBlockId);
        const toBlock = blocks.find((b) => b.id === link.toBlockId);

        if (!fromBlock || !toBlock) return null;

        const fromWorld = getAnchorPosition(fromBlock, link.fromAnchorType);
        const toWorld = getAnchorPosition(toBlock, link.toAnchorType);

        const fromDragX = link.fromBlockId === draggingBlockId ? draggingOffset.x : 0;
        const fromDragY = link.fromBlockId === draggingBlockId ? draggingOffset.y : 0;
        const toDragX = link.toBlockId === draggingBlockId ? draggingOffset.x : 0;
        const toDragY = link.toBlockId === draggingBlockId ? draggingOffset.y : 0;

        const fromX = Animated.add(fromWorld.x, fromDragX);
        const fromY = Animated.add(fromWorld.y, fromDragY);
        const toX = Animated.add(toWorld.x, toDragX);
        const toY = Animated.add(toWorld.y, toDragY);

        const x1 = Animated.subtract(fromX, offset.x);
        const y1 = Animated.subtract(fromY, offset.y);
        const x2 = Animated.subtract(toX, offset.x);
        const y2 = Animated.subtract(toY, offset.y);

        return (
          <AnimatedLine
            key={link.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#2196F3"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
};

export { LinksComponent };