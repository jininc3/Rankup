import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, PanResponder, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInAppNotification } from '@/contexts/InAppNotificationContext';
import InAppNotification from './InAppNotification';

export default function InAppNotificationContainer() {
  const { activeNotification, isVisible, dismissNotification } = useInAppNotification();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Animate in/out when visibility changes
  useEffect(() => {
    if (isVisible && activeNotification) {
      // Slide down (show)
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide up (hide)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -200,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, activeNotification]);

  // Pan responder for swipe-up to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to upward swipes
        return gestureState.dy < -5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow dragging upward
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Dismiss if swiped up enough
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          Animated.timing(translateY, {
            toValue: -200,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            dismissNotification();
          });
        } else {
          // Snap back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Don't render if no active notification
  if (!activeNotification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <InAppNotification notification={activeNotification} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
