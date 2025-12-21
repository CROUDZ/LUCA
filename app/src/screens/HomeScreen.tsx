import React from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import SocialMenu from '../components/SocialMenu';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import createStyles from './HomeScreenStyles';
import { useAppTheme } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation.types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useAppTheme();
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
            onPress={() => navigation.navigate('NodeEditor')}
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
              <View
                style={styles.actionIconWrapper}
                accessibilityLabel="shortcut-icon"
                testID="shortcut-icon"
              >
                <Icon name="flash-on" size={20} color={'#FFFFFF'} />
              </View>
              <Text style={styles.actionText}>Raccourci</Text>
              <Icon name="chevron-right" size={22} style={styles.chevron as any} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
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
              <Icon name="chevron-right" size={22} style={styles.chevron as any} />
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
              <Icon name="chevron-right" size={22} style={styles.chevron as any} />
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
              <Icon name="chevron-right" size={22} style={styles.chevron as any} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.subtitle}>Éditeur de nœuds visuels — automatisez simplement</Text>
          <Text style={styles.footerText}>Version 0.0.1</Text>
        </View>
        <SocialMenu visible={showSocialMenu} onClose={() => setShowSocialMenu(false)} />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
