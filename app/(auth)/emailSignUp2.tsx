import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EmailSignUpStep2() {
  const router = useRouter();
  const { username } = useLocalSearchParams();
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(true);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleContinue = () => {
    if (!dateOfBirth) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }

    // Validate age (must be at least 13 years old)
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const dayDiff = today.getDate() - dateOfBirth.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 13) {
      Alert.alert('Error', 'You must be at least 13 years old to sign up');
      return;
    }

    // Navigate to step 3 with username and dateOfBirth
    router.push({
      pathname: '/(auth)/emailSignUp3',
      params: {
        username: username as string,
        dateOfBirth: dateOfBirth.toISOString(),
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <IconSymbol size={24} name="chevron.left" color="#000" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Date of Birth</ThemedText>
              <ThemedText style={styles.subtitle}>
                Step 2 of 3
              </ThemedText>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Date of Birth *</ThemedText>
                <View style={styles.input}>
                  <ThemedText style={[styles.dateText, !dateOfBirth && styles.placeholderText]}>
                    {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
                  </ThemedText>
                </View>
              </View>

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={dateOfBirth || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    textColor="#000"
                    style={styles.datePicker}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <ThemedText style={styles.continueButtonText}>
                  Continue
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
    overflow: 'visible',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 40,
    overflow: 'visible',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePicker: {
    height: 200,
    width: '100%',
    alignSelf: 'center',
  },
});
