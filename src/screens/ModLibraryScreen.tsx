/**
 * Écran de bibliothèque de mods
 * Permet aux utilisateurs de parcourir, installer et gérer les mods
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useModList, useInstalledMods } from '../hooks/useMods';
import { ModSummary } from '../services/ModService';

type TabType = 'browse' | 'installed';

const CATEGORIES = ['All', 'Logic', 'Math', 'Timing', 'Network', 'Device', 'Data', 'UI', 'Other'];

export default function ModLibraryScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Hooks pour les mods
  const {
    mods: remoteMods,
    loading: loadingRemote,
    error: remoteError,
    refresh: refreshRemote,
    loadMore,
    search,
  } = useModList({ limit: 20 });

  const {
    mods: installedMods,
    loading: loadingInstalled,
    refresh: refreshInstalled,
    install,
    uninstall,
    isInstalled,
    installing,
  } = useInstalledMods();

  // Recherche avec debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    search({
      query: query || undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
    });
  }, [search, selectedCategory]);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
    search({
      query: searchQuery || undefined,
      category: category !== 'All' ? category : undefined,
    });
  }, [search, searchQuery]);

  const handleInstall = useCallback(async (mod: ModSummary) => {
    try {
      await install(mod.name);
      Alert.alert('Succès', `${mod.displayName} a été installé !`);
    } catch (error) {
      Alert.alert('Erreur', `Impossible d'installer ${mod.displayName}`);
    }
  }, [install]);

  const handleUninstall = useCallback(async (name: string, displayName: string) => {
    Alert.alert(
      'Désinstaller',
      `Voulez-vous vraiment désinstaller ${displayName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désinstaller',
          style: 'destructive',
          onPress: async () => {
            try {
              await uninstall(name);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de désinstaller le mod');
            }
          },
        },
      ]
    );
  }, [uninstall]);

  // Rendu d'un mod dans la liste
  const renderModItem = useCallback(({ item }: { item: ModSummary }) => {
    const installed = isInstalled(item.name);
    const isCurrentlyInstalling = installing === item.name;

    return (
      <View style={styles.modCard}>
        <View style={styles.modHeader}>
          <Text style={styles.modName}>{item.displayName}</Text>
          <Text style={styles.modVersion}>v{item.version}</Text>
        </View>
        <Text style={styles.modDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.modMeta}>
          <View style={styles.modTags}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.modStats}>
            <Text style={styles.statText}>⬇️ {item.downloads}</Text>
            <Text style={styles.statText}>⭐ {item.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.modActions}>
          <Text style={styles.authorText}>Par {item.author.name}</Text>
          {isCurrentlyInstalling ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : installed ? (
            <TouchableOpacity
              style={styles.uninstallButton}
              onPress={() => handleUninstall(item.name, item.displayName)}
            >
              <Text style={styles.uninstallButtonText}>Désinstaller</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.installButton}
              onPress={() => handleInstall(item)}
            >
              <Text style={styles.installButtonText}>Installer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [isInstalled, installing, handleInstall, handleUninstall]);

  // Rendu d'un mod installé
  const renderInstalledItem = useCallback(({ item }) => {
    return (
      <View style={styles.modCard}>
        <View style={styles.modHeader}>
          <Text style={styles.modName}>{item.displayName}</Text>
          <Text style={styles.modVersion}>v{item.version}</Text>
        </View>
        <Text style={styles.installedDate}>
          Installé le {new Date(item.installedAt).toLocaleDateString('fr-FR')}
        </Text>
        <Text style={styles.nodeCount}>
          {Object.keys(item.nodeTypes).length} node(s) disponible(s)
        </Text>
        <View style={styles.modActions}>
          <TouchableOpacity
            style={styles.uninstallButton}
            onPress={() => handleUninstall(item.name, item.displayName)}
          >
            <Text style={styles.uninstallButtonText}>Désinstaller</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleUninstall]);

  const renderEmptyBrowse = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyText}>Aucun mod trouvé</Text>
      <Text style={styles.emptySubtext}>Essayez de modifier votre recherche</Text>
    </View>
  );

  const renderEmptyInstalled = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyText}>Aucun mod installé</Text>
      <Text style={styles.emptySubtext}>
        Parcourez la bibliothèque pour installer des mods
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bibliothèque de Mods</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Explorer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'installed' && styles.activeTab]}
          onPress={() => setActiveTab('installed')}
        >
          <Text style={[styles.tabText, activeTab === 'installed' && styles.activeTabText]}>
            Installés ({installedMods.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'browse' ? (
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher des mods..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {/* Categories */}
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesList}
            contentContainerStyle={styles.categoriesContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === item && styles.categoryButtonActive,
                ]}
                onPress={() => handleCategorySelect(item)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === item && styles.categoryButtonTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Mod List */}
          {remoteError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{remoteError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refreshRemote}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={remoteMods}
              keyExtractor={(item) => item.name}
              renderItem={renderModItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={loadingRemote ? null : renderEmptyBrowse}
              refreshControl={
                <RefreshControl
                  refreshing={loadingRemote}
                  onRefresh={refreshRemote}
                  tintColor="#3B82F6"
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
            />
          )}
        </>
      ) : (
        /* Installed Mods */
        <FlatList
          data={installedMods}
          keyExtractor={(item) => item.name}
          renderItem={renderInstalledItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={loadingInstalled ? null : renderEmptyInstalled}
          refreshControl={
            <RefreshControl
              refreshing={loadingInstalled}
              onRefresh={refreshInstalled}
              tintColor="#3B82F6"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  categoriesList: {
    maxHeight: 44,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  modCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  modVersion: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 20,
  },
  modMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryTagText: {
    color: '#60A5FA',
    fontSize: 12,
  },
  modStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    color: '#6B7280',
    fontSize: 12,
  },
  modActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  authorText: {
    color: '#6B7280',
    fontSize: 12,
  },
  installButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  installButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  uninstallButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uninstallButtonText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 14,
  },
  installedDate: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  nodeCount: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#F87171',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
