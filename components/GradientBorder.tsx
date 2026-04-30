import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBorderProps {
  colors: string[];
  borderWidth: number;
  borderRadius: number;
  children: React.ReactNode;
  style?: ViewStyle;
  shine?: boolean;
}

/**
 * A gradient border component that simulates a gradient using multiple layers
 * This avoids the need for expo-linear-gradient
 */
export default function GradientBorder({
  colors,
  borderWidth,
  borderRadius,
  children,
  style,
  shine = false,
}: GradientBorderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shine) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shine]);

  const shimmerRotate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '45deg'],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.3, 0.5, 0.7, 1],
    outputRange: [0, 0.6, 1, 0.6, 0],
  });
  if (colors.length < 2) {
    // Fallback to solid border if not enough colors
    return (
      <View
        style={[
          {
            borderWidth,
            borderRadius,
            borderColor: colors[0] || '#000',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Glass-style border:
  // - Tier color as the main rim
  // - Subtle neutral depth shadow (no colored glow)
  // - Inner white highlight stroke for a glassy sheen
  return (
    <View
      style={[
        {
          padding: borderWidth / 2,
          borderRadius: borderRadius + borderWidth,
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      <View
        style={{
          borderWidth: borderWidth,
          borderRadius,
          borderColor: colors[1], // Tier color as the glass rim
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2, // For Android
        }}
      >
        {/* Inner glass highlight rim */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: Math.max(0, borderRadius - borderWidth),
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.22)',
            zIndex: 1,
          }}
        />
        {/* Animated shine sweep for higher tiers */}
        {shine && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -borderWidth,
              left: -borderWidth,
              right: -borderWidth,
              bottom: -borderWidth,
              borderRadius,
              overflow: 'hidden',
              zIndex: 2,
              opacity: shimmerOpacity,
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                right: '-50%',
                bottom: '-50%',
                transform: [{ rotate: shimmerRotate }],
              }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.35)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ width: '100%', height: '100%' }}
              />
            </Animated.View>
          </Animated.View>
        )}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});
