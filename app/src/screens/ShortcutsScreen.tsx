/*
  ShortcutsScreen - Écran des raccourcis utilisateur
  Écran simple listant des raccourcis (placeholder pour l'instant).
*/

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useGraphStorage } from '../hooks/useGraphStorage';
import { parseDrawflowGraph } from '../engine/engine';

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
            {saves.map((save) => (
              <View
                key={save.id}
                style={{
                  width: '48%',
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 10,
                  height: 120,
                  backgroundColor: theme.colors.backgroundSecondary,
                  elevation: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 28,
                  }}
                >
                  <TouchableOpacity
                    style={{ padding: 6 }}
                    onPress={() => {
                      // Open NodeEditor with this save pre-selected
                      setCurrentSaveId(save.id);
                      navigation?.navigate('NodeEditor', { openSaveId: save.id });
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="edit" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                  {(() => {
                    // Determine whether this save has at least one trigger node
                    let hasTrigger = false;
                    try {
                      const graph = parseDrawflowGraph(save.data);
                      hasTrigger = Array.from(graph.nodes.values()).some(
                        (n) => n.type === 'input.trigger'
                      );
                    } catch (e) {
                      // If parsing fails, assume no trigger (safe default)
                      hasTrigger = false;
                    }

                    return (
                      <TouchableOpacity
                        style={{ padding: 6, borderRadius: 6, opacity: hasTrigger ? 1 : 0.4 }}
                        onPress={() => {
                          if (!hasTrigger) return;
                          /* play/stop placeholder */
                        }}
                        activeOpacity={hasTrigger ? 0.7 : 1}
                        disabled={!hasTrigger}
                        accessibilityLabel={
                          hasTrigger
                            ? 'Exécuter le raccourci'
                            : 'Exécution désactivée (aucun trigger)'
                        }
                        accessibilityState={{ disabled: !hasTrigger }}
                      >
                        <Icon
                          name="play-arrow"
                          size={20}
                          color={hasTrigger ? theme.colors.text : theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    );
                  })()}
                </View>

                <View
                  style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: theme.colors.border,
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      borderRadius: 6,
                      width: `${Math.round(((save as any).progress || 0) * 100)}%`,
                      backgroundColor: theme.colors.primary,
                    }}
                  />
                </View>

                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
                    {save.name}
                  </Text>
                </View>

                {/* Trash button: bottom-right corner */}
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    padding: 6,
                    borderRadius: 6,
                  }}
                  onPress={async () => {
                    try {
                      await deleteSave(save.id);
                    } catch (e) {
                      // noop - deleteSave will handle errors/confirmation
                    }
                  }}
                  accessibilityLabel={`Supprimer le raccourci ${save.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={18} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

ShortcutsScreen.displayName = 'ShortcutsScreen';

// Styles are computed inline via useMemo to avoid using StyleSheet

export default ShortcutsScreen;
