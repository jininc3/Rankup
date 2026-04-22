import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';

interface DataPoint {
  value: number;
  date: Date;
  rank: string;
}

interface SeriesData {
  data: DataPoint[];
  color: string;
  username: string;
}

interface LPLineChartProps {
  /** Single line (legacy) */
  data?: DataPoint[];
  /** Multiple lines */
  series?: SeriesData[];
  width: number;
  height: number;
  lineColor?: string;
  label: string;
  /** Which user to highlight (userId key not needed — uses index) */
  highlightIndex?: number;
}

const PADDING = { top: 15, right: 10, bottom: 25, left: 35 };

const LINE_COLORS = [
  '#ff4655', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#EF4444',
];

export default function LPLineChart({ data, series, width, height, lineColor, label, highlightIndex }: LPLineChartProps) {
  // Normalise into series array
  const allSeries: SeriesData[] = series && series.length > 0
    ? series
    : data && data.length > 0
      ? [{ data, color: lineColor || '#ff4655', username: '' }]
      : [];

  // Filter out series with < 2 data points
  const validSeries = allSeries.filter(s => s.data.length >= 2);

  if (validSeries.length === 0) {
    return (
      <View style={[styles.emptyState, { width, height }]}>
        <ThemedText style={styles.emptyText}>Not enough data yet</ThemedText>
        <ThemedText style={styles.emptySubtext}>
          {label} will be tracked daily
        </ThemedText>
      </View>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Global min/max across ALL series for a shared Y axis
  const allValues = validSeries.flatMap(s => s.data.map(d => d.value));
  const minVal = Math.max(0, Math.min(...allValues) - 10);
  const maxVal = Math.max(...allValues) + 10;
  const range = maxVal - minVal || 1;

  // Global date range across all series for a shared X axis
  const allDates = validSeries.flatMap(s => s.data.map(d => d.date.getTime()));
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const dateRange = maxDate - minDate || 1;

  const toX = (date: Date) => PADDING.left + ((date.getTime() - minDate) / dateRange) * chartW;
  const toY = (v: number) => PADDING.top + chartH - ((v - minVal) / range) * chartH;

  // Grid lines (4 horizontal)
  const gridLines = Array.from({ length: 4 }, (_, i) => {
    const val = minVal + (range * (i + 1)) / 5;
    return { y: toY(val), label: Math.round(val).toString() };
  });

  // X-axis date labels
  const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const midDate = new Date((minDate + maxDate) / 2);
  const xLabels = [
    { x: toX(new Date(minDate)), text: formatDate(new Date(minDate)) },
    { x: toX(midDate), text: formatDate(midDate) },
    { x: toX(new Date(maxDate)), text: formatDate(new Date(maxDate)) },
  ];

  // Draw order: non-highlighted first, highlighted last (on top)
  const drawOrder = validSeries.map((s, i) => ({ ...s, index: i }));
  if (highlightIndex !== undefined) {
    drawOrder.sort((a, b) => {
      if (a.index === highlightIndex) return 1;
      if (b.index === highlightIndex) return -1;
      return 0;
    });
  }

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          {validSeries.map((s, i) => (
            <LinearGradient key={i} id={`fillGrad_${i}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity={highlightIndex === i ? '0.15' : '0.05'} />
              <Stop offset="1" stopColor={s.color} stopOpacity="0" />
            </LinearGradient>
          ))}
        </Defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PADDING.left}
              y1={g.y}
              x2={width - PADDING.right}
              y2={g.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <SvgText
              x={PADDING.left - 6}
              y={g.y + 3}
              fill="rgba(255,255,255,0.3)"
              fontSize={9}
              textAnchor="end"
            >
              {g.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Lines & fills */}
        {drawOrder.map((s) => {
          const isHighlighted = highlightIndex === undefined || highlightIndex === s.index;
          const opacity = highlightIndex !== undefined && !isHighlighted ? 0.25 : 1;

          const linePath = s.data
            .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(d.date).toFixed(1)} ${toY(d.value).toFixed(1)}`)
            .join(' ');

          const fillPath =
            linePath +
            ` L ${toX(s.data[s.data.length - 1].date).toFixed(1)} ${(PADDING.top + chartH).toFixed(1)}` +
            ` L ${toX(s.data[0].date).toFixed(1)} ${(PADDING.top + chartH).toFixed(1)} Z`;

          const lastPoint = s.data[s.data.length - 1];

          return (
            <React.Fragment key={s.index}>
              {/* Fill area (only for highlighted) */}
              {isHighlighted && (
                <Path d={fillPath} fill={`url(#fillGrad_${s.index})`} opacity={opacity} />
              )}

              {/* Line */}
              <Path
                d={linePath}
                stroke={s.color}
                strokeWidth={isHighlighted ? 2 : 1.5}
                fill="none"
                strokeLinejoin="round"
                opacity={opacity}
              />

              {/* End point dot */}
              <Circle
                cx={toX(lastPoint.date)}
                cy={toY(lastPoint.value)}
                r={isHighlighted ? 4 : 3}
                fill={s.color}
                opacity={opacity}
              />

              {/* Value label at end (only for highlighted or single series) */}
              {isHighlighted && (
                <SvgText
                  x={toX(lastPoint.date)}
                  y={toY(lastPoint.value) - 10}
                  fill="#fff"
                  fontSize={11}
                  fontWeight="700"
                  textAnchor="middle"
                  opacity={opacity}
                >
                  {lastPoint.value} {label}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <SvgText
            key={i}
            x={xl.x}
            y={height - 4}
            fill="rgba(255,255,255,0.35)"
            fontSize={9}
            textAnchor="middle"
          >
            {xl.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  emptySubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 4,
  },
});
