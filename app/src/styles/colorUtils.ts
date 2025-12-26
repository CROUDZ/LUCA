/**
 * @deprecated Importer depuis '../theme' à la place
 *
 * Ce fichier est conservé pour la rétrocompatibilité.
 * Il réexporte tout depuis le nouveau module src/theme/
 */

export { hexToRgba, lighten, darken, mixColors } from '../theme/utils';
export { getStyleColors as getThemeColors } from '../theme/styleHelpers';
export type { RgbColor } from '../theme/utils';
