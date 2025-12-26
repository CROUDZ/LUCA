import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Animated,
  Easing,
  Dimensions,
  Platform,
  StyleSheet,
  Pressable,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import type { AppTheme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome6';
import LinearGradient from 'react-native-linear-gradient';

interface SocialMenuProps {
  visible: boolean;
  onClose: () => void;
}

const socials = [
  {
    id: 'discord',
    label: 'Discord',
    url: 'https://discord.gg/ZfRag2h2T4',
    icon: 'discord',
    brandColor: '#5865F2',
  },
];

const SocialMenu: React.FC<SocialMenuProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const screenHeight = Dimensions.get('window').height;
  const anim = React.useRef(new Animated.Value(0)).current; // 0 hidden -> 1 visible
  const drag = React.useRef(new Animated.Value(0)).current; // pixel offset while dragging
  const [mounted, setMounted] = React.useState(visible);
  const insets = useSafeAreaInsets();

  // PanResponder to allow dragging down the sheet to close it
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        drag.setValue(0);
      },
      onPanResponderMove: (_evt, gs) => {
        // only allow dragging down
        if (gs.dy > 0) {
          drag.setValue(gs.dy);
        } else {
          drag.setValue(0);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        const shouldClose = gs.dy > 120 || gs.vy > 0.6;
        if (shouldClose) {
          // animate sheet off screen then close
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 0,
              duration: 200,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(drag, {
              toValue: screenHeight,
              duration: 200,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start(() => {
            drag.setValue(0);
            setMounted(false);
            onClose();
          });
        } else {
          // snap back
          Animated.timing(drag, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

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

  // Combine the base animation with the drag offset (in pixels)
  const finalTranslateY = Animated.add(
    translateY,
    drag.interpolate({
      inputRange: [0, screenHeight],
      outputRange: [0, screenHeight],
      extrapolate: 'clamp',
    })
  );

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
      hardwareAccelerated={Platform.OS === 'android'}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
        </Pressable>

        <Animated.View
          accessibilityLabel="social-menu"
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: finalTranslateY }],
              elevation: 6,
              paddingBottom: Math.max(20, insets.bottom + 12),
            },
          ]}
        >
          <Animated.View {...panResponder.panHandlers}>
            <LinearGradient
              colors={[theme.colors.secondarySoft, theme.colors.primarySoft]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.dragIndicator}
            />
          </Animated.View>

          {socials.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.row}
              onPress={() => open(s.url)}
              accessibilityLabel={`social-${s.id}`}
              activeOpacity={0.8}
            >
              <View style={styles.leftColumn}>
                <View style={styles.iconBadge}>
                  <FAIcon
                    name={s.icon as any}
                    size={28}
                    color={s.brandColor || theme.colors.primary}
                  />
                </View>
              </View>

              <View style={styles.centerColumn}>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{s.label}</Text>
              </View>

              <View style={styles.rightColumn}>
                <Icon name="open-in-new" size={18} color={theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Retrouvez-nous sur les réseaux !
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000000a4',
    },
    modalContent: {
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      elevation: 8,
    },
    dragIndicator: {
      width: 100,
      height: 5,
      borderRadius: 2,
      alignSelf: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderStrong,
    },
    leftColumn: {
      width: 56,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightColumn: {
      width: 56, // match leftColumn so centerColumn is truly centered
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBadge: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    footerText: {
      textAlign: 'center',
      paddingTop: 12,
      backgroundColor: 'transparent',
      fontSize: 14,
    },
  });
}

export default SocialMenu;
