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

  // Create a multi-layered gradient effect
  // Layer 1: Outer glow with first gradient color
  // Layer 2: Main border with middle color
  // Layer 3: Inner glow with last gradient color
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
          borderColor: colors[1], // Middle/main color
          shadowColor: colors[0], // First color for outer glow
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: borderWidth * 2,
          elevation: 5, // For Android
        }}
      >
        <View
          style={{
            shadowColor: colors[2] || colors[0], // Last color for inner glow
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: borderWidth,
            elevation: 3, // For Android
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});
