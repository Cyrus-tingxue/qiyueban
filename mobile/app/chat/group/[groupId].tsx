import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { useLang } from '../../../contexts/LanguageContext';
import { messageService } from '../../../services/messageService';
import { useAuth } from '../../../contexts/AuthContext';
import RichContent from '../../../components/RichContent';
import AvatarIcon from '../../../components/AvatarIcon';
import EmojiPicker from '../../../components/EmojiPicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { postService } from '../../../services/postService';

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLang();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  const openInviteModal = async () => {
    try {
      const res = await messageService.getFriends();
      const inviteable = res.filter((f: any) => !groupInfo?.members?.some((m: any) => m.uid === f.friend.uid));
      setFriends(inviteable);
      setShowInviteModal(true);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleInvite = async (friendId: number) => {
    try {
      await messageService.inviteGroupMember(Number(groupId), friendId);
      Alert.alert('Success', '邀请已发送');
      setShowInviteModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Invite failed');
    }
  };

  const fetchGroupData = useCallback(async () => {
    try {
      const gInfo = await messageService.getGroupDetail(Number(groupId));
      setGroupInfo(gInfo);
      
      const member = gInfo.members?.find((m: any) => m.uid === user?.uid);
      setIsMember(!!member);

      if (member) {
        const res = await messageService.getGroupMessages(Number(groupId), 0, 50);
        const msgArray = Array.isArray(res) ? res : (res.items || []);
        const newBatch = [...msgArray].reverse(); // [Newest, ..., Oldest]

        setMessages(prev => {
          if (prev.length === 0) {
            if (newBatch.length < 50) setHasMore(false);
            return newBatch;
          }
          
          const currentNewestId = prev[0]?.id;
          const latestFetchedId = newBatch[0]?.id;
          
          if (latestFetchedId && currentNewestId && latestFetchedId > currentNewestId) {
            const trulyNewMessages = newBatch.filter(m => m.id > currentNewestId);
            return [...trulyNewMessages, ...prev];
          }
          
          return prev;
        });
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await messageService.getGroupMessages(Number(groupId), nextPage * 50, 50);
      const msgArray = Array.isArray(res) ? res : (res.items || []);
      const olderBatch = [...msgArray].reverse();
      
      if (olderBatch.length < 50) {
        setHasMore(false);
      }
      
      if (olderBatch.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueOlder = olderBatch.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueOlder];
        });
        setPage(nextPage);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroupData();
      const interval = setInterval(fetchGroupData, 2000);
      return () => clearInterval(interval);
    }, [fetchGroupData])
  );

  const handleJoin = async () => {
    try {
      await messageService.joinGroup(Number(groupId));
      Alert.alert('Success', 'Joined group');
      fetchGroupData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to join');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    setSending(true);
    try {
      const sentMsg = await messageService.sendGroupMessage(Number(groupId), inputText);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMessages(prev => [sentMsg, ...prev]);
      setInputText('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSending(true);
      try {
        const uploadRes = await postService.uploadImage(result.assets[0].uri);
        const msgStr = `[img:${uploadRes.url}]`;
        const sentMsg = await messageService.sendGroupMessage(Number(groupId), msgStr);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMessages(prev => [sentMsg, ...prev]);
      } catch (e) {
        Alert.alert('Error', t('uploadFailed'));
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{groupInfo?.name || 'Group Chat'}</Text>
            <Text style={styles.subTitle}>{groupInfo?.member_count || 0} {t('members')}</Text>
          </View>
          {isMember && (
            <TouchableOpacity onPress={openInviteModal} style={styles.inviteBtn}>
              <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
        ) : !isMember ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>You are not a member of this group</Text>
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
              <Text style={styles.joinBtnText}>{t('joinGroup')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={messages}
              inverted
              keyExtractor={item => item.id.toString()}
              renderItem={({ item, index }) => {
                const isSelf = item.sender_id === user?.uid;
                
                let showDate = false;
                let dateText = '';
                
                if (index === messages.length - 1) {
                  showDate = true;
                } else {
                  const prevItem = messages[index + 1];
                  const currentMs = new Date(item.created_at).getTime();
                  const prevMs = new Date(prevItem.created_at).getTime();
                  if (currentMs - prevMs > 5 * 60 * 1000) {
                    showDate = true;
                  }
                }
                
                if (showDate) {
                  const date = new Date(item.created_at);
                  const now = new Date();
                  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  if (isToday) {
                    dateText = item.created_at?.substring(11, 16);
                  } else if (date.getFullYear() === now.getFullYear()) {
                    dateText = item.created_at?.substring(5, 16).replace('-', '/');
                  } else {
                    dateText = item.created_at?.substring(0, 16).replace(/-/g, '/');
                  }
                }

                return (
                  <View>
                    {showDate && <Text style={styles.dateSeparator}>{dateText}</Text>}
                    <View style={[styles.messageRow, isSelf ? styles.messageRowSelf : styles.messageRowOther]}>
                      {!isSelf && <AvatarIcon type={item.sender?.avatar || 'eye'} size={32} isAnimating={false} />}
                      <View style={styles.bubbleContainer}>
                        {!isSelf && <Text style={styles.senderName}>{item.sender?.nickname || item.sender?.username || '匿名'}</Text>}
                        <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
                          <RichContent text={item.content} />
                          <Text style={styles.msgTime}>{item.created_at?.substring(11, 16)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('sayHello')}</Text>}
              contentContainerStyle={styles.listContent}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.5}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 10 }} /> : null}
            />

            <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
              <TouchableOpacity onPress={() => setShowEmojiPicker(true)} style={styles.iconBtn}>
                <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
                <Ionicons name="image-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder={t('chatPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && {opacity: 0.5}]} onPress={handleSend} disabled={!inputText.trim() || sending}>
                {sending ? <ActivityIndicator size="small" color={Colors.textOnPrimary} /> : <Ionicons name="send" size={20} color={Colors.textOnPrimary} />}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <EmojiPicker visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onSelect={(emoji) => setInputText(prev => prev + emoji)} />

      <Modal visible={showInviteModal} transparent animationType="slide" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>邀请好友</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={friends}
              keyExtractor={(f) => f.friend.uid.toString()}
              ListEmptyComponent={<Text style={styles.emptyText}>暂无好友可邀请</Text>}
              renderItem={({ item }) => (
                <View style={styles.friendItem}>
                  <AvatarIcon type={item.friend.avatar || 'eye'} size={40} isAnimating={false} />
                  <Text style={styles.friendName}>{item.friend.nickname || item.friend.username}</Text>
                  <TouchableOpacity style={styles.inviteActionBtn} onPress={() => handleInvite(item.friend.uid)}>
                    <Text style={styles.inviteActionText}>邀请</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 16 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
  subTitle: { color: Colors.textSecondary, fontSize: 12 },
  listContent: { padding: 16, gap: 12 },
  dateSeparator: { alignSelf: 'center', color: Colors.textMuted, fontSize: 12, marginVertical: 12, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginVertical: 20 },
  joinBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  joinBtnText: { color: Colors.textOnPrimary, fontWeight: 'bold' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  messageRowSelf: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  bubbleContainer: { maxWidth: '75%', marginLeft: 8 },
  senderName: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4, marginLeft: 4 },
  bubble: { padding: 12, borderRadius: 16 },
  bubbleSelf: { backgroundColor: Colors.bubbleSelf, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.bubbleOther, borderBottomLeftRadius: 4 },
  msgTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  iconBtn: { padding: 8 },
  input: { flex: 1, backgroundColor: Colors.inputBg, color: Colors.text, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, minHeight: 40, maxHeight: 100, fontSize: 16 },
  sendBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  inviteBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '70%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
  modalCloseBtn: { padding: 4 },
  friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  friendName: { color: Colors.text, flex: 1, marginLeft: 12, fontSize: 16 },
  inviteActionBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  inviteActionText: { color: Colors.textOnPrimary, fontSize: 14, fontWeight: 'bold' },
});
