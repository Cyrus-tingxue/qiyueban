<template>
  <div class="post-detail-page">
    <button class="post-detail-back" @click="router.back()">{{ t('back') }}</button>

    <div v-if="loading" class="post-detail-card">
      <p>{{ t('loading') }}</p>
    </div>
    <div v-else-if="!post" class="post-detail-card">
      <p>{{ t('postNotExist') }}</p>
    </div>
    <template v-else>
      <div class="post-detail-card">
        <div class="post-detail-header">
          <span class="post-detail-category">【{{ categoryLabel }}】</span>
          <h1 class="post-detail-title">{{ post.title }}</h1>
        </div>
        <div class="post-detail-meta">
          <span class="post-detail-author-info">
            <AvatarIcon v-if="post.author_avatar" :type="post.author_avatar" :size="32" />
            <span>{{ post.author }}</span>
            <button
              v-if="isLoggedIn && user && user.uid !== post.author_id"
              class="send-message-btn"
              :disabled="messageActionLoading"
              @click="messageAction"
            >{{ messageLabel }}</button>
          </span>
          <span>{{ t('publishedAt') }}{{ post.created_at }}</span>
          <span>{{ post.reply_count || 0 }} {{ t('replyCount') }}</span>
        </div>
        <div class="post-detail-body">
          <div v-if="post.image_url && !post.content?.includes(`[img:${post.image_url}]`)" class="post-detail-attached-image">
            <img :src="post.image_url" alt="attached" />
          </div>
          <RichContent :text="post.content || t('noContent')" />
        </div>
        <div v-if="post.is_grave" class="grave-post-notice">该帖子已成坟贴，不可回复</div>
        <div class="post-detail-actions">
          <button :class="['post-like-btn', { liked: isLiked }]" @click="toggleLike">
            {{ isLiked ? t('liked') : t('like') }} {{ post.like_count > 0 ? `(${post.like_count})` : '' }}
          </button>
          <button v-if="isLoggedIn && user && (user.uid === post.author_id || user.is_admin)" class="post-delete-btn" @click="deletePost">
            {{ t('deletePost') }}
          </button>
          <button
            v-if="isLoggedIn && !post.is_grave && user && (user.is_admin || user.uid === post.author_id)"
            class="post-grave-btn"
            :disabled="graveRequestLoading"
            @click="requestGrave"
          >{{ graveRequestLoading ? '处理中...' : (user.is_admin ? '设为坟贴' : '申请坟贴') }}</button>
        </div>
      </div>

      <div class="reply-section">
        <h3 class="reply-section-title">{{ t('replySection') }} ({{ replies.length }})</h3>
        <p v-if="!replies.length" class="reply-empty">{{ t('noReplies') }}</p>
        <div v-else class="reply-list">
          <div v-for="(reply, index) in replies" :key="reply.id" class="reply-item">
            <div class="reply-item-header">
              <span class="reply-item-floor">#{{ index + 1 }}</span>
              <span class="reply-item-author">
                <AvatarIcon v-if="reply.author_avatar" :type="reply.author_avatar" :size="28" />
                <span>{{ reply.author }}</span>
              </span>
              <span class="reply-item-time">{{ reply.created_at }}</span>
            </div>
            <div class="reply-item-content">
              <span v-if="reply.reply_to_username" class="reply-to-badge">{{ t('replyToBadge') }}{{ reply.reply_to_username }}: </span>
              <div v-if="reply.image_url && !reply.content?.includes(`[img:${reply.image_url}]`)" class="reply-attached-image">
                <img :src="reply.image_url" alt="reply attached" />
              </div>
              <RichContent :text="reply.content" />
            </div>
            <div class="reply-item-actions">
              <button v-if="isLoggedIn && !post.is_grave" class="reply-action-btn" @click="replyTo(reply)">{{ t('comment') }}</button>
              <button :class="['reply-like-btn', { liked: reply.is_liked }]" @click="toggleReplyLike(reply)">
                {{ reply.is_liked ? '❤️' : '🤍' }} {{ reply.like_count > 0 ? reply.like_count : t('likes') }}
              </button>
              <button v-if="isLoggedIn && user && (user.uid === reply.author_id || user.is_admin)" class="reply-delete-btn" @click="deleteReply(reply.id)">
                {{ t('deleteReply') }}
              </button>
            </div>
          </div>
        </div>

        <p v-if="post.is_grave" class="reply-login-hint">该帖子已成坟贴，不可回复</p>
        <form v-else-if="isLoggedIn" class="reply-form" @submit.prevent="submitReply">
          <div class="reply-form-field">
            <div v-if="target && content.startsWith(`@${target.username}`)" class="reply-target-hint">
              {{ t('replyingTo') }} <span>@{{ target.username }}</span>
              <button type="button" @click="cancelTarget">{{ t('cancelReply') }}</button>
            </div>
            <textarea ref="replyArea" v-model="content" :placeholder="t('replyPlaceholder')" required />
            <div class="reply-form-toolbar">
              <EmojiPicker @select="insert" />
              <button type="button" class="reply-image-btn" :disabled="uploadingReplyImage || submitting" @click="replyFileInput?.click()">
                {{ uploadingReplyImage ? t('uploadingImage') : t('imageBtn') }}
              </button>
              <input ref="replyFileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden @change="uploadReplyImage" />
              <button class="reply-submit-btn" type="submit" :disabled="submitting || uploadingReplyImage">
                {{ submitting ? t('sending') : t('reply') }}
              </button>
            </div>
          </div>
        </form>
        <p v-else class="reply-login-hint">{{ t('loginToReply') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth, useLang } from '../contexts/app';
import { postService } from '../services/postService';
import { messageService } from '../services/messageService';
import AvatarIcon from '../components/AvatarIcon.vue';
import RichContent from '../components/RichContent.vue';
import EmojiPicker from '../components/EmojiPicker.vue';
import './PostDetailPage.css';

const route = useRoute();
const router = useRouter();
const { isLoggedIn, user } = useAuth();
const { t } = useLang();
const post = ref(null);
const replies = ref([]);
const loading = ref(true);
const content = ref('');
const target = ref(null);
const replyArea = ref(null);
const replyFileInput = ref(null);
const isLiked = ref(false);
const submitting = ref(false);
const uploadingReplyImage = ref(false);
const friendship = ref('none');
const messageActionLoading = ref(false);
const graveRequestLoading = ref(false);
const categoryMap = { '讨论': 'catDiscussion', '探灵': 'catExplore', '灵异': 'catParanormal', '求助': 'catHelp', '分享': 'catShare', '语c': 'catLive', 'OC投稿': 'catOC' };
const categoryLabel = computed(() => t(categoryMap[post.value?.category] || 'catDiscussion') || post.value?.category);
const messageLabel = computed(() => {
  if (messageActionLoading.value) return '处理中...';
  if (friendship.value === 'friend') return t('sendMessage');
  if (friendship.value === 'incoming') return '去处理';
  if (friendship.value === 'outgoing') return '已申请';
  return '加好友';
});

const loadFriendship = async () => {
  if (!isLoggedIn.value || !user.value?.uid || !post.value?.author_id || user.value.uid === post.value.author_id) {
    friendship.value = 'none';
    return;
  }
  try {
    const [friends, requests] = await Promise.all([messageService.getFriends(), messageService.getFriendRequests()]);
    if (friends.some(item => item.friend.uid === post.value.author_id)) {
      friendship.value = 'friend';
      return;
    }
    const request = requests.find(item => {
      const other = item.direction === 'incoming' ? item.requester : item.addressee;
      return other?.uid === post.value.author_id;
    });
    friendship.value = request ? request.direction : 'none';
  } catch {
    friendship.value = 'none';
  }
};

const load = async () => {
  loading.value = true;
  try {
    const [postData, replyData] = await Promise.all([postService.getPost(route.params.id), postService.getReplies(route.params.id)]);
    post.value = postData;
    replies.value = replyData;
    if (isLoggedIn.value) {
      try {
        isLiked.value = (await postService.checkLike(route.params.id)).is_liked;
        const liked = new Set(await postService.getLikedReplies(route.params.id));
        replies.value.forEach(reply => { reply.is_liked = liked.has(reply.id); });
      } catch { /* unauthenticated/legacy like endpoints are optional */ }
    }
    await loadFriendship();
  } catch {
    post.value = { id: route.params.id, category: '讨论', title: t('postLoadFailed'), author: t('anonymous'), author_avatar: 'eye', created_at: '--', content: t('backendDisconnected'), reply_count: 0 };
    replies.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(() => [route.params.id, isLoggedIn.value, user.value?.uid], load);

const insert = text => {
  const textarea = replyArea.value;
  const start = textarea?.selectionStart ?? content.value.length;
  const end = textarea?.selectionEnd ?? start;
  content.value = content.value.slice(0, start) + text + content.value.slice(end);
  nextTick(() => {
    textarea?.focus();
    if (textarea) textarea.selectionStart = textarea.selectionEnd = start + text.length;
  });
};
const replyTo = reply => {
  target.value = { id: reply.id, userId: reply.author_id, username: reply.author };
  content.value = `@${reply.author} ${content.value.replace(/^@\S+\s/, '')}`;
  nextTick(() => replyArea.value?.focus());
};
const cancelTarget = () => { content.value = content.value.replace(`@${target.value?.username} `, ''); target.value = null; };
const uploadReplyImage = async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  uploadingReplyImage.value = true;
  try {
    const data = await postService.uploadImage(file);
    insert(`\n[img:${data.url}]\n`);
  } catch (error) {
    alert(error.response?.data?.detail || t('uploadFailed'));
  } finally {
    uploadingReplyImage.value = false;
    event.target.value = '';
  }
};
const submitReply = async () => {
  if (post.value?.is_grave || !content.value.trim() || submitting.value) return;
  submitting.value = true;
  try {
    const image = content.value.match(/\[img:([^\]]+)\]/);
    const payload = { content: content.value, image_url: image ? image[1] : null };
    if (target.value && content.value.startsWith(`@${target.value.username}`)) Object.assign(payload, { reply_to_id: target.value.id, reply_to_user_id: target.value.userId, reply_to_username: target.value.username });
    await postService.createReply(route.params.id, payload);
    content.value = '';
    target.value = null;
    await load();
  } catch (error) {
    alert(error.response?.data?.detail || t('replyFailed'));
  } finally {
    submitting.value = false;
  }
};
const toggleLike = async () => {
  if (!isLoggedIn.value) return alert(t('loginToLike'));
  try { const data = await postService.toggleLike(route.params.id); isLiked.value = data.is_liked; post.value.like_count = data.like_count; } catch { alert(t('operationFailed')); }
};
const toggleReplyLike = async reply => {
  if (!isLoggedIn.value) return alert(t('loginToLike'));
  try { const data = await postService.toggleReplyLike(reply.id); reply.is_liked = data.is_liked; reply.like_count = data.like_count; } catch { alert(t('operationFailed')); }
};
const deleteReply = async id => {
  if (!confirm(t('deleteReplyConfirm'))) return;
  try { await postService.deleteReply(id); await load(); } catch { alert(t('deleteFailed')); }
};
const deletePost = async () => {
  if (!confirm(t('deletePostConfirm'))) return;
  try { await postService.deletePost(route.params.id); router.push('/'); } catch { alert(t('deleteFailed')); }
};
const requestGrave = async () => {
  if (!isLoggedIn.value) return alert(t('pleaseLogin'));
  if (user.value?.is_admin) {
    if (!confirm('确定要把该帖子设为坟贴吗？')) return;
    graveRequestLoading.value = true;
    try { post.value = await postService.markPostGrave(route.params.id); await load(); alert('已设为坟贴'); } catch (error) { alert(error.response?.data?.detail || t('operationFailed')); } finally { graveRequestLoading.value = false; }
    return;
  }
  if (user.value?.uid !== post.value?.author_id) return alert('只能申请自己的帖子为坟贴');
  const reason = prompt('请输入坟贴申请原因（可留空）', '');
  if (reason === null) return;
  graveRequestLoading.value = true;
  try { await postService.requestGravePost(route.params.id, reason); alert('坟贴申请已发送，等待管理员审核'); } catch (error) { alert(error.response?.data?.detail || t('operationFailed')); } finally { graveRequestLoading.value = false; }
};
const messageAction = async () => {
  if (!isLoggedIn.value || !post.value?.author_id || !user.value || user.value.uid === post.value.author_id) return;
  if (friendship.value === 'friend') return router.push(`/chat/private/${post.value.author_id}`);
  if (friendship.value === 'incoming') return router.push('/messages');
  messageActionLoading.value = true;
  try { await messageService.sendFriendRequest(post.value.author_id); friendship.value = 'outgoing'; } catch (error) { alert(error.response?.data?.detail || t('operationFailed')); } finally { messageActionLoading.value = false; }
};
</script>
