import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useLang } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { postService } from '../../services/postService';
import { messageService } from '../../services/messageService';
import AvatarIcon from '../../components/AvatarIcon';
import RichContent from '../../components/RichContent';
import EmojiPicker from '../../components/EmojiPicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function PostDetailScreen() {
  const { id, initialPost } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLang();
  const { isLoggedIn, user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Try to load initial data instantly for a zero-latency experience
  let parsedInitial = null;
  try {
    if (initialPost) parsedInitial = JSON.parse(initialPost as string);
  } catch (e) {}

  const [post, setPost] = useState<any>(parsedInitial);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(!parsedInitial);
  const [isFriend, setIsFriend] = useState(false);
  
  const [replyContent, setReplyContent] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, isLoggedIn]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postData, repliesDataResponse] = await Promise.all([
        postService.getPost(Number(id)),
        postService.getReplies(Number(id))
      ]);
      
      let repliesData = Array.isArray(repliesDataResponse) ? repliesDataResponse : (repliesDataResponse.items || []);

      if (isLoggedIn && user) {
        try {
          const [likeData, likedReplies] = await Promise.all([
            postService.checkLike(Number(id)).catch(() => null),
            postService.getLikedReplies(Number(id)).catch(() => [])
          ]);
          
          if (likeData) {
            postData.is_liked = likeData.is_liked;
            postData.like_count = likeData.like_count;
          }
          
          if (likedReplies && likedReplies.length > 0) {
            const likedSet = new Set(likedReplies);
            repliesData = repliesData.map((r: any) => ({
              ...r,
              is_liked: likedSet.has(r.id)
            }));
          }
        } catch (e) {}

        if (postData.author_id !== user.uid) {
          messageService.getFriends().then(friendsData => {
            const friendIds = friendsData.map((f: any) => f.friend?.uid);
            setIsFriend(friendIds.includes(postData.author_id));
          }).catch(() => {});
        }
      }

      setPost(postData);
      setReplies(repliesData);
    } catch (e) {
      Alert.alert(t('pageError'), t('postLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!isLoggedIn) return Alert.alert('Notice', t('loginToLike'));
    
    setPost((prev: any) => {
      if (!prev) return prev;
      const isLiked = !prev.is_liked;
      const count = prev.like_count || 0;
      return { ...prev, is_liked: isLiked, like_count: count + (isLiked ? 1 : -1) };
    });

    try {
      await postService.toggleLike(Number(id));
    } catch (e) {
      // Revert on error
      setPost((prev: any) => {
        if (!prev) return prev;
        const isLiked = !prev.is_liked;
        const count = prev.like_count || 0;
        return { ...prev, is_liked: isLiked, like_count: count + (isLiked ? 1 : -1) };
      });
      console.warn(e);
    }
  };

  const handleSendReply = async () => {
    if (!isLoggedIn) return Alert.alert('Notice', t('loginToReply'));
    if (!replyContent.trim()) return;
    
    setSubmitting(true);
    try {
      await postService.createReply(Number(id), {
        content: replyContent,
        reply_to_id: replyTo?.id,
      });
      setReplyContent('');
      setReplyTo(null);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('replyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    if (!isLoggedIn) return Alert.alert('Notice', t('loginToReply'));
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSubmitting(true);
      try {
        const uploadRes = await postService.uploadImage(result.assets[0].uri);
        setReplyContent(prev => prev + `[img:${uploadRes.url}]`);
      } catch (e) {
        Alert.alert('Error', t('uploadFailed'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!post) {
    return <View style={styles.center}><Text style={{color: Colors.text}}>{t('postNotExist')}</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Post Header */}
          <View style={styles.postCard}>
            <View style={styles.headerRow}>
              <View style={styles.authorInfo}>
                <AvatarIcon type={post.author_avatar || 'eye'} size={40} />
                <View style={styles.authorText}>
                  <Text style={styles.nickname}>{post.author || '匿名'}</Text>
                  <Text style={styles.timestamp}>{post.created_at?.substring(0, 16)}</Text>
                </View>
              </View>
              {post.is_grave && <View style={styles.graveBadge}><Text style={styles.graveText}>坟</Text></View>}
            </View>
            <Text style={styles.title}>{post.title}</Text>
            <RichContent text={post.content} />
            
            <View style={styles.postFooter}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleLikePost}>
                <Ionicons name={post.is_liked ? "heart" : "heart-outline"} size={20} color={post.is_liked ? Colors.primary : Colors.textSecondary} />
                <Text style={styles.actionText}>{post.like_count || 0}</Text>
              </TouchableOpacity>
              {isLoggedIn && post.author_id !== user?.uid && (
                <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                  if (isFriend) {
                    router.push({
                      pathname: `/chat/private/${post.author_id}`,
                      params: { name: post.author, avatar: post.author_avatar }
                    });
                  } else {
                    try {
                      await messageService.sendFriendRequest(post.author_id);
                      Alert.alert('提示', '好友申请已发送');
                    } catch (e: any) {
                      Alert.alert('提示', e.response?.data?.detail || '发送失败，请检查网络');
                    }
                  }
                }}>
                  <Ionicons name={isFriend ? "chatbubbles-outline" : "person-add-outline"} size={20} color={Colors.textSecondary} />
                  <Text style={styles.actionText}>{isFriend ? t('sendMessage') : t('addFriend')}</Text>
                </TouchableOpacity>
              )}
              {isLoggedIn && post.author_id === user?.uid && !user?.is_admin && !post.is_grave && (
                <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                  try {
                    await postService.requestGravePost(post.id);
                    Alert.alert('提示', '已提交坟贴申请，等待管理员审核');
                  } catch (e: any) {
                    Alert.alert('提示', e.response?.data?.detail || '申请失败');
                  }
                }}>
                  <Ionicons name="archive-outline" size={20} color={Colors.textSecondary} />
                  <Text style={styles.actionText}>申请坟贴</Text>
                </TouchableOpacity>
              )}
              {isLoggedIn && user?.is_admin && !post.is_grave && (
                <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                  try {
                    await postService.markPostGrave(post.id);
                    Alert.alert('提示', '已直接设为坟贴');
                    fetchData();
                  } catch (e: any) {
                    Alert.alert('提示', e.response?.data?.detail || '设置失败');
                  }
                }}>
                  <Ionicons name="archive" size={20} color={Colors.danger} />
                  <Text style={[styles.actionText, {color: Colors.danger}]}>设为坟贴</Text>
                </TouchableOpacity>
              )}
              {isLoggedIn && (post.author_id === user?.uid || user?.is_admin) && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  Alert.alert('确认删除', '确定要删除这篇帖子吗？此操作不可恢复。', [
                    { text: '取消', style: 'cancel' },
                    { text: '删除', style: 'destructive', onPress: async () => {
                      try {
                        await postService.deletePost(post.id);
                        Alert.alert('提示', '帖子已删除');
                        router.back();
                      } catch (e: any) {
                        Alert.alert('提示', e.response?.data?.detail || '删除失败');
                      }
                    }}
                  ]);
                }}>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  <Text style={[styles.actionText, {color: Colors.danger}]}>删除</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Replies Section */}
          <View style={styles.repliesSection}>
            <Text style={styles.sectionTitle}>{t('replySection')} ({replies.length})</Text>
            {replies.map((reply, index) => (
              <View key={reply.id} style={styles.replyCard}>
                <View style={styles.replyHeader}>
                  <View style={styles.authorInfo}>
                    <AvatarIcon type={reply.author_avatar || 'eye'} size={32} isAnimating={false} />
                    <View style={styles.authorText}>
                      <Text style={styles.replyNickname}>{reply.author || '匿名'}</Text>
                      <Text style={styles.timestamp}>{reply.created_at?.substring(0, 16)}</Text>
                    </View>
                  </View>
                  <Text style={styles.floorText}>#{index + 1}</Text>
                </View>
                
                {reply.reply_to_id && (
                  <View style={styles.quoteBox}>
                    <Text style={styles.quoteText}>{t('replyToBadge')}{reply.reply_to_username}</Text>
                  </View>
                )}
                
                <RichContent text={reply.content} />
                
                <View style={styles.replyActions}>
                  <TouchableOpacity onPress={() => setReplyTo(reply)}>
                    <Text style={styles.replyBtnText}>{t('reply')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {replies.length === 0 && (
              <Text style={styles.emptyReplies}>{t('noReplies')}</Text>
            )}
          </View>
        </ScrollView>

        {/* Input Bar */}
        {!post.is_grave && (
          <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            {replyTo && (
              <View style={styles.replyingToBar}>
                <Text style={styles.replyingToText}>{t('replyingTo')} {replyTo.author_name}</Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity onPress={() => setShowEmojiPicker(true)} style={styles.iconBtn}>
                <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
                <Ionicons name="image-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder={t('replyPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={replyContent}
                onChangeText={setReplyContent}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, !replyContent.trim() && { opacity: 0.5 }]} 
                onPress={handleSendReply}
                disabled={!replyContent.trim() || submitting}
              >
                {submitting ? <ActivityIndicator size="small" color={Colors.textOnPrimary} /> : <Ionicons name="send" size={20} color={Colors.textOnPrimary} />}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <EmojiPicker 
        visible={showEmojiPicker} 
        onClose={() => setShowEmojiPicker(false)} 
        onSelect={(emoji) => setReplyContent(prev => prev + emoji)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  postCard: { backgroundColor: Colors.card, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  authorInfo: { flexDirection: 'row', alignItems: 'center' },
  authorText: { marginLeft: 10 },
  nickname: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  timestamp: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  graveBadge: { backgroundColor: Colors.textMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  graveText: { color: Colors.textOnPrimary, fontSize: 12, fontWeight: 'bold' },
  title: { color: Colors.text, fontSize: 20, fontWeight: 'bold', marginVertical: 12 },
  postFooter: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: Colors.textSecondary, fontSize: 14 },
  
  repliesSection: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  replyCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 12, marginBottom: 12 },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  replyNickname: { color: Colors.text, fontSize: 14, fontWeight: 'bold' },
  floorText: { color: Colors.textSecondary, fontSize: 12 },
  quoteBox: { backgroundColor: Colors.background, padding: 8, borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  quoteText: { color: Colors.textSecondary, fontSize: 12 },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  replyBtnText: { color: Colors.info, fontSize: 14 },
  emptyReplies: { color: Colors.textSecondary, textAlign: 'center', marginTop: 20 },

  inputArea: { backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, padding: 8 },
  replyingToBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.background, borderRadius: 8, marginBottom: 8 },
  replyingToText: { color: Colors.primary, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  iconBtn: { padding: 8 },
  input: { flex: 1, backgroundColor: Colors.inputBg, color: Colors.text, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, minHeight: 40, maxHeight: 100, fontSize: 16 },
  sendBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
