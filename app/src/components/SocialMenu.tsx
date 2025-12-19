import React from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, Animated, Easing, Dimensions, Platform, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '../styles/theme';
import createStyles from './SocialMenuStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SocialMenuProps {
  visible: boolean;
  onClose: () => void;
}

const socials = [
  { id: 'twitter', label: 'Twitter', url: 'https://twitter.com', icon: 'share' },
  { id: 'github', label: 'GitHub', url: 'https://github.com', icon: 'code' },
  { id: 'discord', label: 'Discord', url: 'https://discord.com', icon: 'forum' },
];

const SocialMenu: React.FC<SocialMenuProps> = ({ visible, onClose }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const screenHeight = Dimensions.get('window').height;
  const anim = React.useRef(new Animated.Value(0)).current; // 0 hidden -> 1 visible
  const [mounted, setMounted] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible, anim, mounted]);

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      // ignore
    }
    onClose();
  };
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  if (!mounted) return null;

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose} hardwareAccelerated={Platform.OS === 'android'}>
      <Animated.View style={[styles.modalOverlay, { backgroundColor: 'transparent' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: overlayOpacity }} />
        </Pressable>

        <Animated.View
          accessibilityLabel="social-menu"
          style={[
            styles.modalContent,
            { transform: [{ translateY }], elevation: 6 },
          ]}
        >
          <Text style={styles.title}>Réseaux sociaux</Text>
          {socials.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.row}
              onPress={() => open(s.url)}
              accessibilityLabel={`social-${s.id}`}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Icon name={s.icon as any} size={20} color={theme.colors.primary} />
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{s.label}</Text>
              </View>
              <Icon name="open-in-new" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.closeText, { color: theme.colors.primary }]}>Fermer</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default SocialMenu;
