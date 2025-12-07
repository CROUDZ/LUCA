/**
 * Service pour récupérer et gérer les mods depuis l'API web
 * Ce service permet à l'app Android de :
 * - Lister les mods disponibles
 * - Télécharger et installer des mods
 * - Gérer les mods installés localement
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration de l'API
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:3000/api' // Android emulator localhost
  : 'https://luca-mods.vercel.app/api'; // Production URL

const INSTALLED_MODS_KEY = '@luca/installed_mods';
const MODS_CACHE_KEY = '@luca/mods_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Types
export interface ModAuthor {
  id: string;
  name: string;
  email?: string;
}

export interface ModSummary {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: ModAuthor;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  status: string;
  createdAt: string;
}

export interface ModDetail extends ModSummary {
  mainCode: string;
  manifest: ModManifest;
  nodeTypes: Record<string, NodeTypeDefinition>;
  updatedAt: string;
}

export interface ModManifest {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  lucaVersion: string;
  permissions: string[];
}

export interface NodeTypeDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  inputs: Array<{
    id: string;
    type: string;
    label: string;
  }>;
  outputs: Array<{
    id: string;
    type: string;
    label: string;
  }>;
  defaultConfig?: Record<string, unknown>;
}

export interface InstalledMod {
  name: string;
  displayName: string;
  version: string;
  installedAt: string;
  mainCode: string;
  manifest: ModManifest;
  nodeTypes: Record<string, NodeTypeDefinition>;
}

export interface ModListResponse {
  mods: ModSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModSearchParams {
  query?: string;
  category?: string;
  sort?: 'downloads' | 'rating' | 'recent' | 'name';
  page?: number;
  limit?: number;
}

/**
 * Service de gestion des mods
 */
class ModService {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();

  /**
   * Récupère la liste des mods depuis l'API
   */
  async listMods(params: ModSearchParams = {}): Promise<ModListResponse> {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.set('q', params.query);
    if (params.category) queryParams.set('category', params.category);
    if (params.sort) queryParams.set('sort', params.sort);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const url = `${API_BASE_URL}/mods?${queryParams}`;
    
    // Vérifier le cache
    const cached = this.getFromCache<ModListResponse>(url);
    if (cached) return cached;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Platform': 'android',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ModListResponse = await response.json();
      this.setCache(url, data);
      return data;
    } catch (error) {
      console.error('[ModService] Error listing mods:', error);
      
      // Essayer de retourner le cache même expiré
      const staleCache = await this.getStaleCache<ModListResponse>();
      if (staleCache) return staleCache;
      
      throw error;
    }
  }

  /**
   * Récupère les détails d'un mod spécifique
   */
  async getModDetail(name: string): Promise<ModDetail> {
    const url = `${API_BASE_URL}/mods/${encodeURIComponent(name)}`;
    
    const cached = this.getFromCache<ModDetail>(url);
    if (cached) return cached;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Platform': 'android',
        },
      });

      if (response.status === 404) {
        throw new Error(`Mod "${name}" non trouvé`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ModDetail = await response.json();
      this.setCache(url, data);
      return data;
    } catch (error) {
      console.error('[ModService] Error getting mod detail:', error);
      throw error;
    }
  }

  /**
   * Télécharge et installe un mod
   */
  async downloadAndInstallMod(name: string): Promise<InstalledMod> {
    const url = `${API_BASE_URL}/mods/${encodeURIComponent(name)}/download`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Platform': 'android',
        },
      });

      if (response.status === 404) {
        throw new Error(`Mod "${name}" non trouvé`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const modData = await response.json();

      // Créer l'objet InstalledMod
      const installedMod: InstalledMod = {
        name: modData.name,
        displayName: modData.displayName,
        version: modData.version,
        installedAt: new Date().toISOString(),
        mainCode: modData.mainCode,
        manifest: modData.manifest,
        nodeTypes: modData.nodeTypes,
      };

      // Sauvegarder dans le stockage local
      await this.saveInstalledMod(installedMod);

      console.log(`[ModService] Mod "${name}" installed successfully`);
      return installedMod;
    } catch (error) {
      console.error('[ModService] Error downloading mod:', error);
      throw error;
    }
  }

  /**
   * Récupère la liste des mods installés localement
   */
  async getInstalledMods(): Promise<InstalledMod[]> {
    try {
      const data = await AsyncStorage.getItem(INSTALLED_MODS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('[ModService] Error reading installed mods:', error);
      return [];
    }
  }

  /**
   * Vérifie si un mod est installé
   */
  async isModInstalled(name: string): Promise<boolean> {
    const mods = await this.getInstalledMods();
    return mods.some(m => m.name === name);
  }

  /**
   * Récupère un mod installé par son nom
   */
  async getInstalledMod(name: string): Promise<InstalledMod | null> {
    const mods = await this.getInstalledMods();
    return mods.find(m => m.name === name) || null;
  }

  /**
   * Sauvegarde un mod installé
   */
  private async saveInstalledMod(mod: InstalledMod): Promise<void> {
    try {
      const mods = await this.getInstalledMods();
      
      // Supprimer l'ancienne version si elle existe
      const filtered = mods.filter(m => m.name !== mod.name);
      filtered.push(mod);
      
      await AsyncStorage.setItem(INSTALLED_MODS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('[ModService] Error saving installed mod:', error);
      throw error;
    }
  }

  /**
   * Désinstalle un mod
   */
  async uninstallMod(name: string): Promise<void> {
    try {
      const mods = await this.getInstalledMods();
      const filtered = mods.filter(m => m.name !== name);
      await AsyncStorage.setItem(INSTALLED_MODS_KEY, JSON.stringify(filtered));
      console.log(`[ModService] Mod "${name}" uninstalled`);
    } catch (error) {
      console.error('[ModService] Error uninstalling mod:', error);
      throw error;
    }
  }

  /**
   * Vérifie les mises à jour disponibles pour les mods installés
   */
  async checkForUpdates(): Promise<Array<{ mod: InstalledMod; latestVersion: string }>> {
    const updates: Array<{ mod: InstalledMod; latestVersion: string }> = [];
    
    try {
      const installedMods = await this.getInstalledMods();
      
      for (const mod of installedMods) {
        try {
          const remoteDetail = await this.getModDetail(mod.name);
          if (this.isNewerVersion(remoteDetail.version, mod.version)) {
            updates.push({ mod, latestVersion: remoteDetail.version });
          }
        } catch {
          // Ignorer les erreurs pour les mods individuels
          console.warn(`[ModService] Could not check update for ${mod.name}`);
        }
      }
    } catch (error) {
      console.error('[ModService] Error checking for updates:', error);
    }
    
    return updates;
  }

  /**
   * Met à jour un mod vers la dernière version
   */
  async updateMod(name: string): Promise<InstalledMod> {
    return this.downloadAndInstallMod(name);
  }

  /**
   * Récupère tous les nodeTypes des mods installés
   */
  async getAllInstalledNodeTypes(): Promise<Record<string, NodeTypeDefinition>> {
    const mods = await this.getInstalledMods();
    const allNodeTypes: Record<string, NodeTypeDefinition> = {};
    
    for (const mod of mods) {
      for (const [key, nodeType] of Object.entries(mod.nodeTypes)) {
        // Préfixer avec le nom du mod pour éviter les conflits
        allNodeTypes[`${mod.name}/${key}`] = nodeType;
      }
    }
    
    return allNodeTypes;
  }

  // === Utilitaires de cache ===

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async getStaleCache<T>(): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(MODS_CACHE_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // Ignorer
    }
    return null;
  }

  /**
   * Compare deux versions semver
   */
  private isNewerVersion(remote: string, local: string): boolean {
    const remoteParts = remote.split('.').map(Number);
    const localParts = local.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      const r = remoteParts[i] || 0;
      const l = localParts[i] || 0;
      if (r > l) return true;
      if (r < l) return false;
    }
    
    return false;
  }

  /**
   * Nettoie le cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton
export const modService = new ModService();
export default modService;
