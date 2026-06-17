import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { useLang } from '../../../contexts/LanguageContext';
import { messageService } from '../../../services/messageService';
import { authService } from '../../../services/authService';
import RichContent from '../../../components/RichContent';
import AvatarIcon from '../../../components/AvatarIcon';
import EmojiPicker from '../../../components/EmojiPicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { postService } from '../../../services/postService';
import { useAuth } from '../../../contexts/AuthContext';

export default function PrivateChatScreen() {
  const { userId, name, avatar } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLang();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<any[]>([]);
  // Initialize with URL params if available
  const [otherUser, setOtherUser] = useState<any>(
    name ? { nickname: name, avatar: avatar } : null
  );
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await messageService.getMessages(Number(userId), 0, 50);
      const msgArray = Array.isArray(res) ? res : (res.items || []);
      const newBatch = [...msgArray].reverse(); // [Newest, ..., Oldest]

      if (newBatch.length > 0) {
        const sampleMsg = newBatch[0];
        const otherUserInfo = sampleMsg.sender_id === Number(userId) ? sampleMsg.sender : sampleMsg.receiver;
        if (otherUserInfo) {
          setOtherUser(prev => ({ ...prev, ...otherUserInfo }));
        }
      }

      setMessages(prev => {
        if (prev.length === 0) {
          if (newBatch.length < 50) setHasMore(false);
          return newBatch;
        }
        
        const currentNewestId = prev[0].id;
        const latestFetchedId = newBatch[0]?.id;
        
        if (latestFetchedId && latestFetchedId > currentNewestId) {
          const trulyNewMessages = newBatch.filter(m => m.id > currentNewestId);
          return [...trulyNewMessages, ...prev];
        }
        
        return prev;
      });
      messageService.markAsRead(Number(userId)).catch(console.warn);
      setLoading(false);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchOtherUser = async () => {
    if (otherUser?.id) return; // already have full info
    try {
      const friends = await messageService.getFriends();
      const friendRecord = friends.find((f: any) => f.friend.id === Number(userId));
      if (friendRecord) {
        setOtherUser(friendRecord.friend);
      }
    } catch (e) {}
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await messageService.getMessages(Number(userId), nextPage * 50, 50);
      const msgArray = Array.isArray(res) ? res : (res.items || []);
      const olderBatch = [...msgArray].reverse(); // [Newest_of_old_batch, ..., Oldest]
      
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
      fetchMessages();
      fetchOtherUser();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }, [fetchMessages])
  );

  const handleSend = async () => {
    if (!inputText.trim()) return;
    setSending(true);
    try {
      const sentMsg = await messageService.sendMessage(Number(userId), inputText);
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
        const sentMsg = await messageService.sendMessage(Number(userId), msgStr);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMessages(prev => [sentMsg, ...prev]);
      } catch (e) {
        Alert.alert('Error', t('uploadFailed'));
      } finally {
        setSending(false);
      }
    }
  };

  const handleClear = () => {
    Alert.alert(t('clearHistory'), t('clearConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { 
        text: t('clearHistory'), 
        style: 'destructive',
        onPress: async () => {
          try {
            await messageService.deleteConversation(Number(userId));
            setMessages([]);
            router.back();
          } catch (e) {
            Alert.alert('Error', t('clearFailed'));
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{otherUser?.nickname || t('chattingWith').replace('{id}', String(userId))}</Text>
            {otherUser?.is_online && <Text style={styles.onlineText}>{t('onlineNow')}</Text>}
          </View>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => {
            const isSelf = item.sender_id !== Number(userId);
            
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
                  {!isSelf && <AvatarIcon type={otherUser?.avatar || 'eye'} size={32} isAnimating={false} />}
                  <View style={styles.bubbleContainer}>
                    {!isSelf && <Text style={styles.senderName}>{otherUser?.nickname || item.sender?.nickname || '匿名'}</Text>}
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
        )}

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
      </KeyboardAvoidingView>

      <EmojiPicker visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onSelect={(emoji) => setInputText(prev => prev + emoji)} />
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
  onlineText: { color: Colors.online, fontSize: 12 },
  clearBtn: { padding: 8 },
  dateSeparator: { alignSelf: 'center', color: Colors.textMuted, fontSize: 12, marginVertical: 12, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  listContent: { padding: 16, gap: 12 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginVertical: 20 },
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
});
