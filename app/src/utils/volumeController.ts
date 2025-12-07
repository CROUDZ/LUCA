import {
  DeviceEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import { logger } from './logger';

export type VolumeDirection = 'up' | 'down';
export type VolumeButtonAction = 'press' | 'release';

export interface VolumeButtonEvent {
  direction: VolumeDirection;
  action: VolumeButtonAction;
  pressed: boolean;
  repeat: number;
  timestamp: number;
  volume?: number;
  maxVolume?: number;
  source: 'hardware' | 'software';
}

export interface VolumeInfo {
  volume?: number;
  maxVolume?: number;
  timestamp?: number;
  source?: string;
}

type ButtonListener = (event: VolumeButtonEvent) => void;

type VolumeNativeModuleShape = {
  adjustVolume?: (
    direction: VolumeDirection,
    steps: number,
    showUI: boolean
  ) => Promise<VolumeInfo>;
  setVolume?: (level: number, showUI: boolean) => Promise<VolumeInfo>;
  getVolumeInfo?: () => Promise<VolumeInfo>;
};

const VolumeNativeModule = NativeModules.VolumeModule as VolumeNativeModuleShape | undefined;

const buttonState: Record<VolumeDirection, boolean> = {
  up: false,
  down: false,
};

const lastEvents: Record<VolumeDirection, VolumeButtonEvent | null> = {
  up: null,
  down: null,
};

let lastVolumeInfo: VolumeInfo | null = null;
const listeners = new Set<ButtonListener>();

let buttonSubscription: EmitterSubscription | null = null;
let levelSubscription: EmitterSubscription | null = null;
let warnedMissingModule = false;

function normalizeDirection(value?: string): VolumeDirection {
  return value === 'down' ? 'down' : 'up';
}

function normalizeAction(value?: string): VolumeButtonAction {
  return value === 'release' ? 'release' : 'press';
}

function normalizeVolumeInfo(payload?: VolumeInfo | null): VolumeInfo | null {
  if (!payload) return null;
  return {
    volume: typeof payload.volume === 'number' ? payload.volume : undefined,
    maxVolume: typeof payload.maxVolume === 'number' ? payload.maxVolume : undefined,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    source: payload.source,
  };
}

function handleNativeButtonEvent(payload: any) {
  if (!payload) return;
  const direction = normalizeDirection(payload.direction);
  const action = normalizeAction(payload.action);
  const pressed = action === 'press';
  buttonState[direction] = pressed;

  const event: VolumeButtonEvent = {
    direction,
    action,
    pressed,
    repeat: typeof payload.repeat === 'number' ? payload.repeat : 0,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    volume: typeof payload.volume === 'number' ? payload.volume : undefined,
    maxVolume: typeof payload.maxVolume === 'number' ? payload.maxVolume : undefined,
    source: payload.source === 'software' ? 'software' : 'hardware',
  };

  lastEvents[direction] = event;
  if (typeof event.volume === 'number' || typeof event.maxVolume === 'number') {
    lastVolumeInfo = {
      volume: event.volume,
      maxVolume: event.maxVolume,
      timestamp: event.timestamp,
      source: event.source,
    };
  }

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      logger.warn('[VolumeService] Listener failed', error);
    }
  });
}

function handleLevelChange(payload: any) {
  const info = normalizeVolumeInfo(payload);
  if (info) {
    lastVolumeInfo = info;
  }
}

function ensureNativeListeners() {
  if (buttonSubscription) return;
  if (Platform.OS !== 'android') {
    if (!warnedMissingModule) {
      logger.warn('[VolumeService] VolumeModule not available on this platform');
      warnedMissingModule = true;
    }
    return;
  }

  if (!VolumeNativeModule) {
    if (!warnedMissingModule) {
      logger.warn('[VolumeService] VolumeModule not registered; hardware events unavailable');
      warnedMissingModule = true;
    }
    return;
  }

  buttonSubscription = DeviceEventEmitter.addListener(
    'hardware.volume.button',
    handleNativeButtonEvent
  );
  levelSubscription = DeviceEventEmitter.addListener('volume.level.changed', handleLevelChange);
}

export function ensureVolumeMonitoring(): void {
  ensureNativeListeners();
}

export function isVolumeButtonPressed(direction: VolumeDirection): boolean {
  return buttonState[direction];
}

export function getLastVolumeButtonEvent(direction: VolumeDirection): VolumeButtonEvent | null {
  return lastEvents[direction];
}

export function subscribeToVolumeButtons(listener: ButtonListener): () => void {
  ensureNativeListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function adjustSystemVolume(
  direction: VolumeDirection,
  steps: number = 1,
  showUI: boolean = false
): Promise<VolumeInfo | null> {
  if (!VolumeNativeModule?.adjustVolume) {
    if (!warnedMissingModule) {
      logger.warn('[VolumeService] adjustVolume unavailable: VolumeModule missing');
      warnedMissingModule = true;
    }
    return null;
  }

  try {
    const normalizedSteps = steps <= 0 ? 1 : steps;
    const info = await VolumeNativeModule.adjustVolume(direction, normalizedSteps, showUI);
    const normalized = normalizeVolumeInfo(info);
    if (normalized) lastVolumeInfo = normalized;
    return normalized;
  } catch (error) {
    logger.error('[VolumeService] Failed to adjust volume', error);
    throw error;
  }
}

export async function setSystemVolume(
  level: number,
  showUI: boolean = false
): Promise<VolumeInfo | null> {
  if (!VolumeNativeModule?.setVolume) {
    if (!warnedMissingModule) {
      logger.warn('[VolumeService] setVolume unavailable: VolumeModule missing');
      warnedMissingModule = true;
    }
    return null;
  }

  try {
    const clampedLevel = Number.isFinite(level) ? level : 0;
    const info = await VolumeNativeModule.setVolume(clampedLevel, showUI);
    const normalized = normalizeVolumeInfo(info);
    if (normalized) lastVolumeInfo = normalized;
    return normalized;
  } catch (error) {
    logger.error('[VolumeService] Failed to set volume', error);
    throw error;
  }
}

export async function getVolumeInfo(): Promise<VolumeInfo | null> {
  if (VolumeNativeModule?.getVolumeInfo) {
    try {
      const info = await VolumeNativeModule.getVolumeInfo();
      const normalized = normalizeVolumeInfo(info);
      if (normalized) lastVolumeInfo = normalized;
      return normalized;
    } catch (error) {
      logger.warn('[VolumeService] getVolumeInfo failed', error);
    }
  }
  return lastVolumeInfo;
}

export function getLastVolumeInfo(): VolumeInfo | null {
  return lastVolumeInfo;
}

export function __dangerouslyResetVolumeServiceForTests() {
  buttonState.up = false;
  buttonState.down = false;
  lastEvents.up = null;
  lastEvents.down = null;
  lastVolumeInfo = null;
  warnedMissingModule = false;
  buttonSubscription?.remove();
  levelSubscription?.remove();
  buttonSubscription = null;
  levelSubscription = null;
  listeners.clear();
}
