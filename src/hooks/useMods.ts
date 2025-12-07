/**
 * Hook React pour utiliser le service de mods
 * Fournit une interface réactive pour la gestion des mods
 */

import { useState, useEffect, useCallback } from 'react';
import modService, {
  ModSummary,
  ModDetail,
  InstalledMod,
  ModSearchParams,
  ModListResponse,
} from '../services/ModService';

// === Hook pour lister les mods ===

interface UseModListResult {
  mods: ModSummary[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  search: (params: ModSearchParams) => Promise<void>;
}

export function useModList(initialParams: ModSearchParams = {}): UseModListResult {
  const [mods, setMods] = useState<ModSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams.page || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [params, setParams] = useState<ModSearchParams>(initialParams);

  const fetchMods = useCallback(async (searchParams: ModSearchParams, append = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: ModListResponse = await modService.listMods(searchParams);
      
      if (append) {
        setMods(prev => [...prev, ...response.mods]);
      } else {
        setMods(response.mods);
      }
      
      setTotal(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMods(params);
  }, [fetchMods, params]);

  const refresh = useCallback(async () => {
    modService.clearCache();
    await fetchMods({ ...params, page: 1 });
  }, [fetchMods, params]);

  const loadMore = useCallback(async () => {
    if (page < totalPages && !loading) {
      await fetchMods({ ...params, page: page + 1 }, true);
    }
  }, [fetchMods, params, page, totalPages, loading]);

  const search = useCallback(async (newParams: ModSearchParams) => {
    setParams({ ...newParams, page: 1 });
  }, []);

  return { mods, loading, error, total, page, totalPages, refresh, loadMore, search };
}

// === Hook pour les détails d'un mod ===

interface UseModDetailResult {
  mod: ModDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useModDetail(name: string): UseModDetailResult {
  const [mod, setMod] = useState<ModDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMod = useCallback(async () => {
    if (!name) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const detail = await modService.getModDetail(name);
      setMod(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mod non trouvé');
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    fetchMod();
  }, [fetchMod]);

  const refresh = useCallback(async () => {
    modService.clearCache();
    await fetchMod();
  }, [fetchMod]);

  return { mod, loading, error, refresh };
}

// === Hook pour les mods installés ===

interface UseInstalledModsResult {
  mods: InstalledMod[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  install: (name: string) => Promise<void>;
  uninstall: (name: string) => Promise<void>;
  isInstalled: (name: string) => boolean;
  installing: string | null;
}

export function useInstalledMods(): UseInstalledModsResult {
  const [mods, setMods] = useState<InstalledMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const fetchMods = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const installed = await modService.getInstalledMods();
      setMods(installed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de lecture');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  const install = useCallback(async (name: string) => {
    setInstalling(name);
    setError(null);
    
    try {
      await modService.downloadAndInstallMod(name);
      await fetchMods(); // Rafraîchir la liste
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'installation');
      throw err;
    } finally {
      setInstalling(null);
    }
  }, [fetchMods]);

  const uninstall = useCallback(async (name: string) => {
    setError(null);
    
    try {
      await modService.uninstallMod(name);
      await fetchMods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de désinstallation');
      throw err;
    }
  }, [fetchMods]);

  const isInstalled = useCallback((name: string) => {
    return mods.some(m => m.name === name);
  }, [mods]);

  return { mods, loading, error, refresh: fetchMods, install, uninstall, isInstalled, installing };
}

// === Hook pour vérifier les mises à jour ===

interface ModUpdate {
  mod: InstalledMod;
  latestVersion: string;
}

interface UseModUpdatesResult {
  updates: ModUpdate[];
  loading: boolean;
  error: string | null;
  checkUpdates: () => Promise<void>;
  updateMod: (name: string) => Promise<void>;
  updateAll: () => Promise<void>;
}

export function useModUpdates(): UseModUpdatesResult {
  const [updates, setUpdates] = useState<ModUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const available = await modService.checkForUpdates();
      setUpdates(available);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de vérification');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMod = useCallback(async (name: string) => {
    try {
      await modService.updateMod(name);
      // Retirer de la liste des mises à jour
      setUpdates(prev => prev.filter(u => u.mod.name !== name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      throw err;
    }
  }, []);

  const updateAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      for (const update of updates) {
        await modService.updateMod(update.mod.name);
      }
      setUpdates([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors des mises à jour');
    } finally {
      setLoading(false);
    }
  }, [updates]);

  return { updates, loading, error, checkUpdates, updateMod, updateAll };
}
