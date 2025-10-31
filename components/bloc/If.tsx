import React, {/*useState*/} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useDraggable } from './useDraggable';

const IfBloc = () => {
  //const [showElse, setShowElse] = useState(false);

  const { panGesture, animatedStyle } = useDraggable();


  return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.bloc, animatedStyle]}>
          <View style={styles.conditionDiv}>
            <Text>If</Text>
            <View style={styles.frontAnchor}/>
          </View>
          <View style={styles.conditionDiv}>
            <Text>Else</Text>
            <View style={styles.frontAnchor}/>
          </View>
          <View style={styles.backAnchor}/>
        </Animated.View>
      </GestureDetector>
  );
};

const styles = StyleSheet.create({
  bloc: {
    backgroundColor: '#ff4444',
    width: 100,
    height: 100,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  conditionDiv: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backAnchor:{
    width: 15,
    height: 15,
    backgroundColor: '#000',
    borderRadius: '100%',
    position: 'absolute',
    left: -7,
  },
  frontAnchor: {
    width: 15,
    height: 15,
    backgroundColor: '#000',
    borderRadius: '100%',
    transform: [{ translateX: 4 }],
  }
});

export default IfBloc;