// utils/checkLinkExists.ts
import { Link } from '../interfaces/types';

export const checkLinkExists = (
  links: Link[],
  fromId: string,
  fromType: string,
  toId: string,
  toType: string
) => {
  return links.some(
    (link) =>
      (link.fromBlockId === fromId &&
        link.fromAnchorType === fromType &&
        link.toBlockId === toId &&
        link.toAnchorType === toType) ||
      (link.fromBlockId === toId &&
        link.fromAnchorType === toType &&
        link.toBlockId === fromId &&
        link.toAnchorType === fromType)
  );
};