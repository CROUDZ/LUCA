import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';
import { useTheme } from '../theme';
import { StyleSheet } from 'react-native';
import type { AppTheme } from '../theme';
import { LinearGradient } from 'react-native-linear-gradient';
import { getInstructionDocs, InstructionDoc } from '../data/instructionDocs';

// Parser markdown pour formater le texte
const parseMarkdownText = (text: string, baseStyle: any, theme: AppTheme) => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Important : vérifier d'abord ** (2 caractères) avant * (1 caractère)
    // pour éviter que ** soit interprété comme deux *
    
    // 1. Chercher **texte** (gras) - doit avoir exactement 2 astérisques de chaque côté
    const boldMatch = remaining.match(/^\*\*([^*]+?)\*\*/);
    
    // 2. Chercher `code` (code inline)
    const codeMatch = remaining.match(/^`([^`]+?)`/);
    
    // 3. Chercher *texte* (italique) - doit avoir exactement 1 astérisque de chaque côté
    const italicMatch = remaining.match(/^\*([^*]+?)\*/);

    if (boldMatch) {
      // Texte en gras
      parts.push(
        <Text key={`bold-${key++}`} style={[baseStyle, { fontWeight: '700' }]}>
          {boldMatch[1]}
        </Text>
      );
      remaining = remaining.slice(boldMatch[0].length);
    } else if (codeMatch) {
      // Code inline
      parts.push(
        <Text
          key={`code-${key++}`}
          style={[
            baseStyle,
            {
              fontFamily: 'monospace',
              backgroundColor: theme.colors.border,
              paddingHorizontal: 4,
              borderRadius: 3,
            },
          ]}
        >
          {codeMatch[1]}
        </Text>
      );
      remaining = remaining.slice(codeMatch[0].length);
    } else if (italicMatch) {
      // Texte en italique
      parts.push(
        <Text key={`italic-${key++}`} style={[baseStyle, { fontStyle: 'italic' }]}>
          {italicMatch[1]}
        </Text>
      );
      remaining = remaining.slice(italicMatch[0].length);
    } else {
      // Texte normal - prendre tout jusqu'au prochain marqueur
      const nextSpecialChar = remaining.search(/[\*`]/);
      
      if (nextSpecialChar === -1) {
        // Plus de caractères spéciaux, prendre tout le reste
        parts.push(<Text key={`text-${key++}`} style={baseStyle}>{remaining}</Text>);
        remaining = '';
      } else if (nextSpecialChar > 0) {
        // Prendre le texte avant le prochain caractère spécial
        const textPart = remaining.slice(0, nextSpecialChar);
        parts.push(<Text key={`text-${key++}`} style={baseStyle}>{textPart}</Text>);
        remaining = remaining.slice(nextSpecialChar);
      } else {
        // Caractère spécial non matché (ex: * isolé), le traiter comme texte normal
        parts.push(<Text key={`text-${key++}`} style={baseStyle}>{remaining[0]}</Text>);
        remaining = remaining.slice(1);
      }
    }
  }

  return <>{parts}</>;
};

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

  const docs = useMemo<InstructionDoc[]>(() => getInstructionDocs(), []);

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

  const renderDoc = ({ item }: { item: InstructionDoc }) => {
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
        <Text style={styles.docExcerpt}>
          {parseMarkdownText(item.excerpt, styles.docExcerpt, theme)}
        </Text>
        {expanded && (
          <Text style={styles.docContent}>
            {parseMarkdownText(item.content, styles.docContent, theme)}
          </Text>
        )}
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