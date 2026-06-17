import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ResetPasswordScreen() {
  const { t } = useLang();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) return Alert.alert('Error', 'Please enter email');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert('Success', t('resetCodeSent'));
      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !code || !newPassword) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);
    try {
      await authService.resetPassword(email, code, newPassword);
      Alert.alert('Success', t('passwordResetSuccess'));
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('passwordResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('resetPasswordTitle')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {step === 1 ? (
            <>
              <Text style={styles.label}>{t('emailLabel')}</Text>
              <TextInput style={styles.input} placeholder={t('emailPlaceholder')} placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              
              <TouchableOpacity style={styles.mainButton} onPress={handleSendCode} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.mainButtonText}>{t('sendVerificationCode')}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>{t('emailCodeSent')} {email}</Text>
              
              <Text style={styles.label}>{t('emailVerificationCode')}</Text>
              <TextInput style={styles.input} placeholder={t('emailCodePlaceholder')} placeholderTextColor={Colors.textMuted} value={code} onChangeText={setCode} keyboardType="number-pad" />
              
              <Text style={styles.label}>{t('newPassword')}</Text>
              <TextInput style={styles.input} placeholder={t('newPasswordPlaceholder')} placeholderTextColor={Colors.textMuted} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              
              <TouchableOpacity style={styles.mainButton} onPress={handleResetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.mainButtonText}>{t('confirmReset')}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  title: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20, gap: 16 },
  label: { color: Colors.text, fontSize: 16 },
  infoText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 10 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 8, padding: 16, color: Colors.text, fontSize: 16 },
  mainButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  mainButtonText: { color: Colors.textOnPrimary, fontSize: 18, fontWeight: 'bold' },
});
