import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

interface BindEmailModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BindEmailModal({ visible, onClose }: BindEmailModalProps) {
  const { t } = useLang();
  const { updateUser, refreshProfile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill email and password');
      return;
    }
    setLoading(true);
    try {
      await authService.sendBindEmailCode(email, password);
      Alert.alert('Success', t('emailCodeSent'));
      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }
    setLoading(true);
    try {
      await authService.confirmEmail(email, code);
      Alert.alert('Success', t('emailBindSuccess'));
      await refreshProfile();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('emailBindFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.container} activeOpacity={1}>
            <Text style={styles.title}>{t('bindEmail')}</Text>
            
            {step === 1 ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('bindEmailPasswordPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <View style={styles.buttons}>
                  <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                    <Text style={styles.cancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
                    {loading ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.submitText}>{t('sendVerificationCode')}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.infoText}>{t('emailCodeSent')} {email}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('emailCodePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                />
                <View style={styles.buttons}>
                  <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setStep(1)}>
                    <Text style={styles.cancelText}>{t('back')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.button} onPress={handleConfirm} disabled={loading}>
                    {loading ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.submitText}>{t('confirmBindEmail')}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
