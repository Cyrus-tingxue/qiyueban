import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import AvatarIcon from '../components/AvatarIcon';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { t } = useLang();
  const { login } = useAuth();
  const router = useRouter();
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState('eye');

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const data = await authService.login(username, password);
      await login(data.user, data.token);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }
    setLoading(true);
    try {
      const data = await authService.register(username, password, nickname, avatar, email);
      await login(data.user, data.token);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!email) return Alert.alert('Error', 'Please enter email');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert('Success', t('resetCodeSent'));
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !code || !password) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);
    try {
      await authService.resetPassword(email, code, password);
      Alert.alert('Success', t('passwordResetSuccess'));
      setMode('login');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('passwordResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'login' ? t('loginTitle') : mode === 'register' ? t('registerTitle') : t('resetPasswordTitle')}
            </Text>
          </View>
          
          <View style={styles.form}>
            {mode === 'forgot' ? (
              <>
                <TextInput style={styles.input} placeholder={t('emailPlaceholder')} placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TouchableOpacity style={styles.outlineBtn} onPress={handleSendCode} disabled={loading}>
                  <Text style={styles.outlineBtnText}>{t('sendVerificationCode')}</Text>
                </TouchableOpacity>
                <TextInput style={styles.input} placeholder={t('emailVerificationCode')} placeholderTextColor={Colors.textMuted} value={code} onChangeText={setCode} keyboardType="number-pad" />
                <TextInput style={styles.input} placeholder={t('newPassword')} placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
                
                <TouchableOpacity style={styles.mainButton} onPress={handleResetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.mainButtonText}>{t('confirmReset')}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput style={styles.input} placeholder={t('usernamePlaceholder')} placeholderTextColor={Colors.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" />
                <TextInput style={styles.input} placeholder={t('passwordPlaceholder')} placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
                
                {mode === 'register' && (
                  <>
                    <TextInput style={styles.input} placeholder={t('nicknamePlaceholder')} placeholderTextColor={Colors.textMuted} value={nickname} onChangeText={setNickname} autoComplete="off" textContentType="none" />
                    <TextInput style={styles.input} placeholder={t('registerEmailPlaceholder')} placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    
                    <Text style={styles.label}>{t('chooseAvatar')}</Text>
                    <View style={styles.avatarRow}>
                      {['eye', 'ear', 'nose', 'mouth'].map((type) => (
                        <TouchableOpacity key={type} style={[styles.avatarOption, avatar === type && styles.avatarSelected]} onPress={() => setAvatar(type)}>
                          <AvatarIcon type={type} size={50} isAnimating={avatar === type} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                
                <TouchableOpacity style={styles.mainButton} onPress={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
                  {loading ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.mainButtonText}>{mode === 'login' ? t('loginBtn') : t('register')}</Text>}
                </TouchableOpacity>
              </>
            )}
            
            <View style={styles.footerLinks}>
              {mode !== 'login' && (
                <TouchableOpacity onPress={() => setMode('login')}>
                  <Text style={styles.linkText}>{t('backToLogin')}</Text>
                </TouchableOpacity>
              )}
              {mode !== 'register' && mode !== 'forgot' && (
                <TouchableOpacity onPress={() => setMode('register')}>
                  <Text style={styles.linkText}>{t('registerAccount')}</Text>
                </TouchableOpacity>
              )}
              {mode === 'login' && (
                <TouchableOpacity onPress={() => setMode('forgot')}>
                  <Text style={styles.linkText}>{t('forgotPassword')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20 },
  backBtn: { marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { color: Colors.text, fontSize: 24, fontWeight: 'bold' },
  form: { gap: 16 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 8, padding: 16, color: Colors.text, fontSize: 16 },
  label: { color: Colors.text, fontSize: 16, marginTop: 8 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  avatarOption: { borderWidth: 2, borderColor: 'transparent', borderRadius: 8, padding: 4 },
  avatarSelected: { borderColor: Colors.primary },
  mainButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  mainButtonText: { color: Colors.textOnPrimary, fontSize: 18, fontWeight: 'bold' },
  outlineBtn: { borderWidth: 1, borderColor: Colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  outlineBtnText: { color: Colors.primary, fontSize: 16 },
  footerLinks: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  linkText: { color: Colors.info, fontSize: 16 },
});
