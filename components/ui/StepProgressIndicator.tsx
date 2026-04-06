import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface StepProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepProgressIndicator({ currentStep, totalSteps }: StepProgressIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index <= currentStep - 1 ? styles.segmentActive : styles.segmentInactive,
              index === 0 && styles.segmentFirst,
              index === totalSteps - 1 && styles.segmentLast,
            ]}
          />
        ))}
      </View>
      <ThemedText style={styles.stepText}>
        Step {currentStep} of {totalSteps}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  barContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 4,
    gap: 4,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  segmentFirst: {
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  segmentLast: {
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  segmentActive: {
    backgroundColor: '#D4A843',
  },
  segmentInactive: {
    backgroundColor: '#2c2f33',
  },
  stepText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});
