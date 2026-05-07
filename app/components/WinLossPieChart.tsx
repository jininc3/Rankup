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
  hideText?: boolean;
}

export default function WinLossPieChart({
  wins,
  losses,
  winRate,
  size = 100,
  strokeWidth = 10,
  winColor = '#4ade80',
  lossColor = '#ef4444',
  hideText = false,
}: WinLossPieChartProps) {
  const total = wins + losses;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const innerRadius = radius - strokeWidth / 2 - 2;

  const winFraction = total > 0 ? wins / total : 0;
  const lossFraction = total > 0 ? losses / total : 0;
  const winArc = circumference * winFraction;
  const lossArc = circumference * lossFraction;

  // Gap between arcs (small visual separation)
  const gap = total > 0 && winFraction > 0 && lossFraction > 0 ? 4 : 0;
  const winArcAdj = Math.max(0, winArc - gap);
  const lossArcAdj = Math.max(0, lossArc - gap);

  // Font size scales with chart size
  const fontSize = Math.round(size * 0.24);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Dark background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Dark center fill */}
          <Circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="#111"
          />
          {total > 0 && (
            <>
              {/* Loss arc (starts after win arc + gap) */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={lossColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${lossArcAdj} ${circumference - lossArcAdj}`}
                strokeDashoffset={-winArc - gap / 2}
              />
              {/* Win arc (starts at top) */}
              {winFraction > 0 && (
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={winColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${winArcAdj} ${circumference - winArcAdj}`}
                />
              )}
            </>
          )}
        </G>
      </Svg>
      {/* Center text */}
      {!hideText && (
        <View style={[styles.centerLabel, { width: size, height: size }]}>
          <ThemedText style={[styles.winRateValue, { fontSize }]}>{winRate}%</ThemedText>
        </View>
      )}
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
    fontWeight: '800',
    color: '#fff',
  },
});
