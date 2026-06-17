import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { Colors } from '../constants/Colors';
import AnnouncementModal from '../components/AnnouncementModal';
import { useEffect } from 'react';
import { updater } from '../utils/updater';

export default function RootLayout() {
  useEffect(() => {
    updater.checkUpdate();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AnnouncementModal />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ title: '帖子详情' }} />
          <Stack.Screen name="post/create" options={{ title: '发帖' }} />
          <Stack.Screen name="chat/private/[userId]" options={{ title: '私聊' }} />
          <Stack.Screen name="chat/group/[groupId]" options={{ title: '群聊' }} />
          <Stack.Screen name="admin" options={{ title: '管理后台' }} />
          <Stack.Screen name="reset-password" options={{ title: '重置密码', presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </LanguageProvider>
  );
}
