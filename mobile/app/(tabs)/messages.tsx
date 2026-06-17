import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useLang } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { messageService } from '../../services/messageService';
import AvatarIcon from '../../components/AvatarIcon';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { eventBus, Events } from '../../utils/events';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { formatRelativeTime } from '../../utils/time';

export default function MessagesScreen() {
  const { t } = useLang();
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const layout = useWindowDimensions();
  
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'friends', title: '好友' },
    { key: 'groups', title: '群组' },
  ]);
  
  const [friends, setFriends] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  
  const [groups, setGroups] = useState<any[]>([]);
  const [groupInvites, setGroupInvites] = useState<any[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchInput, setGroupSearchInput] = useState('');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchInput, setFriendSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const [fRes, cRes, frRes, gRes, giRes] = await Promise.all([
        messageService.getFriends(),
        messageService.getConversations(),
        messageService.getFriendRequests(),
        messageService.getGroups(),
        messageService.getGroupInvites()
      ]);
      setFriends(fRes);
      setConversations(cRes);
      setFriendRequests(frRes);
      setGroups(gRes);
      setGroupInvites(giRes);
    } catch (e) {
      console.warn(e);
    }
  }, [isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      
      const handleEvent = () => fetchData();
      eventBus.on(Events.MESSAGE_DATA_CHANGED, handleEvent);
      
      return () => {
        clearInterval(interval);
        eventBus.off(Events.MESSAGE_DATA_CHANGED, handleEvent);
      };
    }, [fetchData])
  );

  const handleAcceptFriendRequest = async (requestId: number) => {
    try {
      await messageService.acceptFriendRequest(requestId);
      fetchData();
    } catch (e) {}
  };

  const handleRejectFriendRequest = async (requestId: number) => {
    try {
      await messageService.rejectFriendRequest(requestId);
      fetchData();
    } catch (e) {}
  };

  const handleAcceptGroupInvite = async (inviteId: number) => {
    try {
      await messageService.acceptGroupInvite(inviteId);
      fetchData();
    } catch (e) {}
  };

  const handleRejectGroupInvite = async (inviteId: number) => {
    try {
      await messageService.rejectGroupInvite(inviteId);
      fetchData();
    } catch (e) {}
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('pleaseLogin')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>{t('goLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unreadConversationMap = React.useMemo(() => {
    const map = new Map();
    conversations.forEach((item) => {
      map.set(item.with_user?.uid, item.unread_count || 0);
    });
    return map;
  }, [conversations]);

  const incomingFriendRequests = friendRequests.filter((item) => item.direction === 'incoming');
  const joinedGroups = groups.filter((group) => group.is_member);

  const renderScene = ({ route }: any) => {
    switch (route.key) {
      case 'friends': {
        const filteredFriends = friends.filter(f => 
          (f.friend?.nickname?.toLowerCase() || '').includes(friendSearchQuery.toLowerCase()) || 
          (f.friend?.username?.toLowerCase() || '').includes(friendSearchQuery.toLowerCase())
        );
        return (
          <FlatList
            data={[...incomingFriendRequests, ...filteredFriends]}
            keyExtractor={(item, idx) => `friend-${idx}`}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListHeaderComponent={
              <View>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="搜索好友..."
                    placeholderTextColor={Colors.textMuted}
                    value={friendSearchInput}
                    onChangeText={setFriendSearchInput}
                  />
                  <TouchableOpacity onPress={() => setFriendSearchQuery(friendSearchInput)} style={{paddingHorizontal: 8, paddingVertical: 4}}>
                    <Text style={{color: Colors.primary, fontWeight: 'bold'}}>搜索</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionTitle}>{t('friends')} ({filteredFriends.length})</Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.emptyText}>{t('noFriendsYet')}</Text>}
            renderItem={({ item }) => {
              if (item.direction) {
                // This is a friend request
                return (
                  <View style={styles.listItem}>
                    <AvatarIcon type={item.other_user?.avatar || 'eye'} size={40} isAnimating={false} />
                    <View style={styles.listTextContainer}>
                      <Text style={styles.listTitle}>{item.other_user?.nickname || item.other_user?.username}</Text>
                      <Text style={[styles.listSubtitle, {color: Colors.primary}]}>请求添加好友</Text>
                    </View>
                    <View style={{flexDirection: 'row', gap: 8}}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleAcceptFriendRequest(item.id)}>
                        <Text style={styles.actionBtnText}>同意</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border}]} onPress={() => handleRejectFriendRequest(item.id)}>
                        <Text style={[styles.actionBtnText, {color: Colors.textSecondary}]}>拒绝</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              } else {
                // This is a friend
                const f = item.friend;
                if (!f) return null;
                const unreadCount = unreadConversationMap.get(f.uid) || 0;
                return (
                  <TouchableOpacity 
                    style={styles.listItem} 
                    onPress={() => router.push({
                      pathname: `/chat/private/${f.uid}`,
                      params: { name: f.nickname || f.username, avatar: f.avatar }
                    })}
                    onLongPress={() => {
                      Alert.alert(t('deleteFriend') || '删除好友', `确定要删除好友 ${f.nickname || f.username} 吗？`, [
                        { text: t('cancel') || '取消', style: 'cancel' },
                        { text: t('delete') || '删除', style: 'destructive', onPress: async () => {
                          try {
                            await messageService.removeFriend(f.uid);
                            fetchData();
                          } catch (e) {
                            console.warn(e);
                          }
                        }}
                      ]);
                    }}
                  >
                    <View style={{ width: 40, height: 40 }}>
                      <AvatarIcon type={f.avatar || 'eye'} size={40} isAnimating={false} />
                      {f.is_online && <View style={styles.onlineDot} />}
                    </View>
                    <View style={styles.listTextContainer}>
                      <Text style={styles.listTitle}>{f.nickname || f.username}</Text>
                      <Text style={styles.listSubtitle}>{f.is_online ? t('onlineNow') : t('lastSeen') + ' ' + formatRelativeTime(f.last_seen_at)}</Text>
                    </View>
                    {unreadCount > 0 && (
                      <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
                    )}
                  </TouchableOpacity>
                );
              }
            }}
          />
        );
      }
      case 'groups': {
        const filteredGroups = joinedGroups.filter(g => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()));
        return (
          <FlatList
            data={[...groupInvites, ...filteredGroups]}
            keyExtractor={(item, idx) => `group-item-${idx}`}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListHeaderComponent={
              <View>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="搜索群组..."
                    placeholderTextColor={Colors.textMuted}
                    value={groupSearchInput}
                    onChangeText={setGroupSearchInput}
                  />
                  <TouchableOpacity onPress={() => setGroupSearchQuery(groupSearchInput)} style={{paddingHorizontal: 8, paddingVertical: 4}}>
                    <Text style={{color: Colors.primary, fontWeight: 'bold'}}>搜索</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionTitle}>{t('groupDirectory')} ({filteredGroups.length})</Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.emptyText}>{t('noGroupsYet')}</Text>}
            renderItem={({ item }) => {
              if (item.status === 'pending') {
                return (
                  <View style={styles.listItem}>
                    <View style={styles.groupIconPlaceholder}><Ionicons name="mail" size={24} color={Colors.primary} /></View>
                    <View style={styles.listTextContainer}>
                      <Text style={styles.listTitle}>{item.group?.name || '未知群聊'}</Text>
                      <Text style={[styles.listSubtitle, {color: Colors.primary}]}>邀请您加入群聊</Text>
                    </View>
                    <View style={{flexDirection: 'row', gap: 8}}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleAcceptGroupInvite(item.id)}>
                        <Text style={styles.actionBtnText}>同意</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border}]} onPress={() => handleRejectGroupInvite(item.id)}>
                        <Text style={[styles.actionBtnText, {color: Colors.textSecondary}]}>拒绝</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              } else {
                const group = item;
                return (
                  <TouchableOpacity 
                    style={styles.listItem} 
                    onPress={() => router.push(`/chat/group/${group.id}`)}
                    onLongPress={() => {
                      Alert.alert(
                        '退出群聊',
                        `确定要退出群聊 "${group.name}" 吗？`,
                        [
                          { text: '取消', style: 'cancel' },
                          { 
                            text: '退出', 
                            style: 'destructive', 
                            onPress: async () => {
                              try {
                                await messageService.leaveGroup(group.id);
                                fetchData();
                              } catch (e: any) {
                                Alert.alert('提示', e.response?.data?.detail || '退出失败');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <View style={styles.groupIconPlaceholder}><Ionicons name="people" size={24} color={Colors.primary} /></View>
                    <View style={styles.listTextContainer}>
                      <Text style={styles.listTitle}>{group.name}</Text>
                      <Text style={styles.listSubtitle}>{group.member_count} {t('members')}</Text>
                    </View>
                    {group.unread_count > 0 && (
                      <View style={styles.badge}><Text style={styles.badgeText}>{group.unread_count}</Text></View>
                    )}
                  </TouchableOpacity>
                );
              }
            }}
          />
        );
      }
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
      labelStyle={{ fontWeight: 'bold' }}
      getLabelText={({ route }) => route.title}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: 20 },
  loginBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  loginBtnText: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: 'bold', margin: 16, marginBottom: 8 },
  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0a0e14', 
    borderWidth: 1,
    borderColor: '#331515',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
  },
  listTextContainer: { flex: 1, marginLeft: 12 },
  listTitle: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  listSubtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  badge: { backgroundColor: Colors.badge, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  badgeText: { color: Colors.badgeText, fontSize: 12, fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.surface },
  groupIconPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  actionBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { color: Colors.textOnPrimary, fontSize: 12, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0e14', borderRadius: 20, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: '#331515' },
  searchInput: { flex: 1, color: Colors.text, paddingVertical: 8, marginLeft: 8 },
});
