import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { Colors } from '../constants/Colors';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import AvatarIcon from './AvatarIcon';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LoginModal({ visible, onClose }: LoginModalProps) {
  const { t } = useLang();
  const { login } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
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
      onClose();
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
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.container} activeOpacity={1}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>{mode === 'login' ? t('loginTitle') : t('registerTitle')}</Text>
            </View>
            
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder={t('usernamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('passwordPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              
              {mode === 'register' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder={t('nicknamePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={nickname}
                    onChangeText={setNickname}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t('registerEmailPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.label}>{t('chooseAvatar')}</Text>
                  <View style={styles.avatarRow}>
                    {['eye', 'ear', 'nose', 'mouth'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.avatarOption, avatar === type && styles.avatarSelected]}
                        onPress={() => setAvatar(type)}
                      >
                        <AvatarIcon type={type} size={40} isAnimating={avatar === type} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              
              <TouchableOpacity
                style={styles.mainButton}
                onPress={mode === 'login' ? handleLogin : handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                  <Text style={styles.mainButtonText}>
                    {mode === 'login' ? t('loginBtn') : t('register')}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                <Text style={styles.switchButtonText}>
                  {mode === 'login' ? t('registerAccount') : t('haveAccount')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <SafeAreaView />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
    gap: 16,
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
  label: {
    color: Colors.text,
    fontSize: 14,
    marginTop: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  avatarOption: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    padding: 4,
  },
  avatarSelected: {
    borderColor: Colors.primary,
  },
  mainButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  mainButtonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
    padding: 8,
  },
  switchButtonText: {
    color: Colors.primary,
    fontSize: 14,
  },
});
