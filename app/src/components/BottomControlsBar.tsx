import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Svg, Defs, LinearGradient as SvgLinearGradient, Stop, Path, Rect } from 'react-native-svg';
import { programState } from '../engine/ProgramState';
import { backgroundService } from '../utils/backgroundService';
import { type AppTheme, useTheme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { RootStackParamList } from '../types/navigation.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

type NodeEditorScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NodeEditor'>;

interface ProgramControlBarProps {
  triggerNodeId: number | null;
  isReady: boolean;
  onRunProgram: () => void | Promise<void>;
  buttonSize?: number;
  symbolScale?: number;
}

const modIsReady = false;

const ProgramControlBar: React.FC<ProgramControlBarProps> = ({
  triggerNodeId,
  isReady,
  onRunProgram,
  buttonSize = 120,
  symbolScale = 1.5,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme, buttonSize]);

  const hasTrigger = triggerNodeId !== null;
  const isEnabled = isReady && hasTrigger;
  const nav = useNavigation<NodeEditorScreenNavigationProp>();

  const [isRunning, setIsRunning] = useState(programState.isRunning);

  // Subscribe to programState and notification toggle
  useEffect(() => {
    const unsubscribe = programState.subscribe((running) => {
      setIsRunning(running);
      backgroundService.updateTriggerState(running);
    });

    const unsubNotif = backgroundService.onTriggerToggle(() => {
      onRunProgram();
    });

    return () => {
      unsubscribe();
      unsubNotif?.();
    };
  }, [onRunProgram]);

  if (!isReady) return null;

  return (
    <View style={[styles.container]}>
      <TouchableOpacity
        style={[styles.modLibraryButton, { opacity: modIsReady ? 1 : 0.1 }]}
        onPress={() => nav.navigate('ModLibrary')}
        disabled={!modIsReady}
        activeOpacity={0.8}
      >
        <Icon name="shop" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onRunProgram}
        disabled={!isEnabled}
        activeOpacity={0.8}
        style={styles.buttonTouchable}
        accessibilityLabel={isRunning ? 'Arrêter le programme' : 'Démarrer le programme'}
      >
        {/* SVG icon (play triangle with rounded corners, or rounded square) filled with an internal gradient */}
        <Svg
          width={Math.round(buttonSize * 0.5)}
          height={Math.round(buttonSize * 0.5)}
          viewBox="0 0 36 36"
          accessibilityRole="image"
          aria-label={isRunning ? 'Arrêter' : 'Jouer'}
        >
          <Defs>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0.8">
              <Stop
                offset="0"
                stopColor={hasTrigger ? theme.colors.secondary : theme.colors.surface}
              />
              <Stop
                offset="1"
                stopColor={hasTrigger ? theme.colors.primary : theme.colors.surface}
              />
            </SvgLinearGradient>
          </Defs>
          {/* Compute inner symbol size based on symbolScale (relative to viewBox 36x36) */}
          {(() => {
            const base = 36;
            // clamp symbolScale to a reasonable range (allow enlargement > 1)
            const s = Math.max(0.2, Math.min(3, symbolScale));
            // Make the stop square slightly smaller than the triangle for better visual distinction
            const stopScale = 0.4; // square will be 75% of the triangle's symbol scale
            const inner = base * s * (isRunning ? stopScale : 1);
            const offset = (base - inner) / 2;
            // Avoid over-rounding corners when the inner box becomes very large
            const rx = Math.max(1, Math.min(Math.round(inner * 0.07), Math.floor(inner / 2) - 1));

            if (isRunning) {
              return (
                <Rect
                  x={offset}
                  y={offset}
                  width={inner}
                  height={inner}
                  rx={rx}
                  fill="url(#grad)"
                />
              );
            }

            // For the triangle, compute a scaled+translated path so it stays correctly centered
            // even when symbolScale > 1 (no group transform that can introduce visual artefacts)
            const pts = [
              12, 11, 13, 9.8, 15, 9.8, 16, 11, 24, 17, 25, 18, 25, 18, 24, 19, 16, 25, 15, 26.2,
              13, 26.2, 12, 25,
            ];

            const scaled = pts.map((v) => Number((v * s + offset).toFixed(2)));
            const trianglePath = `M${scaled[0]} ${scaled[1]} C${scaled[2]} ${scaled[3]} ${scaled[4]} ${scaled[5]} ${scaled[6]} ${scaled[7]} L${scaled[8]} ${scaled[9]} C${scaled[10]} ${scaled[11]} ${scaled[12]} ${scaled[13]} ${scaled[14]} ${scaled[15]} L${scaled[16]} ${scaled[17]} C${scaled[18]} ${scaled[19]} ${scaled[20]} ${scaled[21]} ${scaled[22]} ${scaled[23]} Z`;

            return <Path d={trianglePath} fill="url(#grad)" />;
          })()}
        </Svg>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fabButton]}
        onPress={() => nav.navigate('NodePicker')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={32} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};
const createStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      bottom: 40,
      left: 0,
      right: 0,
      paddingHorizontal: 32,
      marginHorizontal: 24,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 48,
      zIndex: 1000,
      elevation: 10,
    },
    buttonTouchable: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    modLibraryButton: {},
    fabButton: {},
  });
};

export default ProgramControlBar;
