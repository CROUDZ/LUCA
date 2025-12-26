import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';
import { useTheme } from '../theme';
import { StyleSheet } from 'react-native';
import type { AppTheme } from '../theme';
import { LinearGradient } from 'react-native-linear-gradient';

type InstructionsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Instructions'
>;

interface InstructionsScreenProps {
  navigation: InstructionsScreenNavigationProp;
}

const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createInstructionsStyles(theme), [theme]);

  const [query, setQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Tous');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const docs = useMemo(
    () => [
      {
        id: 'color-screen-node',
        title: 'ColorScreenNode',
        category: 'Nœud',
        excerpt: 'Affiche une couleur plein écran ou un écran coloré temporaire.',
        content:
          "Le `ColorScreenNode` affiche une couleur en plein écran tant que le signal est `ON` et la ferme quand il reçoit un signal `OFF`. La couleur est configurable dans les réglages. Il émet des événements internes (`colorscreen.show` / `colorscreen.hide`) et ajoute des flags dans les données du signal (`colorScreenActive`, `colorScreenColor`).\n\nExemple : afficher un fond rouge jusqu'à réception d'un `OFF` pour signaler une alerte.",
      },
      {
        id: 'confirm-node',
        title: 'ConfirmNode',
        category: 'Nœud',
        excerpt: 'Affiche une confirmation utilisateur avant de propager un signal.',
        content:
          'Le `ConfirmNode` attend un signal `ON` puis affiche une alerte de confirmation (question, labels confirm/cancel). Si l\'utilisateur confirme, il propage le signal en ajoutant `confirmed: true` aux données ; si l\'utilisateur annule, la propagation est bloquée. Il gère un mode `autoConfirm` (utile pour les tests) et attend que l\'app soit active avant d\'afficher l\'alerte si nécessaire.\n\nExemple : demander \'Continuer l\'itération ?\' avant une action destructive.\n\nExemple JSON:\n\n```json\n{\n  "question": "Continuer l\'itération ?",\n  "confirmLabel": "Oui",\n  "cancelLabel": "Non",\n  "autoConfirm": false\n}\n```',
      },
      {
        id: 'delay-node',
        title: 'DelayNode',
        category: 'Nœud',
        excerpt: "Retarde la propagation d'un signal d'une durée configurée.",
        content:
          'Le `DelayNode` retarde la propagation d\'un signal pendant un délai (ms). Le délai peut venir des settings, d\'une variable (useVariableDelay + delayVariableName) ou d\'une entrée `delay_ms`. Il renvoie `delayApplied` dans les données du signal.\n\nExemple : attendre 5000ms avant de propager le signal.\n\nExemple JSON:\n\n```json\n{\n  "delayMs": 5000,\n  "useVariableDelay": false\n}\n```',
      },
      {
        id: 'flashlight-action-node',
        title: 'FlashLightActionNode',
        category: 'Nœud',
        excerpt: "Action pour contrôler la lampe torche de l'appareil (allumer/éteindre).",
        content:
          'Le `FlashLightActionNode` contrôle la lampe torche en mode `toggle` ou `set` selon la config. Il vérifie la permission caméra et émet un événement `flashlight.permission.failed` si nécessaire, affiche une alerte si la permission manque, et met à jour les données du signal (`flashlightState`, `flashlightActionExecuted`).\n\nExemple : `mode=set` pour forcer ON ou `mode=toggle` pour basculer l\'état actuel.\n\nExemple JSON:\n\n```json\n{\n  "mode": "toggle",\n  "value": true,\n  "propagateSignal": true\n}\n```',
      },
      {
        id: 'flashlight-condition-node',
        title: 'FlashLightConditionNode',
        category: 'Nœud',
        excerpt: "Condition liée à l'état ou à la disponibilité de la lampe torche.",
        content:
          "Le `FlashLightConditionNode` est une node conditionnelle qui propage seulement si la lampe torche est activée. Elle expose `invertSignal` (propage si éteinte), fournit des données (`flashlightState`) et s'abonne à l'événement `flashlight.changed` pour réagir aux changements d'état. Peut aussi émettre des événements de permission si la bascule native échoue.\n\nExemple JSON:\n\n```json\n{\n  \"invertSignal\": false\n}\n```",
      },
      {
        id: 'logic-gate-node',
        title: 'LogicGateNode',
        category: 'Nœud',
        excerpt: 'Applique une opération logique (AND/OR/XOR...) sur plusieurs entrées.',
        content:
          'Le `LogicGateNode` combine plusieurs entrées en appliquant une porte logique configurable (AND, OR, NOT, XOR, NAND, NOR, XNOR). Il collecte les valeurs arrivant des sources, attend toutes les entrées nécessaires (sauf pour `NOT` qui évalue immédiatement), supporte 2–8 entrées, un `inputCount` configurable, `resetAfterEval` pour vider les états après évaluation, et `invertSignal` pour inverser le résultat. La node peut aussi forcer une remise à OFF si elle reçoit un `OFF` explicite.\n\nExemple : `gateType=AND` avec 3 entrées → propage `ON` si toutes les 3 sont `true`.\n\nExemple JSON:\n\n```json\n{\n  "gateType": "AND",\n  "inputCount": 3,\n  "resetAfterEval": true,\n  "invertSignal": false\n}\n```',
      },
      {
        id: 'notification-node',
        title: 'NotificationNode',
        category: 'Nœud',
        excerpt: 'Crée une notification système (titre, message).',
        content:
          'Le `NotificationNode` affiche une notification selon le type choisi (`alert`, `console`, `toast`). Le message peut provenir d\'une entrée `message`, d\'une variable (useVariableMessage + messageVariableName), ou des settings. Il renvoie `notificationShown` et `notificationMessage` dans les données et possède `autoPropagate` pour contrôler la propagation.\n\nExemple : type `alert` pour notifier visuellement l\'utilisateur.\n\nExemple JSON:\n\n```json\n{\n  "notificationType": "alert",\n  "title": "Tâche terminée",\n  "message": "Backup terminé",\n  "autoPropagate": true\n}\n```',
      },
      {
        id: 'ping-node',
        title: 'PingNode',
        category: 'Nœud',
        excerpt: 'Envoie un ping réseau ou local et émet un signal selon la réponse.',
        content:
          'Le `PingNode` enregistre un compteur de pings, loggue un message \'PING\' et peut afficher une alerte native. Il augmente un compteur interne (`pingCount`) et ajoute des données (`pingExecuted`, `pingCount`, `pingMessage`). Le comportement est configurable (`showAlert`, `propagateSignal`, `message`).\n\nExemple : utiliser pour tester une séquence et afficher une alerte de test.\n\nExemple JSON:\n\n```json\n{\n  "showAlert": true,\n  "propagateSignal": true,\n  "message": "PING"\n}\n```',
      },
      {
        id: 'trigger-node',
        title: 'TriggerNode',
        category: 'Nœud',
        excerpt:
          "Génère un signal lorsqu'une condition de déclenchement est remplie ou manuellement activé.",
        content:
          'Le `TriggerNode` est le point de départ manuel: il peut fonctionner en `pulse` (one-shot) ou `continuous` (mode interrupteur). Il fournit des helpers (`triggerNode`, `triggerAll`) pour déclenchements programmatiques, supporte `autoTrigger` et `autoTriggerDelay`, et permet d\'envoyer des données (`triggerData`) lors du déclenchement.\n\nExemple : mode `continuous` pour démarrer/arrêter une écoute vocale via une autre node.\n\nExemple JSON:\n\n```json\n{\n  "autoTrigger": false,\n  "autoTriggerDelay": 0,\n  "continuousMode": true\n}\n```',
      },
      {
        id: 'vibration-node',
        title: 'VibrationNode',
        category: 'Nœud',
        excerpt: "Fait vibrer l'appareil selon un motif ou une durée.",
        content:
          'Le `VibrationNode` déclenche la vibration native selon un type (`simple`, `pattern`, `success`, `warning`, `error`). Il vérifie les permissions et peut renvoyer l\'état (`vibrationTriggered`, `vibrationType`) dans les données. Le param `duration` peut aussi provenir d\'une entrée.\n\nExemple : `vibrationType=success` pour un petit retour positif.\n\nExemple JSON:\n\n```json\n{\n  "vibrationType": "success",\n  "duration": 400\n}\n```',
      },
      {
        id: 'voice-keyword-condition-node',
        title: 'VoiceKeywordConditionNode',
        category: 'Nœud',
        excerpt: 'Émet un signal quand un mot-clé vocal est reconnu.',
        content:
          'Le `VoiceKeywordConditionNode` détecte un mot-clé vocal (ex: \'LUCA\') et émet un signal interne `voice.keyword.detected` quand il est reconnu (avec `transcript`, `confidence`, `timestamp`). Il fonctionne en mode continu (ON démarre l\'écoute, OFF arrête l\'écoute) ou en écoute temporaire, supporte `invertSignal`, `caseSensitive` et `exactMatch`, et utilise un manager de reconnaissance vocale centralisé.\n\nExemple : Trigger → Voice Keyword → Ping pour déclencher un flux vocalement.\n\nExemple JSON:\n\n```json\n{\n  "keyword": "LUCA",\n  "invertSignal": false,\n  "caseSensitive": false,\n  "exactMatch": false\n}\n```',
      },
      {
        id: 'volume-action-nodes',
        title: 'VolumeActionNodes',
        category: 'Nœud',
        excerpt: 'Actions pour modifier le volume (augmenter/baisser, mute, set).',
        content:
          'Les `VolumeActionNodes` (`Volume +` / `Volume -`) ajustent le volume système par pas configurables (`steps`), peuvent afficher l\'UI système (`showSystemUI`) et renvoyer `volumeInfo` dans les données. Utiles pour contrôler le son en réponse à des événements.\n\nExemple : `Volume +` avec `steps=2` pour monter le volume de 2 crans.\n\nExemple JSON:\n\n```json\n{\n  "steps": 2,\n  "showSystemUI": false,\n  "propagateSignal": true\n}\n```',
      },
      {
        id: 'volume-condition-nodes',
        title: 'VolumeConditionNodes',
        category: 'Nœud',
        excerpt: 'Conditions basées sur le niveau de volume ou les changements de volume.',
        content:
          'Les `VolumeConditionNodes` (`Volume +` / `Volume -`) sont des conditions qui réagissent aux appuis des boutons volume. Elles propagent lorsque le bouton correspondant est appuyé (ou relâché si `invertSignal` est activé) et fournissent des données sur l\'événement (`lastVolumeEvent`). Elles utilisent un abonnement externe aux événements boutons volume.\n\nExemple : utiliser `condition.volume.up` pour déclencher une action quand l\'utilisateur appuie sur Volume +.\n\nExemple JSON:\n\n```json\n{\n  "invertSignal": false\n}\n```',
      },
    ],
    []
  );

  const categories = useMemo(
    () => ['Tous', ...Array.from(new Set(docs.map((d) => d.category)))],
    [docs]
  );

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const matchesCategory = selectedCategory === 'Tous' || d.category === selectedCategory;
      const matchesQuery =
        !query ||
        d.title.toLowerCase().includes(query.toLowerCase()) ||
        d.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        d.content.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [docs, query, selectedCategory]);

  const renderDoc = ({ item }: any) => {
    const expanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={styles.docCard}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        accessibilityLabel={`doc-${item.id}`}
      >
        <View style={styles.docHeader}>
          <Text style={styles.docTitle}>{item.title}</Text>
          <Text style={styles.docCategory}>{item.category}</Text>
        </View>
        <Text style={styles.docExcerpt}>{item.excerpt}</Text>
        {expanded && <Text style={styles.docContent}>{item.content}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="instructions-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documentation</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="doc-search"
        />
      </View>

      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              accessibilityLabel={`doc-category-${cat}`}
            >
              <LinearGradient
                colors={
                  cat === selectedCategory
                    ? [theme.colors.secondarySoft, theme.colors.primarySoft]
                    : [theme.colors.surface, theme.colors.surface]
                }
                style={[styles.chip]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              >
                <Text
                  style={[
                    styles.chipText,
                    cat === selectedCategory ? { color: '#FFFFFF' } : undefined,
                  ]}
                >
                  {cat}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderDoc}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun résultat</Text>}
      />
    </View>
  );
};

InstructionsScreen.displayName = 'InstructionsScreen';

const createInstructionsStyles = (theme: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchInput: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipsRow: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    docCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    docHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    docTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    docCategory: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    docExcerpt: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    docContent: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    emptyText: {
      padding: 20,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
  });

export default InstructionsScreen;
