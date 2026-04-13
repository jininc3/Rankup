import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GoogleSignUpBirthday() {
  const router = useRouter();
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const getAge = (dob: Date) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const handleContinue = () => {
    const age = getAge(dateOfBirth);
    if (age < 13) {
      Alert.alert('Age Requirement', 'You must be at least 13 years old to use RankUp.');
      return;
    }
    router.push({
      pathname: '/(auth)/googleSignUpUsername',
      params: { dateOfBirth: dateOfBirth.toISOString() },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol size={22} name="chevron.left" color="#fff" />
      </TouchableOpacity>

      <View style={styles.progress}>
        <View style={styles.progressFill} />
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.step}>Step 2 of 6</ThemedText>
        <ThemedText style={styles.title}>What's your{'\n'}birthday?</ThemedText>
        <ThemedText style={styles.subtitle}>This won't be shown publicly.</ThemedText>

        <View style={styles.pickerContainer}>
          {Platform.OS === 'android' && (
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
              <ThemedText style={styles.dateButtonText}>
                {dateOfBirth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </ThemedText>
            </TouchableOpacity>
          )}
          {showPicker && (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowPicker(false);
                if (date) setDateOfBirth(date);
              }}
              themeVariant="dark"
              textColor="#fff"
            />
          )}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8}>
          <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  backButton: { position: 'absolute', top: 60, left: 16, zIndex: 10, padding: 8 },
  progress: { marginTop: 100, marginHorizontal: 28, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { width: '33.3%', height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  step: { fontSize: 13, color: '#555', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555' },
  pickerContainer: { marginTop: 32, alignItems: 'center' },
  dateButton: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24 },
  dateButtonText: { color: '#fff', fontSize: 16 },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
});
