/*
  SettingsScreen - Écran des paramètres utilisateur
  Ce fichier contient l'écran principal des paramètres. Il expose plusieurs contrôles
  (exécution en arrière-plan, contrôles notification) et la section Apparence pour
  choisir le thème de l'application.
*/

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation.types';
import { useAppTheme } from '../styles/theme';
import createSettingsStyles from './SettingsScreenStyles';
import { settingsManager, type AppSettings } from '../utils/settingsManager';
import { backgroundService } from '../utils/backgroundService';
import { logger } from '../utils/logger';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation?: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<SettingsScreenProps> = React.memo(({ navigation }) => {
  const { theme, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);

  const [settings, setSettings] = useState<AppSettings>(settingsManager.getSettings());

  useEffect(() => {
    const unsubscribe = settingsManager.subscribe((newSettings) => {
      setSettings(newSettings);
    });
    return unsubscribe;
  }, []);

  const handleBackgroundToggle = useCallback(async (value: boolean) => {
    await settingsManager.updateSettings({ backgroundServiceEnabled: value });
    if (value) {
      backgroundService.start();
    } else {
      backgroundService.stop();
    }
    logger.info(`[Settings] Background service ${value ? 'enabled' : 'disabled'}`);
  }, []);

  const handleNotificationControlsToggle = useCallback(async (value: boolean) => {
    await settingsManager.updateSettings({ notificationControlsEnabled: value });
    // La notification sera mise à jour au prochain cycle du service
    backgroundService.updateNotificationControls(value);
    logger.info(`[Settings] Notification controls ${value ? 'enabled' : 'disabled'}`);
  }, []);

  const options: Array<{ key: 'system' | 'dark' | 'light'; label: string }> = [
    { key: 'system', label: 'Système' },
    { key: 'dark', label: 'Sombre' },
    { key: 'light', label: 'Clair' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Section Exécution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exécution</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Fonctionnement en arrière-plan</Text>
                <Text style={styles.settingDescription}>
                  L'application continue de fonctionner même avec l'écran éteint ou verrouillé
                </Text>
              </View>
              <Switch
                style={styles.switch}
                value={settings.backgroundServiceEnabled}
                onValueChange={handleBackgroundToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
                thumbColor={
                  settings.backgroundServiceEnabled ? theme.colors.primary : theme.colors.textMuted
                }
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Contrôles dans la notification</Text>
                <Text style={styles.settingDescription}>
                  Affiche un bouton Play/Stop dans la notification permanente pour contrôler le
                  programme
                </Text>
              </View>
              <Switch
                style={styles.switch}
                value={settings.notificationControlsEnabled}
                onValueChange={handleNotificationControlsToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
                thumbColor={
                  settings.notificationControlsEnabled
                    ? theme.colors.primary
                    : theme.colors.textMuted
                }
                disabled={!settings.backgroundServiceEnabled}
              />
            </View>
          </View>

          {/* Appearance / Theme Section */}
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Apparence</Text>
            {options.map((opt) => {
              const selected = preference === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.settingRow, selected ? styles.optionSelected : undefined]}
                  onPress={() => void setPreference(opt.key)}
                  accessibilityLabel={`theme-${opt.key}`}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{opt.label}</Text>
                  </View>
                  <Icon
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Le bouton dans la notification permet de démarrer ou arrêter le trigger de votre
              programme sans ouvrir l'application.
            </Text>
          </View>

          {!settings.backgroundServiceEnabled && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Sans le mode arrière-plan, l'application s'arrêtera lorsque vous fermerez
                l'écran.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

SettingsScreen.displayName = 'SettingsScreen';

export default SettingsScreen;
