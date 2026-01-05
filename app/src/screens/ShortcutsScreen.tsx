/*
  ShortcutsScreen - Écran des raccourcis utilisateur
  Écran simple listant des raccourcis (placeholder pour l'instant).
*/

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useGraphStorage } from '../hooks/useGraphStorage';
import { parseDrawflowGraph, executeGraph } from '../engine/engine';
import LinearGradient from 'react-native-linear-gradient';
import {
  initializeSignalSystem,
  resetSignalSystem,
} from '../engine/SignalSystem';
import { triggerNode } from '../engine/nodes';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';
import { useTheme } from '../theme';

type ShortcutsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Shortcuts'>;

interface ShortcutsScreenProps {
  navigation?: ShortcutsScreenNavigationProp;
}

const ShortcutsScreen: React.FC<ShortcutsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  // Styles inlined directly in JSX elements so they respond immediately to the theme

  const { saves, isLoading, createSave, deleteSave, setCurrentSaveId } = useGraphStorage();
  const [modalVisible, setModalVisible] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeShortcutId, setActiveShortcutId] = useState<string | null>(null);
  const [activeTriggerNodeId, setActiveTriggerNodeId] = useState<number | null>(null);

  // Fonction pour démarrer/arrêter un raccourci
  const handleToggleShortcut = useCallback(
    async (saveId: string, saveData: any) => {
      // Si ce raccourci est déjà actif, on l'arrête
      if (activeShortcutId === saveId) {
        if (activeTriggerNodeId !== null) {
          triggerNode(activeTriggerNodeId, { timestamp: Date.now(), source: 'shortcut-button' }, { state: 'stop' });
        }
        resetSignalSystem();
        setActiveShortcutId(null);
        setActiveTriggerNodeId(null);
        return;
      }

      // Si un autre raccourci est actif, on l'arrête d'abord
      if (activeShortcutId !== null && activeTriggerNodeId !== null) {
        triggerNode(activeTriggerNodeId, { timestamp: Date.now(), source: 'shortcut-button' }, { state: 'stop' });
        resetSignalSystem();
      }

      try {
        // Parser et initialiser le graphe
        const graph = parseDrawflowGraph(saveData);
        initializeSignalSystem(graph);

        // Exécuter le graphe (initialise les handlers de chaque node)
        await executeGraph(graph);

        // Trouver le/les trigger nodes
        const triggerNodes = Array.from(graph.nodes.values()).filter(
          (n) => n.type === 'input.trigger'
        );

        if (triggerNodes.length > 0) {
          const triggerId = triggerNodes[0].id;
          setActiveShortcutId(saveId);
          setActiveTriggerNodeId(triggerId);

          // Déclencher le trigger
          triggerNode(triggerId, { timestamp: Date.now(), source: 'shortcut-button' }, { state: 'start' });
        }
      } catch (e) {
        console.error('Erreur lors du démarrage du raccourci:', e);
        resetSignalSystem();
        setActiveShortcutId(null);
        setActiveTriggerNodeId(null);
      }
    },
    [activeShortcutId, activeTriggerNodeId]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.backgroundSecondary,
        }}
      >
        <TouchableOpacity
          style={{ padding: 8, marginRight: 12 }}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>
            Raccourcis
          </Text>
        </View>

        <TouchableOpacity
          style={{ padding: 8, marginLeft: 12 }}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Ajouter un raccourci"
        >
          <Icon name="add" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 16,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Créer un raccourci
              </Text>

              <TextInput
                placeholder="Nom du raccourci"
                placeholderTextColor={theme.colors.textSecondary}
                value={newShortcutName}
                onChangeText={setNewShortcutName}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 8,
                  padding: 10,
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
                accessibilityLabel="Nom du raccourci"
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }}
                  onPress={() => {
                    setModalVisible(false);
                    setNewShortcutName('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: theme.colors.textSecondary }}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 8,
                  }}
                  onPress={async () => {
                    if (!newShortcutName.trim()) return;
                    setIsCreating(true);
                    const emptyDrawflow = { drawflow: { Home: { data: {} } } } as any;
                    try {
                      const created = await createSave(newShortcutName.trim(), emptyDrawflow);
                      // Optionally select the created save
                      if (created && (created as any).id) {
                        setCurrentSaveId((created as any).id);
                      }
                      setModalVisible(false);
                      setNewShortcutName('');
                    } catch (e) {
                      // noop - keep non-blocking for now
                    } finally {
                      setIsCreating(false);
                    }
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel="Créer le raccourci"
                >
                  {isCreating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Créer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      <View style={{ flex: 1, padding: 12 }}>
        {saves.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textSecondary }}>Aucun raccourci disponible.</Text>
          </View>
        ) : isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textSecondary }}>Chargement des raccourcis...</Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            {saves.map((save) => {
              // Determine whether this save has at least one trigger node
              let hasTrigger = false;
              try {
                const graph = parseDrawflowGraph(save.data);
                hasTrigger = Array.from(graph.nodes.values()).some(
                  (n) => n.type === 'input.trigger'
                );
              } catch (e) {
                hasTrigger = false;
              }

              const isActive = activeShortcutId === save.id;
              const isOtherActive = activeShortcutId !== null && activeShortcutId !== save.id;
              const isDisabled = !hasTrigger || isOtherActive;

              return (
                <View
                  key={save.id}
                  style={{
                    width: '48%',
                    marginBottom: 12,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: theme.colors.backgroundSecondary,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  {/* Header avec icône et actions */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 16,
                    }}
                  >
                    {/* Actions: edit et delete */}
                    <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-between', flex: 1 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentSaveId(save.id);
                          navigation?.navigate('NodeEditor', { openSaveId: save.id });
                        }}
                        activeOpacity={0.7}
                      >
                        <Icon name="edit" size={22} color={theme.colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await deleteSave(save.id);
                          } catch (e) {
                            // noop
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Icon name="delete" size={22} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Nom du raccourci */}
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 16,
                      fontWeight: '700',
                      marginBottom: 12,
                    }}
                    numberOfLines={2}
                  >
                    {save.name}
                  </Text>

                  {/* Footer: statut + bouton play/stop */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                    }}
                  >
                    {/* Statut */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: isActive
                            ? '#4ade80'
                            : isOtherActive
                            ? '#f59e0b'
                            : hasTrigger
                            ? theme.colors.textSecondary
                            : '#ef4444',
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.colors.textSecondary,
                          fontWeight: '500',
                        }}
                      >
                        {isActive ? 'Actif' : isOtherActive ? 'Autre actif' : hasTrigger ? 'Prêt' : 'Pas de trigger'}
                      </Text>
                    </View>

                    {/* Bouton Play/Stop */}
                    <TouchableOpacity
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        
                      }}
                      onPress={() => {
                        if (isDisabled) return;
                        handleToggleShortcut(save.id, save.data);
                      }}
                      activeOpacity={isDisabled ? 1 : 0.7}
                      disabled={isDisabled}
                    >
                      <LinearGradient
                        colors={[theme.colors.secondarySoft, theme.colors.primarySoft]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                            backgroundColor: isActive
                            ? '#ef4444'
                            : isDisabled
                            ? theme.colors.border
                            : theme.colors.primary,
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: isDisabled && !isActive ? 0.5 : 1,
                        }}>
                      <Icon
                        name={isActive ? 'stop' : 'play-arrow'}
                        size={36}
                        color="#fff"
                      />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

ShortcutsScreen.displayName = 'ShortcutsScreen';

// Styles are computed inline via useMemo to avoid using StyleSheet

export default ShortcutsScreen;
