import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';

interface WinLossPieChartProps {
  wins: number;
  losses: number;
  winRate: number;
  size?: number;
  strokeWidth?: number;
  winColor?: string;
  lossColor?: string;
}

export default function WinLossPieChart({
  wins,
  losses,
  winRate,
  size = 100,
  strokeWidth = 10,
  winColor = '#4ade80',
  lossColor = '#ef4444',
}: WinLossPieChartProps) {
  const total = wins + losses;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const winFraction = total > 0 ? wins / total : 0;
  const winArc = circumference * winFraction;
  const lossArc = circumference - winArc;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Loss arc (background full circle) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={total > 0 ? lossColor : 'rgba(255,255,255,0.1)'}
            strokeWidth={strokeWidth}
            fill="none"
            strokeOpacity={total > 0 ? 0.8 : 1}
          />
          {/* Win arc */}
          {total > 0 && winFraction > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={winColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${winArc} ${lossArc}`}
              strokeLinecap="round"
              strokeOpacity={0.9}
            />
          )}
        </G>
      </Svg>
      {/* Center text */}
      <View style={[styles.centerLabel, { width: size, height: size }]}>
        <ThemedText style={styles.winRateValue}>{winRate}%</ThemedText>
        <ThemedText style={styles.winRateLabel}>WR</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winRateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  winRateLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -2,
  },
});
