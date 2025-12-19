import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, StyleSheet, Easing, Dimensions, Image } from 'react-native';
import { useAppTheme } from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';

// Create an animated version of LinearGradient instead of using "Animated.LinearGradient"
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

type Phase =
  | 'logo-appear'
  | 'logo-visible'
  | 'shrinking'
  | 'morphing'
  | 'moving'
  | 'text-arrive'
  | 'final'
  | 'fadeout';

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { theme } = useAppTheme();
  const [phase, setPhase] = useState<Phase>('logo-appear');

  // Container
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Logo animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;

  // Le point bleu (transformation du logo)
  // Il commence invisible, apparaît PETIT (même taille que le logo rétréci)
  const blueDotOpacity = useRef(new Animated.Value(0)).current;
  const blueDotPositionX = useRef(new Animated.Value(0)).current; // Centre au début

  // Texte "L.U.C.A" (sans le dernier point)
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textPositionX = useRef(new Animated.Value(-SCREEN_WIDTH)).current; // Hors écran à gauche

  // Phase 1: Logo apparaît au centre
  useEffect(() => {
    if (phase !== 'logo-appear') return;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase('logo-visible');
    });
  }, [phase, logoOpacity, logoScale]);

  // Phase 2: Logo reste visible
  useEffect(() => {
    if (phase !== 'logo-visible') return;

    const timer = setTimeout(() => {
      setPhase('shrinking');
    }, 400);

    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 3: Logo rétrécit en tournant (reste au centre)
  useEffect(() => {
    if (phase !== 'shrinking') return;

    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 0.055, // Très petit, taille d'un point
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      }),
      Animated.timing(logoRotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      }),
      Animated.timing(logoTranslateY, {
        toValue: 13, // déplacement vers le bas (ajuste la valeur si nécessaire)
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      }),
    ]).start(() => {
      setPhase('morphing');
    });
  }, [phase, logoScale, logoRotation, logoTranslateY]);

  // Phase 4: Morphing - Logo disparaît, point bleu apparaît (même position, même taille)
  useEffect(() => {
    if (phase !== 'morphing') return;

    // Crossfade instantané logo -> point
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(blueDotOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase('moving');
    });
  }, [phase, logoOpacity, blueDotOpacity]);

  // Phase 5: Le point se déplace vers la droite (position finale)
  useEffect(() => {
    if (phase !== 'moving') return;

    // Petite pause puis le point va à droite
    Animated.sequence([
      Animated.timing(blueDotPositionX, {
        toValue: 85, // Position finale (un peu plus proche du texte)
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(() => {});
    setPhase('text-arrive');
  }, [phase, blueDotPositionX]);

  // Phase 6: Le texte arrive de la gauche et "pousse" le point
  useEffect(() => {
    if (phase !== 'text-arrive') return;

    Animated.parallel([
      // Le texte apparaît
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Le texte arrive de la gauche vers le centre
      Animated.timing(textPositionX, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(() => {
      setPhase('final');
    });
  }, [phase, textOpacity, textPositionX]);

  // Phase 7: Pause puis fade out
  useEffect(() => {
    if (phase !== 'final') return;

    const timer = setTimeout(() => {
      setPhase('fadeout');
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => {
        onFinish?.();
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [phase, containerOpacity, onFinish]);

  // Interpolation pour la rotation (2 tours = 720deg)
  const spin = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        { opacity: containerOpacity },
      ]}
      pointerEvents="none"
    >
      {/* Logo au centre qui rétrécit */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }, { scale: logoScale }, { rotate: spin }],
          },
        ]}
      >
        <AnimatedLinearGradient
          colors={[ theme.colors.secondarySoft, theme.colors.primarySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoContainer}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </AnimatedLinearGradient>
      </Animated.View>

      {/* Point bleu (logo transformé) - se déplace vers la droite */}
      <Animated.View
        style={[
          styles.blueDot,
          {
            opacity: blueDotOpacity,
            transform: [{ translateX: blueDotPositionX }],
          },
        ]}
      />

      {/* Texte "L.U.C.A" avec les 3 premiers points normaux (couleur texte) */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateX: textPositionX }],
          },
        ]}
      >
        <Text style={[styles.letter, { color: theme.colors.text }]}>L</Text>
        <Text style={[styles.dotText, { color: theme.colors.text }]}>.</Text>
        <Text style={[styles.letter, { color: theme.colors.text }]}>U</Text>
        <Text style={[styles.dotText, { color: theme.colors.text }]}>.</Text>
        <Text style={[styles.letter, { color: theme.colors.text }]}>C</Text>
        <Text style={[styles.dotText, { color: theme.colors.text }]}>.</Text>
        <Text style={[styles.letter, { color: theme.colors.text }]}>A</Text>
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
  logoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    width: 160,
    height: 160,
  },
  logo: {
    width: '90%',
    height: '90%',
  },
  blueDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#1899d6',
    marginTop: 26,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  letter: {
    fontSize: 42,
    fontWeight: '800',
  },
  dotText: {
    fontSize: 42,
    fontWeight: '800',
    marginHorizontal: 1,
  },
});

export default SplashScreen;
