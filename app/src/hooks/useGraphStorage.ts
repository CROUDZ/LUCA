/**
 * Hook pour gérer le stockage des graphes
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedGraph, DrawflowExport, NodeSettingsMap } from '../types';
import { ErrorCode } from '../types';
import { APP_CONFIG } from '../config/constants';
import {
  withErrorHandling,
  confirmDestructiveAction,
  handleError,
  createAppError,
} from '../utils/errorHandler';

export function useGraphStorage() {
  const [saves, setSaves] = useState<SavedGraph[]>([]);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Charger toutes les sauvegardes depuis AsyncStorage
   */
  const loadSaves = useCallback(async () => {
    setIsLoading(true);
    const result = await withErrorHandling(
      async () => {
        const savedData = await AsyncStorage.getItem(APP_CONFIG.storage.key);
        if (savedData) {
          const parsed: SavedGraph[] = JSON.parse(savedData);
          setSaves(parsed);
          return parsed;
        }
        return [];
      },
      ErrorCode.STORAGE_ERROR,
      'loadSaves',
      false
    );
    setIsLoading(false);
    return result || [];
  }, []);

  /**
   * Charger toutes les sauvegardes au démarrage
   */
  useEffect(() => {
    loadSaves();
  }, [loadSaves]);

  /**
   * Sauvegarder toutes les sauvegardes dans AsyncStorage
   */
  const savesToStorage = useCallback(async (newSaves: SavedGraph[]) => {
    return await withErrorHandling(
      async () => {
        await AsyncStorage.setItem(APP_CONFIG.storage.key, JSON.stringify(newSaves));
        setSaves(newSaves);
        return true;
      },
      ErrorCode.STORAGE_ERROR,
      'savesToStorage'
    );
  }, []);

  /**
   * Créer une nouvelle sauvegarde
   */
  const createSave = useCallback(
    async (name: string, data: DrawflowExport, description?: string, nodeSettings?: NodeSettingsMap) => {
      if (!name.trim()) {
        handleError(
          createAppError(ErrorCode.STORAGE_ERROR, 'Save name cannot be empty'),
          'createSave'
        );
        return null;
      }

      const newSave: SavedGraph = {
        id: Date.now().toString(),
        name: name.trim(),
        data,
        timestamp: Date.now(),
        description,
        tags: [],
        nodeSettings,
      };

      const updatedSaves = [...saves, newSave];
      const success = await savesToStorage(updatedSaves);

      if (success) {
        setCurrentSaveId(newSave.id);
        console.log('💾 Created save:', newSave.name);
        return newSave;
      }

      return null;
    },
    [saves, savesToStorage]
  );

  /**
   * Mettre à jour une sauvegarde existante
   */
  const updateSave = useCallback(
    async (saveId: string, data: DrawflowExport, nodeSettings?: NodeSettingsMap) => {
      const updatedSaves = saves.map((save) =>
        save.id === saveId ? { ...save, data, timestamp: Date.now(), nodeSettings } : save
      );

      const success = await savesToStorage(updatedSaves);

      if (success) {
        console.log('💾 Updated save:', saveId);
        return true;
      }

      return false;
    },
    [saves, savesToStorage]
  );

  /**
   * Sauvegarder automatiquement si une sauvegarde est active
   */
  const autoSave = useCallback(
    async (data: DrawflowExport, nodeSettings?: NodeSettingsMap) => {
      if (!currentSaveId) {
        console.log('💾 No active save for auto-save');
        return false;
      }

      return await updateSave(currentSaveId, data, nodeSettings);
    },
    [currentSaveId, updateSave]
  );

  /**
   * Supprimer une sauvegarde
   */
  const deleteSave = useCallback(
    async (saveId: string, skipConfirmation: boolean = false) => {
      const save = saves.find((s) => s.id === saveId);
      if (!save) return false;

      const performDelete = async () => {
        const updatedSaves = saves.filter((s) => s.id !== saveId);
        const success = await savesToStorage(updatedSaves);

        if (success) {
          if (currentSaveId === saveId) {
            setCurrentSaveId(null);
          }
          console.log('🗑️ Deleted save:', save.name);
          return true;
        }

        return false;
      };

      if (skipConfirmation) {
        return await performDelete();
      }

      return new Promise<boolean>((resolve) => {
        confirmDestructiveAction(
          'Delete Save',
          `Are you sure you want to delete "${save.name}"?`,
          async () => {
            const result = await performDelete();
            resolve(result);
          },
          'Delete',
          'Cancel'
        );
      });
    },
    [saves, currentSaveId, savesToStorage]
  );

  /**
   * Renommer une sauvegarde
   */
  const renameSave = useCallback(
    async (saveId: string, newName: string) => {
      if (!newName.trim()) {
        handleError(
          createAppError(ErrorCode.STORAGE_ERROR, 'Save name cannot be empty'),
          'renameSave'
        );
        return false;
      }

      const updatedSaves = saves.map((save) =>
        save.id === saveId ? { ...save, name: newName.trim(), timestamp: Date.now() } : save
      );

      return await savesToStorage(updatedSaves);
    },
    [saves, savesToStorage]
  );

  /**
   * Obtenir une sauvegarde par ID
   */
  const getSave = useCallback(
    (saveId: string): SavedGraph | undefined => {
      return saves.find((s) => s.id === saveId);
    },
    [saves]
  );

  /**
   * Charger une sauvegarde (définir comme active)
   */
  const loadSave = useCallback(
    (saveId: string): SavedGraph | null => {
      const save = getSave(saveId);
      if (save) {
        setCurrentSaveId(saveId);
        console.log('📂 Loaded save:', save.name);
        return save;
      }
      return null;
    },
    [getSave]
  );

  return {
    saves,
    currentSaveId,
    isLoading,
    createSave,
    updateSave,
    autoSave,
    deleteSave,
    renameSave,
    getSave,
    loadSave,
    loadSaves,
    setCurrentSaveId,
  };
}
