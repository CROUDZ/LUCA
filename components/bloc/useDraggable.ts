import { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

export const useDraggable = () => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const onStartWorklet = () => {
    'worklet';
    startX.value = translateX.value;
    startY.value = translateY.value;
  };

  const onUpdateWorklet = (event: any) => {
    'worklet';
    translateX.value = startX.value + event.translationX;
    translateY.value = startY.value + event.translationY;
  };

  const onEndWorklet = () => {
    'worklet';
    translateX.value = withSpring(translateX.value, {
      damping: 20,
      stiffness: 90,
    });
    translateY.value = withSpring(translateY.value, {
      damping: 20,
      stiffness: 90,
    });
  };

  const panGesture = Gesture.Pan()
    .onStart(onStartWorklet)
    .onUpdate(onUpdateWorklet)
    .onEnd(onEndWorklet);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return { panGesture, animatedStyle };
};