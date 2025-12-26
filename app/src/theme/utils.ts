/**
 * Utilitaires de manipulation des couleurs
 */

const HEX_REGEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeHex = (hex: string): string => {
  const trimmed = hex.trim();
  if (!HEX_REGEX.test(trimmed)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const normalized = trimmed.replace('#', '');
  if (normalized.length === 3) {
    return normalized
      .split('')
      .map((char) => char + char)
      .join('')
      .toLowerCase();
  }
  return normalized.toLowerCase();
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  const intVal = parseInt(normalized, 16);
  return {
    r: Math.floor(intVal / 65536),
    g: Math.floor((intVal % 65536) / 256),
    b: intVal % 256,
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toComponent = (value: number) => {
    const clamped = clamp(Math.round(value), 0, 255);
    const hex = clamped.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toComponent(r)}${toComponent(g)}${toComponent(b)}`;
};

/**
 * Convertit un hex en rgba avec alpha
 */
export const hexToRgba = (hex: string, alpha = 1): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

/**
 * Éclaircit une couleur hex
 */
export const lighten = (hex: string, amount = 0.1): string => {
  const { r, g, b } = hexToRgb(hex);
  const weight = clamp(amount, 0, 1);
  return rgbToHex(r + (255 - r) * weight, g + (255 - g) * weight, b + (255 - b) * weight);
};

/**
 * Assombrit une couleur hex
 */
export const darken = (hex: string, amount = 0.1): string => {
  const { r, g, b } = hexToRgb(hex);
  const weight = clamp(amount, 0, 1);
  return rgbToHex(r * (1 - weight), g * (1 - weight), b * (1 - weight));
};

/**
 * Mélange deux couleurs hex
 */
export const mixColors = (hexA: string, hexB: string, ratio = 0.5): string => {
  const weight = clamp(ratio, 0, 1);
  const colorA = hexToRgb(hexA);
  const colorB = hexToRgb(hexB);
  const mix = (a: number, b: number) => a * (1 - weight) + b * weight;
  return rgbToHex(mix(colorA.r, colorB.r), mix(colorA.g, colorB.g), mix(colorA.b, colorB.b));
};

export type RgbColor = ReturnType<typeof hexToRgb>;
