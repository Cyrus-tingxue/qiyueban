import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useLang } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import AvatarIcon from '../../components/AvatarIcon';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import BindEmailModal from '../../components/BindEmailModal';
import { postService } from '../../services/postService';
import PostItem from '../../components/PostItem';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';

export default function MyScreen() {
  const { t, lang, toggleLang } = useLang();
  const { isLoggedIn, user, logout } = useAuth();
  const router = useRouter();
  const layout = useWindowDimensions();
  
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'notifications', title: '我的消息' },
    { key: 'posts', title: '我的发帖' },
    { key: 'security', title: '账号安全' },
  ]);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        fetchNotifications();
        fetchMyPosts();
      }
    }, [isLoggedIn])
  );

  const fetchNotifications = async () => {
    try {
      const res = await postService.getNotifications();
      setNotifications(res.items || []);
    } catch (e) { console.warn(e); }
  };

  const fetchMyPosts = async () => {
    try {
      const res = await postService.getPosts(1, 20, null, 'newest', null, user?.uid);
      setMyPosts(res.items || []);
    } catch (e) { console.warn(e); }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('welcomeCenter')}</Text>
        <Text style={styles.emptyText}>{t('pleaseLogin')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>{t('goLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderScene = ({ route }: any) => {
    switch (route.key) {
      case 'notifications':
        return (
          <FlatList
            data={notifications}
            keyExtractor={(notif) => `notif-${notif.id}`}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListHeaderComponent={
              <View style={styles.actionHeader}>
                <TouchableOpacity style={styles.actionRow} onPress={async () => { await postService.readAllNotifications(); fetchNotifications(); }}>
                  <Ionicons name="checkmark-done" size={20} color={Colors.primary} />
                  <Text style={styles.actionRowText}>{t('markAllRead')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRow} onPress={async () => { await postService.clearReadNotifications(); fetchNotifications(); }}>
                  <Ionicons name="trash-outline" size={20} color={Colors.textSecondary} />
                  <Text style={[styles.actionRowText, { color: Colors.textSecondary }]}>删除已读</Text>
                </TouchableOpacity>
              </View>
            }
            ListEmptyComponent={<Text style={styles.emptyText}>{t('noNotifications')}</Text>}
            renderItem={({ item: notif }) => (
              <TouchableOpacity 
                style={[styles.notifItem, !notif.is_read && styles.notifUnread]} 
                onPress={async () => { 
                  if(!notif.is_read) await postService.readNotification(notif.id); 
                  if(notif.post_id) router.push(`/post/${notif.post_id}`);
                }}
              >
                <AvatarIcon type={notif.sender_avatar || 'eye'} size={40} isAnimating={false} />
                <View style={styles.notifTextContainer}>
                  <Text style={styles.notifText}>
                    <Text style={{fontWeight: 'bold', color: Colors.primary}}>
                      {notif.type === 'reply' ? '【回复通知】' : notif.type === 'mention' ? '【提及通知】' : notif.type === 'reply_mention' ? '【评论提及】' : notif.type === 'friend_request' ? '【好友申请】' : notif.type === 'grave_request' ? '【坟贴申请】' : notif.type === 'grave_approved' ? '【坟贴通过】' : notif.type === 'grave_rejected' ? '【坟贴驳回】' : '【系统通知】'} 
                    </Text>
                    <Text style={{fontWeight: 'bold'}}>{notif.sender_name}</Text>
                    {notif.type === 'reply' ? t('repliedYou') : notif.type === 'mention' ? t('mentionedYou') : notif.type === 'grave_request' ? ' 申请将帖子设为坟贴' : notif.type === 'grave_approved' ? ' 同意了您的坟贴申请' : notif.type === 'grave_rejected' ? ' 驳回了您的坟贴申请' : ''}
                  </Text>
                  {notif.post_title && <Text style={styles.notifSubtitle} numberOfLines={1}>{notif.post_title}</Text>}
                  <Text style={styles.notifTime}>{notif.created_at?.substring(0, 16)}</Text>
                </View>
                {!notif.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )}
          />
        );
      case 'posts':
        return (
          <FlatList
            data={myPosts}
            keyExtractor={(post) => `post-${post.id}`}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListEmptyComponent={<Text style={styles.emptyText}>{t('noPosts')}</Text>}
            renderItem={({ item: post }) => (
              <PostItem post={post} onPress={() => router.push(`/post/${post.id}`)} />
            )}
          />
        );
      case 'security':
        return (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
            <View style={styles.securitySection}>
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>{t('emailLabel')}</Text>
                  <Text style={styles.settingValue}>{user?.email || '未绑定'}</Text>
                </View>
                <TouchableOpacity style={styles.settingBtn} onPress={() => setShowEmailModal(true)}>
                  <Text style={styles.settingBtnText}>{user?.email ? t('updateEmail') : t('bindEmail')}</Text>
                </TouchableOpacity>
              </View>
      
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>{t('passwordLabel')}</Text>
                  <Text style={styles.settingValue}>********</Text>
                </View>
                <TouchableOpacity style={styles.settingBtn} onPress={() => setShowPasswordModal(true)}>
                  <Text style={styles.settingBtnText}>{t('changePassword')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>{t('langSwitch')}</Text>
                <TouchableOpacity style={styles.settingBtn} onPress={toggleLang}>
                  <Text style={styles.settingBtnText}>{lang === 'zh' ? 'EN' : '中'}</Text>
                </TouchableOpacity>
              </View>
      
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: Colors.primary }}
      style={{ backgroundColor: Colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: Colors.border }}
      activeColor={Colors.primary}
      inactiveColor={Colors.textSecondary}
      labelStyle={{ fontWeight: 'bold', fontSize: 14 }}
      getLabelText={({ route }) => route.title}
    />
  );

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      <AvatarIcon type={user?.avatar || 'eye'} size={60} />
      <View style={styles.profileInfo}>
        <Text style={styles.nickname}>{user?.nickname || user?.username}</Text>
        <Text style={styles.username}>@{user?.username} (UID: {user?.uid})</Text>
      </View>
      {user?.is_admin && (
        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
          <Ionicons name="settings-outline" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.adminText}>{t('adminTitle')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderHeader()}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />
      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <BindEmailModal visible={showEmailModal} onClose={() => setShowEmailModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: 20 },
  loginBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  loginBtnText: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.border },
  profileInfo: { flex: 1, marginLeft: 16 },
  nickname: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },
  username: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  adminBtn: { backgroundColor: Colors.warning, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  adminText: { color: Colors.textOnPrimary, fontSize: 12, fontWeight: 'bold' },
  
  actionHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, gap: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionRowText: { color: Colors.primary, fontSize: 14 },
  
  notifItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#0a0e14', 
    borderWidth: 1,
    borderColor: '#331515',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
  },
  notifUnread: { backgroundColor: Colors.card },
  notifTextContainer: { flex: 1, marginLeft: 12 },
  notifText: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  notifSubtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  notifTime: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, alignSelf: 'center', marginLeft: 8 },

  securitySection: { padding: 16 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLabel: { color: Colors.text, fontSize: 16 },
  settingValue: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  settingBtn: { borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  settingBtnText: { color: Colors.primary, fontSize: 14 },
  
  logoutBtn: { backgroundColor: Colors.danger, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  logoutBtnText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
});
