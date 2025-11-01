// components/Instructions.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/styles';

interface InstructionsProps {
  selectedAnchor: { blockId: string; type: string } | null;
}

const Instructions = ({ selectedAnchor }: InstructionsProps) => {
  return (
    <View style={styles.instructions}>
      <Text style={styles.instructionsText}>
        Glissez les blocs • Cliquez sur les points noirs pour créer des liens
      </Text>
      {selectedAnchor && (
        <Text style={styles.selectedText}>
          ✓ Point sélectionné - Cliquez sur un autre point
        </Text>
      )}
    </View>
  );
};

export { Instructions };