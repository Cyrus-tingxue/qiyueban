<template>
  <div class="messages-page">
    <div v-if="loading" class="loading-state">消息加载中...</div>
    <div v-else class="chat-home-shell">
      <div class="chat-home-topbar">
        <div class="topbar-search">
          <input v-model="search" class="topbar-search-input" :placeholder="tab === 'friends' ? '搜索好友' : '搜索群聊'" />
        </div>
        <div class="topbar-actions">
          <button type="button" class="icon-btn refresh-btn" title="刷新" @click="load">↻</button>
          <button type="button" :class="['icon-btn', { active: menuOpen }]" title="更多" @click="menuOpen = !menuOpen">+</button>
          <div v-if="menuOpen" class="action-menu">
            <button type="button" class="menu-item" @click="openPanel('add-friend')">添加好友</button>
            <button type="button" class="menu-item" @click="openPanel('create-group')">创建群聊</button>
          </div>
        </div>
      </div>
      <div class="chat-home-tabs">
        <button type="button" :class="['home-tab', { active: tab === 'friends' }]" @click="tab = 'friends'">好友</button>
        <button type="button" :class="['home-tab', { active: tab === 'groups' }]" @click="tab = 'groups'">群聊</button>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div class="chat-list">
        <template v-if="tab === 'friends'">
          <div v-for="request in incomingRequests" :key="`request-${request.id}`" class="chat-list-item friend-request-item">
            <div class="chat-list-avatar"><AvatarIcon :type="request.requester.avatar || 'eye'" :size="44" /><span :class="['online-dot', { online: request.requester.is_online }]" /></div>
            <div class="chat-list-copy friend-request-copy">
              <div class="friend-request-head"><div class="chat-list-name">{{ request.requester.nickname || request.requester.username }}</div><span class="friend-request-badge">好友申请</span></div>
              <div class="chat-list-subtitle">等待你处理的好友申请</div>
            </div>
            <div class="chat-list-actions friend-request-actions"><button type="button" class="mini-btn friend-request-btn" @click="accept(request.id)">同意</button><button type="button" class="mini-btn ghost-mini-btn friend-request-btn" @click="reject(request.id)">拒绝</button></div>
          </div>
          <div v-for="item in filteredFriends" :key="item.friendship_id" :class="['chat-list-item', 'friend-row', { 'chat-list-item-unread': unread(item.friend.uid) > 0 }]">
            <div class="chat-list-avatar"><AvatarIcon :type="item.friend.avatar || 'eye'" :size="44" /><span :class="['online-dot', { online: item.friend.is_online }]" /></div>
            <button type="button" class="friend-main" @click="chat(item.friend.uid)">
              <div class="chat-list-copy"><div class="friend-name-row"><div class="chat-list-name">{{ item.friend.nickname || item.friend.username }}</div><span v-if="unread(item.friend.uid) > 0" class="private-unread-dot" /></div><div class="chat-list-subtitle">{{ item.friend.is_online ? '在线' : formatLastSeen(item.friend.last_seen_at) }}</div></div>
            </button>
            <div class="friend-action-menu">
              <button type="button" :class="['icon-btn', 'friend-more-btn', { active: friendMenuId === item.friend.uid }]" title="好友操作" @click.stop="friendMenuId = friendMenuId === item.friend.uid ? null : item.friend.uid">⋯</button>
              <div v-if="friendMenuId === item.friend.uid" class="friend-popover"><button type="button" class="menu-item friend-popover-item" @click="removeFriend(item.friend.uid, item.friend.nickname || item.friend.username)">删除好友</button></div>
            </div>
          </div>
          <div v-if="!filteredFriends.length" class="empty-state">{{ incomingRequests.length ? '还没有已添加的好友' : '还没有好友' }}</div>
        </template>
        <template v-else>
          <div v-if="groupInvites.length" class="pending-section">
            <div class="pending-section-head"><h3>群聊邀请</h3><span class="pending-section-count">{{ groupInvites.length }}</span></div>
            <div class="pending-list">
              <div v-for="invite in groupInvites" :key="`invite-${invite.id}`" class="chat-list-item pending-invite-item">
                <div class="chat-list-avatar group-avatar"><AvatarIcon type="eye" :size="44" /></div>
                <div class="chat-list-copy"><div class="chat-list-name">{{ invite.group_name }}</div><div class="chat-list-subtitle">{{ invite.inviter?.nickname || invite.inviter?.username }} 邀请你加入群聊</div></div>
                <div class="chat-list-actions"><button type="button" class="mini-btn" @click="acceptInvite(invite.id)">同意</button><button type="button" class="mini-btn ghost-mini-btn" @click="rejectInvite(invite.id)">拒绝</button></div>
              </div>
            </div>
          </div>
          <button v-for="group in filteredGroups" :key="group.id" type="button" :class="['chat-list-item', { 'chat-list-item-unread': unreadGroup(group.id) > 0 }]" @click="groupChat(group.id)">
            <div class="chat-list-avatar group-avatar"><AvatarIcon type="eye" :size="44" /></div>
            <div class="chat-list-copy"><div class="friend-name-row"><div class="chat-list-name">{{ group.name }}</div><span v-if="unreadGroup(group.id) > 0" class="private-unread-dot" /></div><div class="chat-list-subtitle">{{ group.member_count }} 位成员</div></div>
          </button>
          <div v-if="!filteredGroups.length" class="empty-state">{{ groupInvites.length ? '暂无已加入的群聊' : '还没有加入群聊' }}</div>
        </template>
      </div>
    </div>

    <div v-if="panel" class="overlay" @click.self="closePanel">
      <div class="dropdown-panel">
        <div class="dropdown-panel-head"><h2>{{ panel === 'add-friend' ? '添加好友' : '创建群聊' }}</h2><button type="button" class="icon-btn" @click="closePanel">X</button></div>
        <template v-if="panel === 'add-friend'">
          <div class="panel-body">
            <input v-model="query" class="search-input" placeholder="搜索用户名或昵称" />
            <div class="panel-list">
              <div v-if="query && searching" class="search-item static-row">正在搜索...</div>
              <div v-else-if="query && !searching && !results.length" class="search-item static-row">没有找到相关用户</div>
              <div v-for="candidate in results" :key="candidate.uid" class="search-item">
                <div class="item-main"><AvatarIcon :type="candidate.avatar || 'eye'" :size="32" /><div class="item-copy"><div class="item-title">{{ candidate.nickname || candidate.username }}</div><div class="item-subtitle">@{{ candidate.username }}</div></div></div>
                <button v-if="status(candidate.uid) === 'friend'" type="button" class="mini-btn" @click="chat(candidate.uid)">聊天</button>
                <span v-else-if="status(candidate.uid) === 'incoming'" class="status-pill">待处理</span>
                <button v-else type="button" class="mini-btn" @click="add(candidate.uid)">{{ status(candidate.uid) === 'outgoing' ? '再次申请' : '添加' }}</button>
              </div>
            </div>
          </div>
        </template>
        <form v-else class="panel-body group-form" @submit.prevent="createGroup">
          <input v-model="groupName" class="search-input" placeholder="输入群聊名称" />
          <div class="friend-picker">
            <div v-if="!friends.length" class="empty-state small">先添加好友后再建群</div>
            <label v-for="item in friends" v-else :key="item.friendship_id" class="checkbox-row"><input type="checkbox" :checked="selectedFriendIds.includes(item.friend.uid)" @change="toggleFriend(item.friend.uid)" /><AvatarIcon :type="item.friend.avatar || 'eye'" :size="22" /><span>{{ item.friend.nickname || item.friend.username }}</span></label>
          </div>
          <button type="submit" class="mini-btn wide" :disabled="!groupName.trim()">创建群聊</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth, useLang } from '../contexts/app';
import { getMutedGroupIds } from '../utils/groupMute';
import { authService } from '../services/authService';
import { messageService } from '../services/messageService';
import AvatarIcon from '../components/AvatarIcon.vue';
import './MessagesPage.css';

const router = useRouter();
const { user } = useAuth();
const { t } = useLang();
const tab = ref('friends');
const friends = ref([]);
const groups = ref([]);
const requests = ref([]);
const groupInvites = ref([]);
const conversations = ref([]);
const search = ref('');
const query = ref('');
const results = ref([]);
const searching = ref(false);
const loading = ref(true);
const error = ref('');
const menuOpen = ref(false);
const panel = ref('');
const friendMenuId = ref(null);
const mutedGroupIds = ref(getMutedGroupIds());
const groupName = ref('');
const selectedFriendIds = ref([]);
const incomingRequests = computed(() => requests.value.filter(item => item.direction === 'incoming'));
const filteredFriends = computed(() => friends.value.filter(item => (item.friend.nickname || item.friend.username).toLowerCase().includes(search.value.toLowerCase())));
const filteredGroups = computed(() => groups.value.filter(item => item.is_member && item.name.toLowerCase().includes(search.value.toLowerCase())));
const statusMap = computed(() => {
  const map = new Map();
  friends.value.forEach(item => map.set(item.friend.uid, 'friend'));
  requests.value.forEach(item => { const other = item.direction === 'incoming' ? item.requester : item.addressee; if (other) map.set(other.uid, item.direction); });
  return map;
});
const status = id => statusMap.value.get(id) || 'none';
const unread = id => conversations.value.find(item => item.with_user.uid === id)?.unread_count || 0;
const unreadGroup = id => mutedGroupIds.value.includes(id) ? 0 : (groups.value.find(item => item.id === id)?.unread_count || 0);
const formatLastSeen = value => { if (!value) return '最近离线'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '最近离线'; const diff = Math.floor((Date.now() - date.getTime()) / 60000); if (diff < 1) return '刚刚在线'; if (diff < 60) return `${diff} 分钟前在线`; if (diff < 1440) return `${Math.floor(diff / 60)} 小时前在线`; return `${Math.floor(diff / 1440)} 天前在线`; };
const load = async ({ silent = false } = {}) => {
  if (!user.value) return router.push('/login');
  try {
    if (!silent) { loading.value = true; error.value = ''; }
    [conversations.value, friends.value, requests.value, groupInvites.value, groups.value] = await Promise.all([messageService.getConversations(), messageService.getFriends(), messageService.getFriendRequests(), messageService.getGroupInvites(), messageService.getGroups()]);
  } catch (e) { if (!silent) error.value = t('loadConvFailed'); } finally { if (!silent) loading.value = false; }
};
const chat = id => router.push(`/chat/private/${id}`);
const groupChat = id => router.push(`/chat/group/${id}`);
const accept = async id => { try { await messageService.acceptFriendRequest(id); await load(); } catch (e) { alert(e.response?.data?.detail || t('operationFailed')); } };
const reject = async id => { try { await messageService.rejectFriendRequest(id); await load(); } catch (e) { alert(e.response?.data?.detail || t('operationFailed')); } };
const acceptInvite = async id => { try { const invite = await messageService.acceptGroupInvite(id); await load(); router.push(`/chat/group/${invite.group_id}`); } catch (e) { alert(e.response?.data?.detail || t('operationFailed')); } };
const rejectInvite = async id => { try { await messageService.rejectGroupInvite(id); await load(); } catch (e) { alert(e.response?.data?.detail || t('operationFailed')); } };
const add = async id => { try { await messageService.sendFriendRequest(id); await load(); } catch (e) { alert(e.response?.data?.detail || t('operationFailed')); } };
const removeFriend = async (id, name) => { if (!confirm(`确定要删除好友“${name}”吗？`)) return; try { await messageService.removeFriend(id); friendMenuId.value = null; await load(); } catch (e) { alert(e.response?.data?.detail || t('operationFailed')); } };
const openPanel = mode => { menuOpen.value = false; panel.value = mode; query.value = ''; results.value = []; };
const closePanel = () => { panel.value = ''; query.value = ''; results.value = []; groupName.value = ''; selectedFriendIds.value = []; };
const toggleFriend = id => { selectedFriendIds.value = selectedFriendIds.value.includes(id) ? selectedFriendIds.value.filter(item => item !== id) : [...selectedFriendIds.value, id]; };
const createGroup = async () => { if (!groupName.value.trim()) return; try { const group = await messageService.createGroup(groupName.value.trim(), selectedFriendIds.value, true); closePanel(); await load(); router.push(`/chat/group/${group.id}`); } catch (e) { alert(e.response?.data?.detail || t('operationFailed')); } };
let searchTimer;
watch(query, value => { clearTimeout(searchTimer); if (!value.trim() || panel.value !== 'add-friend') { results.value = []; searching.value = false; return; } searching.value = true; searchTimer = setTimeout(async () => { try { results.value = (await authService.searchUsers(value.trim())).filter(item => item.uid !== user.value?.uid); } catch { results.value = []; } finally { searching.value = false; } }, 300); });
let refreshTimer;
onMounted(() => { load(); const refresh = () => { if (document.visibilityState === 'visible') load({ silent: true }); }; const refreshMute = () => { mutedGroupIds.value = getMutedGroupIds(); }; window.addEventListener('messageDataChanged', refresh); window.addEventListener('messageUnreadStateChanged', refresh); window.addEventListener('groupMuteChanged', refreshMute); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); refreshTimer = setInterval(refresh, 3000); });
onUnmounted(() => { clearTimeout(searchTimer); clearInterval(refreshTimer); });
</script>
