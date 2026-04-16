import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface GradientBorderProps {
  colors: string[];
  borderWidth: number;
  borderRadius: number;
  children: React.ReactNode;
  style?: ViewStyle;
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
}: GradientBorderProps) {
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
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});
