/**
 * NodeEditorScreen - Écran d'édition de graphe nodal
 * Charge NodeEditorWeb.html depuis android/app/src/main/assets/
 * Communication bidirectionnelle via postMessage
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome6';

// Import example graph
import exampleGraph from '../../exampleGraph.json';

const STORAGE_KEY = '@node_editor_saves';

interface SavedGraph {
  id: string;
  name: string;
  data: any;
  timestamp: number;
}

interface NodeType {
  id: string;
  name: string;
  icon: string;
  iconFamily: 'material' | 'fontawesome';
  description: string;
}

const NODE_TYPES: NodeType[] = [
  { id: 'texture', name: 'Texture', icon: 'image', iconFamily: 'material', description: 'Image texture node' },
  { id: 'mix', name: 'Mix', icon: 'palette', iconFamily: 'material', description: 'Mix two inputs' },
  { id: 'color', name: 'Color', icon: 'color-lens', iconFamily: 'material', description: 'Color input' },
  { id: 'math', name: 'Math', icon: 'calculator', iconFamily: 'fontawesome', description: 'Mathematical operation' },
  { id: 'output', name: 'Output', icon: 'output', iconFamily: 'material', description: 'Final output node' },
];

const NodeEditorScreen: React.FC = () => {
  const webRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [saves, setSaves] = useState<SavedGraph[]>([]);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [newSaveName, setNewSaveName] = useState('');
  const [showNewSaveInput, setShowNewSaveInput] = useState(false);

  // URI du fichier HTML local (Android uniquement)
  const htmlUri = 'file:///android_asset/NodeEditorWeb.html';

  // Charger les sauvegardes au démarrage
  useEffect(() => {
    loadSaves();
  }, []);

  // Charger toutes les sauvegardes depuis AsyncStorage
  const loadSaves = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        setSaves(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('❌ Error loading saves:', error);
    }
  };

  // Sauvegarder toutes les sauvegardes dans AsyncStorage
  const savesToStorage = async (newSaves: SavedGraph[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSaves));
      setSaves(newSaves);
    } catch (error) {
      console.error('❌ Error saving to storage:', error);
      Alert.alert('Error', 'Failed to save data');
    }
  };

  // Réception des messages depuis WebView
  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message from WebView:', message.type);

      switch (message.type) {
        case 'READY':
          setIsReady(true);
          console.log('✅ WebView ready');
          // Charger la dernière sauvegarde automatiquement si elle existe
          if (currentSaveId) {
            const save = saves.find(s => s.id === currentSaveId);
            if (save) {
              loadGraph(save.data);
            }
          }
          break;

        case 'EXPORT':
          // Réponse à une demande d'export, sauvegarder automatiquement
          handleAutoSave(message.payload);
          break;

        case 'IMPORTED':
          console.log('✅ Graph imported successfully');
          break;

        case 'REQUEST_IMPORT':
          // WebView demande un import, charger l'exemple
          loadExampleGraph();
          break;

        default:
          console.warn('⚠️ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error);
    }
  };

  // Envoyer un message à la WebView
  const sendMessage = (message: any) => {
    if (webRef.current && isReady) {
      webRef.current.postMessage(JSON.stringify(message));
      console.log('📤 Sent to WebView:', message.type);
    } else {
      console.warn('⚠️ WebView not ready');
    }
  };

  // Charger le graphe d'exemple
  const loadExampleGraph = () => {
    loadGraph(exampleGraph);
  };

  // Charger un graphe dans la WebView
  const loadGraph = (graphData: any) => {
    sendMessage({
      type: 'LOAD_GRAPH',
      payload: graphData,
    });
  };

  // Sauvegarder automatiquement si une sauvegarde est active
  const handleAutoSave = async (graphData: any) => {
    if (currentSaveId) {
      const updatedSaves = saves.map(save =>
        save.id === currentSaveId
          ? { ...save, data: graphData, timestamp: Date.now() }
          : save
      );
      await savesToStorage(updatedSaves);
      console.log('💾 Auto-saved to:', currentSaveId);
    } else {
      console.log('💾 Graph exported (no active save)');
    }
  };

  // Créer une nouvelle sauvegarde
  const createNewSave = async () => {
    if (!newSaveName.trim()) {
      Alert.alert('Error', 'Please enter a name for the save');
      return;
    }

    // Demander l'export du graphe actuel
    sendMessage({ type: 'REQUEST_EXPORT', payload: {} });

    // Attendre un peu pour recevoir les données
    setTimeout(async () => {
      const newSave: SavedGraph = {
        id: Date.now().toString(),
        name: newSaveName.trim(),
        data: exampleGraph, // Sera remplacé par les vraies données
        timestamp: Date.now(),
      };

      const updatedSaves = [...saves, newSave];
      await savesToStorage(updatedSaves);
      setCurrentSaveId(newSave.id);
      setNewSaveName('');
      setShowNewSaveInput(false);
      Alert.alert('Success', `Save "${newSave.name}" created!`);
    }, 300);
  };

  // Charger une sauvegarde
  const loadSave = (save: SavedGraph) => {
    loadGraph(save.data);
    setCurrentSaveId(save.id);
    setShowSaveMenu(false);
    Alert.alert('Loaded', `Loaded "${save.name}"`);
  };

  // Supprimer une sauvegarde
  const deleteSave = async (saveId: string) => {
    Alert.alert(
      'Delete Save',
      'Are you sure you want to delete this save?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedSaves = saves.filter(s => s.id !== saveId);
            await savesToStorage(updatedSaves);
            if (currentSaveId === saveId) {
              setCurrentSaveId(null);
            }
          },
        },
      ]
    );
  };

  // Sauvegarder manuellement
  const saveCurrentGraph = () => {
    sendMessage({ type: 'REQUEST_EXPORT', payload: {} });
    Alert.alert('Saved', 'Graph saved successfully!');
  };

  // Ajouter un nœud avec paramètres
  const addCustomNode = (nodeType: string) => {
    sendMessage({
      type: 'ADD_NODE',
      payload: {
        nodeType,
        x: Math.random() * 300 + 50,
        y: Math.random() * 200 + 50,
        data: { type: nodeType },
      },
    });
  };

  // Ajouter un nœud depuis le picker
  const addNodeFromPicker = (nodeType: string) => {
    addCustomNode(nodeType);
    setShowNodePicker(false);
  };

  // Effacer le graphe
  const clearGraph = () => {
    Alert.alert(
      'Clear Graph',
      'Are you sure you want to clear the graph?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            sendMessage({ type: 'CLEAR', payload: {} });
            setCurrentSaveId(null);
          },
        },
      ]
    );
  };

  // Formater la date de sauvegarde
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* WebView avec éditeur nodal */}
      <WebView
        ref={webRef}
        source={{ uri: htmlUri }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView error:', nativeEvent);
        }}
        onLoad={() => console.log('📄 WebView loaded')}
      />

      {/* Contrôles React Native */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, !isReady && styles.buttonDisabled]}
          onPress={() => setShowSaveMenu(true)}
          disabled={!isReady}>
          <Icon name="save" size={16} color="#8b5cf6" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Saves</Text>
        </TouchableOpacity>

        {currentSaveId && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess, !isReady && styles.buttonDisabled]}
            onPress={saveCurrentGraph}
            disabled={!isReady}>
            <Icon name="check" size={16} color="#10b981" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, !isReady && styles.buttonDisabled]}
          onPress={clearGraph}
          disabled={!isReady}>
          <Icon name="delete-outline" size={16} color="#ef4444" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Bouton flottant pour ajouter des nœuds */}
      <TouchableOpacity
        style={[styles.fabButton, !isReady && styles.fabButtonDisabled]}
        onPress={() => setShowNodePicker(true)}
        disabled={!isReady}>
        <Icon name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* Indicateur de statut */}
      <View style={styles.status}>
        <View style={styles.statusRow}>
          <Icon 
            name={isReady ? 'check-circle' : 'sync'} 
            size={14} 
            color={isReady ? '#10b981' : '#9ca3af'} 
          />
          <Text style={[styles.statusText, isReady && styles.statusReady]}>
            {isReady ? 'Ready' : 'Loading...'}
          </Text>
        </View>
        {currentSaveId && (
          <View style={styles.statusRow}>
            <Icon name="folder" size={12} color="#d1d5db" />
            <Text style={styles.currentSaveText}>
              {saves.find(s => s.id === currentSaveId)?.name || 'Untitled'}
            </Text>
          </View>
        )}
      </View>

      {/* Modal Node Picker */}
      <Modal
        visible={showNodePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowNodePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.nodePickerContent}>
            <View style={styles.modalTitleRow}>
              <Icon name="add-circle-outline" size={28} color="#8b5cf6" />
              <Text style={styles.modalTitle}>Add Node</Text>
            </View>
            <Text style={styles.nodePickerSubtitle}>Select a node type to add</Text>

            <ScrollView style={styles.nodeTypesList}>
              {NODE_TYPES.map((nodeType) => (
                <TouchableOpacity
                  key={nodeType.id}
                  style={styles.nodeTypeItem}
                  onPress={() => addNodeFromPicker(nodeType.id)}>
                  <View style={styles.nodeTypeIconContainer}>
                    {nodeType.iconFamily === 'material' ? (
                      <Icon name={nodeType.icon} size={32} color="#8b5cf6" />
                    ) : (
                      <FAIcon name={nodeType.icon} size={28} color="#8b5cf6" />
                    )}
                  </View>
                  <View style={styles.nodeTypeInfo}>
                    <Text style={styles.nodeTypeName}>{nodeType.name}</Text>
                    <Text style={styles.nodeTypeDescription}>{nodeType.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#6b7280" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closePickerButton}
              onPress={() => setShowNodePicker(false)}>
              <Text style={styles.closePickerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu de gestion des sauvegardes */}
      <Modal
        visible={showSaveMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSaveMenu(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleRow}>
              <Icon name="save" size={28} color="#8b5cf6" />
              <Text style={styles.modalTitle}>Save Manager</Text>
            </View>

            {/* Bouton nouvelle sauvegarde */}
            {!showNewSaveInput ? (
              <TouchableOpacity
                style={styles.newSaveButton}
                onPress={() => setShowNewSaveInput(true)}>
                <Icon name="add" size={20} color="#10b981" style={styles.newSaveIcon} />
                <Text style={styles.newSaveButtonText}>New Save</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.newSaveInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter save name..."
                  placeholderTextColor="#6b7280"
                  value={newSaveName}
                  onChangeText={setNewSaveName}
                  autoFocus
                />
                <View style={styles.inputButtons}>
                  <TouchableOpacity
                    style={[styles.inputButton, styles.inputButtonCancel]}
                    onPress={() => {
                      setShowNewSaveInput(false);
                      setNewSaveName('');
                    }}>
                    <Icon name="close" size={18} color="#9ca3af" />
                    <Text style={styles.inputButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inputButton, styles.inputButtonConfirm]}
                    onPress={createNewSave}>
                    <Icon name="check" size={18} color="#10b981" />
                    <Text style={styles.inputButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Liste des sauvegardes */}
            <ScrollView style={styles.savesList}>
              {saves.length === 0 ? (
                <Text style={styles.emptyText}>No saves yet. Create one to get started!</Text>
              ) : (
                saves.map((save) => (
                  <View
                    key={save.id}
                    style={[
                      styles.saveItem,
                      currentSaveId === save.id && styles.saveItemActive,
                    ]}>
                    <Pressable
                      style={styles.saveItemContent}
                      onPress={() => loadSave(save)}>
                      <View style={styles.saveNameRow}>
                        {currentSaveId === save.id && (
                          <Icon name="check-circle" size={16} color="#8b5cf6" style={styles.checkIcon} />
                        )}
                        <Text style={styles.saveName}>{save.name}</Text>
                      </View>
                      <View style={styles.saveDateRow}>
                        <Icon name="schedule" size={12} color="#9ca3af" />
                        <Text style={styles.saveDate}>{formatDate(save.timestamp)}</Text>
                      </View>
                    </Pressable>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteSave(save.id)}>
                      <Icon name="delete" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Boutons du modal */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  loadExampleGraph();
                  setShowSaveMenu(false);
                }}>
                <Icon name="cloud-download" size={18} color="#3b82f6" style={styles.modalButtonIcon} />
                <Text style={styles.modalButtonText}>Load Example</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonClose]}
                onPress={() => setShowSaveMenu(false)}>
                <Icon name="close" size={18} color="#9ca3af" style={styles.modalButtonIcon} />
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webview: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 25, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonPrimary: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  buttonSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  buttonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(75, 85, 99, 0.1)',
    borderColor: 'rgba(75, 85, 99, 0.2)',
    opacity: 0.4,
  },
  buttonText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  status: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusReady: {
    color: '#10b981',
  },
  currentSaveText: {
    color: '#d1d5db',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1d29',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginLeft: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  newSaveButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  newSaveIcon: {
    marginRight: 4,
  },
  newSaveButtonText: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  newSaveInputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    color: '#f9fafb',
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 12,
  },
  inputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  inputButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  inputButtonCancel: {
    backgroundColor: 'rgba(75, 85, 99, 0.15)',
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  inputButtonConfirm: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  inputButtonText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 14,
  },
  savesList: {
    maxHeight: 340,
    marginBottom: 16,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    padding: 32,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  saveItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  saveItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  saveItemContent: {
    flex: 1,
    padding: 16,
  },
  saveNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  checkIcon: {
    marginRight: 4,
  },
  saveName: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  saveDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveDate: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 2,
  },
  deleteButton: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  modalButtonClose: {
    backgroundColor: 'rgba(75, 85, 99, 0.15)',
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  modalButtonIcon: {
    marginRight: 4,
  },
  modalButtonText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  // Floating Action Button
  fabButton: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  fabButtonDisabled: {
    backgroundColor: 'rgba(75, 85, 99, 0.5)',
    borderColor: 'rgba(75, 85, 99, 0.3)',
    shadowOpacity: 0.2,
  },
  // Node Picker Modal
  nodePickerContent: {
    backgroundColor: '#1a1d29',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  nodePickerSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '400',
  },
  nodeTypesList: {
    maxHeight: 420,
  },
  nodeTypeItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nodeTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  nodeTypeInfo: {
    flex: 1,
  },
  nodeTypeName: {
    color: '#f9fafb',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  nodeTypeDescription: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  closePickerButton: {
    backgroundColor: 'rgba(75, 85, 99, 0.15)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  closePickerButtonText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

export default NodeEditorScreen;
