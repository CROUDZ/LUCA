// interfaces/types.ts
export interface Block {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frontAnchors: { id: string; label: string }[];
}

export interface Link {
  id: string;
  fromBlockId: string;
  fromAnchorType: string;
  toBlockId: string;
  toAnchorType: string;
}