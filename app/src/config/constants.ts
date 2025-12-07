/**
 * Configuration et constantes de l'application LUCA
 */

import type { AppConfig } from '../types';
import { basePalette } from '../styles/global';
import { hexToRgba } from '../styles/colorUtils';

// ============================================================================
// Configuration principale
// ============================================================================

export const APP_CONFIG: AppConfig = {
  storage: {
    key: '@node_editor_saves',
    autoSaveInterval: 30000, // 30 secondes
  },
  webview: {
    htmlUri: 'file:///android_asset/NodeEditorWeb.html',
    messageTimeout: 5000, // 5 secondes
  },
  zoom: {
    min: 0.5,
    max: 3.0,
    step: 0.1,
    default: 1.0,
  },
  nodes: {
    defaultPosition: {
      x: 200,
      y: 150,
    },
    randomOffsetRange: 300,
  },
};

// ============================================================================
// Messages d'erreur
// ============================================================================

export const ERROR_MESSAGES = {
  WEBVIEW_NOT_READY: 'WebView is not ready yet',
  PARSE_ERROR: 'Failed to parse graph data',
  STORAGE_ERROR: 'Failed to access storage',
  GRAPH_CYCLE: 'Cycle detected in graph',
  INVALID_NODE: 'Invalid node configuration',
  CONNECTION_ERROR: 'Failed to create connection',
  UNKNOWN_ERROR: 'An unknown error occurred',
  SAVE_NAME_EMPTY: 'Please enter a name for the save',
  SAVE_FAILED: 'Failed to save graph',
  LOAD_FAILED: 'Failed to load graph',
  DELETE_FAILED: 'Failed to delete save',
} as const;

// ============================================================================
// Métadonnées de l'application
// ============================================================================

export const APP_METADATA = {
  version: '0.0.1',
  name: 'LUCA Node Editor',
  description: 'Visual node-based graph editor for React Native',
  author: 'Your Name',
  license: 'MIT',
} as const;

// ============================================================================
// Constantes de l'interface utilisateur
// ============================================================================

export const UI_CONSTANTS = {
  HEADER_HEIGHT: 60,
  TOOLBAR_HEIGHT: 50,
  NODE_PICKER_HEIGHT: 400,
  SAVE_MENU_WIDTH: 300,
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
} as const;

// ============================================================================
// Couleurs du thème
// ============================================================================

export const THEME_COLORS = {
  background: basePalette.backgroundDark,
  backgroundSecondary: basePalette.backgroundMuted,
  primary: basePalette.primary,
  primaryDark: basePalette.primaryContrast,
  secondary: basePalette.secondary,
  success: basePalette.success,
  warning: basePalette.warning,
  error: basePalette.error,
  text: basePalette.textOnDark,
  textSecondary: basePalette.textSecondaryOnDark,
  border: hexToRgba(basePalette.primarySoft, 0.35),
  shadow: basePalette.shadowDark,
} as const;
