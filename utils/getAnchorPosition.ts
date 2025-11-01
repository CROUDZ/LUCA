// utils/getAnchorPosition.ts
import { Block } from '../interfaces/types';

export const getAnchorPosition = (block: Block, type: string) => {
  if (type === 'back') {
    return { x: block.x, y: block.y + block.height / 2 };
  } else if (type.endsWith('-front')) {
    const frontId = type.slice(0, -6);
    const index = block.frontAnchors.findIndex((a) => a.id === frontId);
    if (index === -1) {
      return { x: block.x, y: block.y };
    }
    const numFronts = block.frontAnchors.length;
    const yFraction = (index + 0.5) / numFronts;
    return { x: block.x + block.width, y: block.y + yFraction * block.height };
  } else {
    return { x: block.x, y: block.y };
  }
};