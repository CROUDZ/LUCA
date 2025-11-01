// utils/isCompatible.ts
export const isCompatible = (type1: string, type2: string) => {
  return (
    (type1 === 'back' && type2.endsWith('-front')) ||
    (type1.endsWith('-front') && type2 === 'back')
  );
};