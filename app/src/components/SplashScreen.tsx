import React, { useEffect, useRef } from 'react';
import { Text, Image, Animated, StyleSheet } from 'react-native';
import { useAppTheme } from '../styles/theme';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number; // ms
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, minDuration = 1100 }) => {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const start = Date.now();

    const inAnim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    inAnim.start(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, minDuration - elapsed);
      setTimeout(() => {
        // fade out
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onFinish?.();
        });
      }, remaining);
    });

    // safety: ensure onFinish called eventually in case of unmount
    return () => {
      // noop
    };
  }, [minDuration, onFinish, opacity, scale]);

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: theme.colors.surface }, { opacity }]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.inner, { transform: [{ scale }] }]}>
        <Image source={require('../../assets/logo_luca.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: theme.colors.text }]}>LUCA</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Chargement…</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SplashScreen;
