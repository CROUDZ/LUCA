/**
 * ModLibraryScreen - Écran de la bibliothèque de mods
 * Affiche tous les mods disponibles depuis le serveur
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';
import { useTheme } from '../theme';
import { modStorage } from '../utils/modStorage';
import { logger } from '../utils/logger';

// Configuration de l'API
// Pour appareil physique : utiliser l'IP locale du réseau (ex: 192.168.1.83)
// Pour émulateur Android : utiliser 10.0.2.2
// Pour iOS Simulator : utiliser localhost
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.83:3000' // IP locale pour appareil physique
  : 'https://luca-mods.vercel.app'; // Production URL

type ModLibraryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ModLibrary'>;

interface ModLibraryScreenProps {
  navigation: ModLibraryScreenNavigationProp;
}

interface Mod {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  iconUrl: string | null;
  downloads: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  nodeTypes: Record<string, any>;
  mainCode?: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  mods: Mod[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const CATEGORIES = ['All', 'Logic', 'Math', 'Timing', 'Network', 'Device', 'Data', 'UI', 'Other'];

const ModLibraryScreen: React.FC<ModLibraryScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [installedMods, setInstalledMods] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<string | null>(null);

  // Initialiser modStorage et charger les mods installés
  useEffect(() => {
    const initModStorage = async () => {
      await modStorage.initialize();
      const installed = modStorage.getAllInstalledMods();
      setInstalledMods(new Set(installed.map((m) => m.name)));
    };
    initModStorage();
  }, []);

  const fetchMods = useCallback(
    async (pageNum: number = 1, refresh: boolean = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else if (pageNum === 1) {
          setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
          sort: 'downloads',
        });

        if (searchQuery) {
          params.append('query', searchQuery);
        }
        if (selectedCategory !== 'All') {
          params.append('category', selectedCategory);
        }

        const response = await fetch(`${API_BASE_URL}/api/mods?${params}`);

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}`);
        }

        const data: ApiResponse = await response.json();

        if (pageNum === 1 || refresh) {
          setMods(data.mods);
        } else {
          setMods((prev) => [...prev, ...data.mods]);
        }

        setHasMore(data.pagination.page < data.pagination.pages);
        setPage(pageNum);
      } catch (err) {
        logger.error('Error fetching mods:', err);
        setError(err instanceof Error ? err.message : 'Erreur de connexion');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, selectedCategory]
  );

  useEffect(() => {
    fetchMods(1);
  }, [selectedCategory]);

  const handleRefresh = useCallback(() => {
    fetchMods(1, true);
  }, [fetchMods]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMods(page + 1);
    }
  }, [loading, hasMore, page, fetchMods]);

  const handleSearch = useCallback(() => {
    fetchMods(1);
  }, [fetchMods]);

  const handleInstallMod = useCallback(
    async (mod: Mod) => {
      const isInstalled = installedMods.has(mod.name);

      if (isInstalled) {
        // Mod déjà installé - proposer de désinstaller
        Alert.alert(
          'Mod déjà installé',
          `"${mod.displayName}" est déjà installé. Voulez-vous le désinstaller ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Désinstaller',
              style: 'destructive',
              onPress: async () => {
                try {
                  setInstalling(mod.name);
                  await modStorage.uninstallMod(mod.name);
                  setInstalledMods((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(mod.name);
                    return newSet;
                  });
                  Alert.alert('Succès', `${mod.displayName} a été désinstallé !`);
                } catch (err) {
                  Alert.alert('Erreur', 'Impossible de désinstaller le mod');
                } finally {
                  setInstalling(null);
                }
              },
            },
          ]
        );
      } else {
        // Fonction d'installation du mod
        const proceedWithInstall = async () => {
          try {
            setInstalling(mod.name);

            // Récupérer les détails complets du mod (avec le code)
            const detailResponse = await fetch(`${API_BASE_URL}/api/mods/${mod.name}`);
            if (!detailResponse.ok) {
              throw new Error('Impossible de récupérer le mod');
            }
            const modDetails = await detailResponse.json();

            // Installer le mod localement
            const success = await modStorage.installMod({
              id: mod.id,
              name: mod.name,
              displayName: mod.displayName,
              description: mod.description,
              version: mod.version,
              category: mod.category,
              author: mod.author,
              nodeTypes: modDetails.nodeTypes || {},
              mainCode: modDetails.mainCode,
            });

            if (success) {
              setInstalledMods((prev) => new Set([...prev, mod.name]));
              Alert.alert(
                'Succès',
                `${mod.displayName} a été installé !\n\nLes nouveaux nodes sont disponibles dans la catégorie "Mods/${mod.displayName}".`
              );
            } else {
              throw new Error("Échec de l'installation");
            }
          } catch (err) {
            Alert.alert('Erreur', "Impossible d'installer le mod");
          } finally {
            setInstalling(null);
          }
        };

        // Vérifier si le mod est vérifié
        if (!mod.verified) {
          // Alerte pour mod non vérifié
          Alert.alert(
            '⚠️ Mod non vérifié',
            `Ce mod n'a pas encore été vérifié par notre équipe.\n\n` +
              `L'installation de mods non vérifiés peut présenter des risques pour la sécurité de vos données.\n\n` +
              `Voulez-vous quand même installer "${mod.displayName}" ?`,
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Installer quand même',
                style: 'destructive',
                onPress: proceedWithInstall,
              },
            ]
          );
        } else {
          // Mod vérifié - demander confirmation normale
          Alert.alert('Installer le mod', `Voulez-vous installer "${mod.displayName}" ?`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Installer',
              onPress: proceedWithInstall,
            },
          ]);
        }
      }
    },
    [installedMods]
  );

  const renderModCard = useCallback(
    ({ item }: { item: Mod }) => {
      const isInstalled = installedMods.has(item.name);
      const isCurrentlyInstalling = installing === item.name;

      return (
        <TouchableOpacity
          style={[styles.modCard, isInstalled && styles.modCardInstalled]}
          onPress={() => handleInstallMod(item)}
          activeOpacity={0.7}
          disabled={isCurrentlyInstalling}
        >
          <View style={styles.modIconContainer}>
            <View style={[styles.modIcon, isInstalled && styles.modIconInstalled]}>
              <Icon
                name={isInstalled ? 'check-circle' : 'extension'}
                size={32}
                color={isInstalled ? theme.colors.success : theme.colors.primary}
              />
            </View>
            {item.verified ? (
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={14} color="#fff" />
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Icon name="warning" size={14} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.modInfo}>
            <View style={styles.modNameRow}>
              <Text style={styles.modName} numberOfLines={1}>
                {item.displayName}
              </Text>
              {isInstalled && (
                <View style={styles.installedBadge}>
                  <Text style={styles.installedBadgeText}>Installé</Text>
                </View>
              )}
              {!item.verified && (
                <View style={styles.unverifiedTextBadge}>
                  <Text style={styles.unverifiedBadgeText}>Non vérifié</Text>
                </View>
              )}
            </View>
            <Text style={styles.modAuthor} numberOfLines={1}>
              par {item.author.name}
            </Text>
            <Text style={styles.modDescription} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.modMeta}>
              <View style={styles.metaItem}>
                <Icon name="file-download" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{item.downloads}</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="star" size={14} color="#FFD700" />
                <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.installButton,
              isInstalled && styles.uninstallButton,
              isCurrentlyInstalling && styles.installingButton,
            ]}
            onPress={() => handleInstallMod(item)}
            disabled={isCurrentlyInstalling}
          >
            {isCurrentlyInstalling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name={isInstalled ? 'delete' : 'download'} size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [styles, theme.colors, handleInstallMod, installedMods, installing]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des mods..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              fetchMods(1);
            }}
          >
            <Icon name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres par catégorie */}
      <FlatList
        horizontal
        data={CATEGORIES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === item && styles.categoryChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="inbox" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>Aucun mod trouvé</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory !== 'All'
          ? 'Essayez de modifier vos filtres'
          : 'La bibliothèque est vide pour le moment'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Icon name="error-outline" size={64} color={theme.colors.error} />
      <Text style={styles.errorTitle}>Erreur de connexion</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchMods(1)}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header avec titre et bouton retour */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Bibliothèque de Mods</Text>
        <View style={styles.placeholder} />
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={mods}
          renderItem={renderModCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmpty : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && mods.length > 0 ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={styles.loadingMore}
              />
            ) : null
          }
        />
      )}

      {loading && mods.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement des mods...</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 16,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    placeholder: {
      width: 40,
    },
    header: {
      paddingBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginHorizontal: 16,
      marginTop: 16,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      color: colors.text,
    },
    categoriesContainer: {
      paddingHorizontal: 12,
      paddingTop: 16,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    categoryChipTextActive: {
      color: '#fff',
    },
    listContent: {
      paddingBottom: 100,
    },
    modCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    modCardInstalled: {
      borderColor: colors.success,
      backgroundColor: colors.surface,
    },
    modIconContainer: {
      position: 'relative',
    },
    modIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modIconInstalled: {
      backgroundColor: colors.success + '20',
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    unverifiedBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FF9800',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    modInfo: {
      flex: 1,
      marginLeft: 16,
    },
    modNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    modName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    installedBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    installedBadgeText: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '600',
    },
    unverifiedTextBadge: {
      backgroundColor: '#FF9800',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    unverifiedBadgeText: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '600',
    },
    modAuthor: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    modDescription: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: 8,
    },
    modMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    categoryBadge: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    categoryText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: '600',
    },
    installButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },
    uninstallButton: {
      backgroundColor: colors.error,
    },
    installingButton: {
      backgroundColor: colors.textMuted,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    errorSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 24,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    loadingMore: {
      paddingVertical: 20,
    },
  });

export default ModLibraryScreen;
