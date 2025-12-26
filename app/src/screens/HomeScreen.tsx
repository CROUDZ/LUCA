import React from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import SocialMenu from '../components/SocialMenu';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import type { RootStackParamList } from '../types/navigation.types';
import { StyleSheet } from 'react-native';
import type { AppTheme } from '../theme';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [showSocialMenu, setShowSocialMenu] = React.useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.container} testID="home-screen">
        <LinearGradient
          colors={[theme.colors.secondarySoft, theme.colors.primarySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoCircle}
        >
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>LUCA</Text>
        </LinearGradient>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Shortcuts')}
            accessibilityLabel="shortcut-button"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.secondarySoft, theme.colors.primarySoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButton}
              testID="shortcut-button"
            >
              <Icon name="flash-on" size={20} color={'#FFFFFF'} />
              <Text style={styles.actionText}>Raccourci</Text>
              <Icon name="chevron-right" size={22} style={{ color: '#FFFFFF' }} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Instructions')}
            accessibilityLabel="instruction-button"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.secondarySoft, theme.colors.primarySoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <Icon name="info" size={20} color={'#FFFFFF'} />
              <Text style={styles.actionText}>Instructions</Text>
              <Icon name="chevron-right" size={22} style={{ color: '#FFFFFF' }} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="settings-button"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.secondarySoft, theme.colors.primarySoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <Icon name="settings" size={20} color={'#FFFFFF'} />
              <Text style={styles.actionText}>Paramètres</Text>
              <Icon name="chevron-right" size={22} style={{ color: '#FFFFFF' }} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSocialMenu(true)}
            accessibilityLabel="socials-button"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.secondarySoft, theme.colors.primarySoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <Icon name="share" size={20} color={'#FFFFFF'} />
              <Text style={styles.actionText}>Réseaux sociaux</Text>
              <Icon name="chevron-right" size={22} style={{ color: '#FFFFFF' }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.subtitle}>Éditeur de nœuds visuels — automatisez simplement</Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 12,
            }}
          >
            Version 0.0.1
          </Text>
        </View>
        <SocialMenu visible={showSocialMenu} onClose={() => setShowSocialMenu(false)} />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => {
  const safeCreate = (obj: any) =>
    StyleSheet && typeof (StyleSheet as any).create === 'function'
      ? (StyleSheet as any).create(obj)
      : obj;
  return safeCreate({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      paddingHorizontal: 24,
      paddingVertical: 28,
    },
    logoCircle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 6,
    },
    logo: {
      width: '70%',
      height: '70%',
      borderRadius: 75,
      resizeMode: 'contain',
      transform: [{ translateY: 8 }],
    },
    title: {
      color: '#FFFFFF',
      fontSize: 40,
      fontWeight: '800',
      transform: [{ translateY: -15 }],
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
      maxWidth: 320,
    },
    actions: {
      width: '100%',
      paddingHorizontal: 8,
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceElevated,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 50,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.mode === 'dark' ? 0.16 : 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
    actionText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 12,
    },
    footer: {
      alignItems: 'center',
      width: '100%',
      paddingVertical: 8,
    },
  });
};

export default HomeScreen;
