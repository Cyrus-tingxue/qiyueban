<template>
  <div class="chat-page">
    <div v-if="loading" class="loading-state">聊天记录加载中...</div>
    <div v-else-if="isGroup && detail && !detail.is_member" class="chat-join-card">
      <h2>{{ detail.name }}</h2><p>{{ detail.member_count }} 位成员</p><button class="send-btn" @click="joinGroup">加入群聊</button>
    </div>
    <div v-else class="qq-chat-shell">
      <header class="qq-chat-header">
        <div class="chat-header-side">
          <button v-if="isGroup" type="button" :class="['header-icon-btn', { active: groupPanelOpen }]" title="群聊管理" @click="groupPanelOpen = !groupPanelOpen">⊕</button>
          <button v-else type="button" class="header-btn" @click="clear">清空</button>
        </div>
        <div class="qq-chat-target">
          <template v-if="isGroup">
            <button type="button" :class="['group-members-trigger', { active: memberPanelOpen }]" @click="memberPanelOpen = !memberPanelOpen">
              <div class="target-avatar"><AvatarIcon type="eye" :size="40" /></div><div class="target-copy"><div class="target-name">{{ detail?.name }}</div><div class="target-meta">{{ detail?.member_count }} 位成员</div></div>
            </button>
          </template>
          <template v-else>
            <div class="target-avatar"><AvatarIcon :type="other?.avatar || 'eye'" :size="40" /><span :class="['online-dot', { online: other?.is_online }]" /></div>
            <div class="target-copy"><div class="target-name">{{ other?.nickname || other?.username || '私聊' }}</div><div class="target-meta">{{ other?.is_online ? '在线' : formatLastSeen(other?.last_seen_at) }}</div></div>
          </template>
        </div>
        <div class="chat-header-side chat-header-side-right"><button type="button" class="header-btn" @click="router.push('/messages')">返回</button></div>
      </header>

      <div v-if="isGroup && memberPanelOpen" class="group-members-overlay" @click.self="memberPanelOpen = false">
        <div class="group-members-panel">
          <div class="group-members-header"><div><div class="group-members-title">{{ detail?.name }}</div><div class="group-members-subtitle">{{ detail?.member_count }} 位成员</div></div><button type="button" class="header-icon-btn" @click="memberPanelOpen = false">×</button></div>
          <div class="group-members-list"><div v-for="member in detail?.members || []" :key="member.uid" class="group-member-item"><div class="target-avatar"><AvatarIcon :type="member.avatar || 'eye'" :size="36" /><span :class="['online-dot', { online: member.is_online }]" /></div><div class="group-member-copy"><div class="group-member-name">{{ member.nickname || member.username }}{{ member.uid === user?.uid ? '（你）' : '' }}<span v-if="detail?.creator?.uid === member.uid" class="group-member-role">群主</span></div><div class="group-member-meta">@{{ member.username }}</div></div></div></div>
        </div>
      </div>

      <div v-if="isGroup && groupPanelOpen" class="qq-group-panel">
        <div class="qq-group-panel-actions qq-group-panel-actions-top"><button type="button" :class="['header-btn', { 'active-toggle-btn': muted }]" @click="toggleMute">{{ muted ? '已开启免打扰' : '消息免打扰' }}</button></div>
        <div class="qq-group-panel-row"><input v-model="inviteQuery" type="text" placeholder="搜索任意用户邀请入群" @input="inviteUserId = ''" /><button type="button" class="header-btn" :disabled="!inviteUserId" @click="invite">发送邀请</button></div>
        <div v-if="inviteQuery.trim()" class="group-invite-search-results"><div v-if="!inviteResults.length" class="group-invite-search-empty">没有可邀请的用户</div><button v-for="candidate in inviteResults" v-else :key="candidate.uid" type="button" :class="['group-invite-search-item', { active: inviteUserId === String(candidate.uid) }]" @click="inviteUserId = String(candidate.uid)"><AvatarIcon :type="candidate.avatar || 'eye'" :size="28" /><span>{{ candidate.nickname || candidate.username }}</span><span class="group-invite-search-username">@{{ candidate.username }}</span></button></div>
        <div class="qq-group-panel-actions"><button type="button" class="header-btn danger-btn" @click="leaveGroup">退出群聊</button></div>
      </div>

      <main ref="list" class="qq-chat-body" @scroll="scroll">
        <div v-if="more || loadingMore" class="history-loader">{{ loadingMore ? '正在加载更早消息...' : '上滑可加载更早消息' }}</div>
        <div v-if="!messages.length" class="empty-chat">还没有聊天记录，发条消息开始吧。</div>
        <template v-for="(message, index) in messages" :key="`${isGroup ? 'g' : 'p'}-${message.id}`">
          <div v-if="index === 0 || new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()" class="date-divider"><span>{{ new Date(message.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) }}</span></div>
          <div :class="['qq-message-row', message.sender_id === user.uid ? 'self' : 'other']">
            <div v-if="message.sender_id !== user.uid" class="message-avatar"><AvatarIcon :type="message.sender?.avatar || 'eye'" :size="36" /></div>
            <div class="message-stack"><div v-if="isGroup && message.sender_id !== user.uid" class="message-sender">{{ message.sender?.nickname || message.sender?.username }}</div><div class="message-bubble"><RichContent :text="message.content" /></div><div class="message-time">{{ formatTime(message.created_at) }}</div></div>
            <div v-if="message.sender_id === user.uid" class="message-avatar"><AvatarIcon :type="user.avatar || 'eye'" :size="36" /></div>
          </div>
        </template>
        <div ref="end" />
      </main>
      <form class="qq-chat-composer" @submit.prevent="send">
        <textarea ref="composer" v-model="draft" :placeholder="t('chatPlaceholder')" rows="3" :disabled="sending || uploadingImage" @keydown.enter.exact.prevent="send" />
        <div class="composer-toolbar"><div class="composer-tools"><EmojiPicker @select="insert" /><button type="button" class="emoji-picker-trigger composer-image-btn" :disabled="uploadingImage || sending" @click="imageInput?.click()">{{ uploadingImage ? t('uploadingImage') : t('imageBtn') }}</button><input ref="imageInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden @change="uploadImage" /><button type="submit" class="send-btn" :disabled="!draft.trim() || sending || uploadingImage">{{ sending ? t('sending') : t('send') }}</button></div></div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth, useLang } from '../contexts/app';
import { authService } from '../services/authService';
import { messageService } from '../services/messageService';
import { postService } from '../services/postService';
import { isGroupMuted, setGroupMuted } from '../utils/groupMute';
import AvatarIcon from '../components/AvatarIcon.vue';
import RichContent from '../components/RichContent.vue';
import EmojiPicker from '../components/EmojiPicker.vue';
import './ChatPage.css';

const route = useRoute();
const router = useRouter();
const { user } = useAuth();
const { t } = useLang();
const isGroup = computed(() => Boolean(route.params.groupId));
const id = computed(() => Number(route.params.groupId || route.params.userId));
const messages = ref([]);
const other = ref(null);
const detail = ref(null);
const draft = ref('');
const loading = ref(true);
const sending = ref(false);
const uploadingImage = ref(false);
const more = ref(true);
const loadingMore = ref(false);
const list = ref(null);
const end = ref(null);
const composer = ref(null);
const imageInput = ref(null);
const groupPanelOpen = ref(false);
const memberPanelOpen = ref(false);
const inviteQuery = ref('');
const inviteResults = ref([]);
const inviteUserId = ref('');
const muted = ref(false);
let timer;
let inviteTimer;

const load = async initial => {
  try {
    if (isGroup.value) {
      if (initial) detail.value = await messageService.getGroupDetail(id.value);
      if (detail.value && !detail.value.is_member) return;
      const data = await messageService.getGroupMessages(id.value, 0, initial ? 40 : 60);
      messages.value = mergeMessages(messages.value, data);
      more.value = data.length >= (initial ? 40 : 60);
      if (initial) detail.value = await messageService.getGroupDetail(id.value);
    } else {
      const data = await messageService.getMessages(id.value, 0, initial ? 30 : 40);
      messages.value = mergeMessages(messages.value, data);
      more.value = data.length >= (initial ? 30 : 40);
      other.value = data.at(-1)?.sender_id === id.value ? data.at(-1).sender : data.at(-1)?.receiver;
    }
    await nextTick();
    if (initial || nearBottom()) end.value?.scrollIntoView({ behavior: initial ? 'auto' : 'smooth' });
  } catch (error) { if (initial) { alert(error.response?.data?.detail || t('loadConvFailed')); router.push('/messages'); } } finally { loading.value = false; }
};
const mergeMessages = (current, incoming) => { const map = new Map(current.map(item => [item.id, item])); incoming.forEach(item => map.set(item.id, item)); return [...map.values()].sort((a, b) => a.id - b.id); };
const nearBottom = () => !list.value || list.value.scrollHeight - list.value.scrollTop - list.value.clientHeight <= 120;
const loadOlder = async () => {
  if (loadingMore.value || !more.value) return;
  const oldHeight = list.value?.scrollHeight || 0; const oldTop = list.value?.scrollTop || 0;
  loadingMore.value = true;
  try { const data = isGroup.value ? await messageService.getGroupMessages(id.value, messages.value.length, 40) : await messageService.getMessages(id.value, messages.value.length, 30); if (!data.length) more.value = false; else { messages.value = mergeMessages(data, messages.value); more.value = data.length >= (isGroup.value ? 40 : 30); await nextTick(); if (list.value) list.value.scrollTop = oldTop + list.value.scrollHeight - oldHeight; } } catch (error) { console.error(error); } finally { loadingMore.value = false; }
};
const scroll = () => { if (list.value && list.value.scrollTop < 80) loadOlder(); };
const insert = text => { const area = composer.value; const start = area?.selectionStart ?? draft.value.length; const endPos = area?.selectionEnd ?? start; draft.value = draft.value.slice(0, start) + text + draft.value.slice(endPos); nextTick(() => area?.focus()); };
const uploadImage = async event => { const file = event.target.files?.[0]; if (!file) return; uploadingImage.value = true; try { const data = await postService.uploadImage(file); insert(`\n[img:${data.url}]\n`); } catch (error) { alert(error.response?.data?.detail || t('uploadFailed')); } finally { uploadingImage.value = false; event.target.value = ''; } };
const send = async () => { if (!draft.value.trim() || sending.value) return; const text = draft.value.trim(); draft.value = ''; sending.value = true; try { const message = isGroup.value ? await messageService.sendGroupMessage(id.value, text) : await messageService.sendMessage(id.value, text); messages.value = mergeMessages(messages.value, [message]); await nextTick(); end.value?.scrollIntoView({ behavior: 'smooth' }); } catch (error) { draft.value = text; alert(error.response?.data?.detail || t('operationFailed')); } finally { sending.value = false; } };
const clear = async () => { if (!confirm(t('clearConfirm'))) return; try { await messageService.deleteConversation(id.value); router.push('/messages'); } catch (error) { alert(error.response?.data?.detail || t('clearFailed')); } };
const joinGroup = async () => { try { detail.value = await messageService.joinGroup(id.value); await load(true); } catch (error) { alert(error.response?.data?.detail || t('operationFailed')); } };
const invite = async () => { if (!inviteUserId.value) return; try { await messageService.addGroupMember(id.value, Number(inviteUserId.value)); inviteQuery.value = ''; inviteResults.value = []; inviteUserId.value = ''; alert('邀请已发送，等待对方同意'); } catch (error) { alert(error.response?.data?.detail || t('operationFailed')); } };
const leaveGroup = async () => { if (!confirm('确定要退出这个群聊吗？')) return; try { await messageService.leaveGroup(id.value); router.push('/messages'); } catch (error) { alert(error.response?.data?.detail || t('operationFailed')); } };
const toggleMute = () => { muted.value = !muted.value; setGroupMuted(id.value, muted.value); };
const formatTime = value => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
const formatLastSeen = value => { if (!value) return '最近离线'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '最近离线'; const diff = Math.floor((Date.now() - date.getTime()) / 60000); if (diff < 1) return '刚刚在线'; if (diff < 60) return `${diff} 分钟前在线`; if (diff < 1440) return `${Math.floor(diff / 60)} 小时前在线`; return `${Math.floor(diff / 1440)} 天前在线`; };
const refreshChat = () => { if (document.visibilityState === 'visible') load(false) }
const syncMuted = () => { muted.value = isGroup.value ? isGroupMuted(id.value) : false }
watch([isGroup, id], () => { clearInterval(timer); messages.value = []; detail.value = null; other.value = null; muted.value = isGroup.value ? isGroupMuted(id.value) : false; loading.value = true; load(true); timer = setInterval(() => load(false), isGroup.value ? 2000 : 3000); }, { immediate: true });
watch(inviteQuery, value => { clearTimeout(inviteTimer); if (!value.trim() || !isGroup.value) { inviteResults.value = []; return; } inviteTimer = setTimeout(async () => { try { const memberIds = new Set((detail.value?.members || []).map(member => member.uid)); inviteResults.value = (await authService.searchUsers(value.trim())).filter(candidate => candidate.uid !== user.value?.uid && !memberIds.has(candidate.uid)); } catch { inviteResults.value = []; } }, 300); });
onMounted(() => { if (!user.value) router.push('/login'); window.addEventListener('messageDataChanged', refreshChat); window.addEventListener('focus', refreshChat); document.addEventListener('visibilitychange', refreshChat); window.addEventListener('groupMuteChanged', syncMuted); });
onUnmounted(() => { clearInterval(timer); clearTimeout(inviteTimer); window.removeEventListener('messageDataChanged', refreshChat); window.removeEventListener('focus', refreshChat); document.removeEventListener('visibilitychange', refreshChat); window.removeEventListener('groupMuteChanged', syncMuted); });
</script>
