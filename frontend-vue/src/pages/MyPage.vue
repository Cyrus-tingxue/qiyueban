<template>
  <div v-if="!isLoggedIn" class="my-page-guest">
    <h2>{{ t('welcomeCenter') }}</h2>
    <p>{{ t('pleaseLogin') }}</p>
  </div>

  <div v-else class="my-page">
    <div class="my-page-tabs">
      <button :class="['my-tab-btn', { active: activeTab === 'notifications' }]" @click="activeTab = 'notifications'">
        {{ t('myNotifications') }}
      </button>
      <button :class="['my-tab-btn', { active: activeTab === 'posts' }]" @click="activeTab = 'posts'; currentPage = 1">
        {{ t('myPosts') }}
      </button>
      <button :class="['my-tab-btn', { active: activeTab === 'account' }]" @click="activeTab = 'account'">
        {{ t('accountSecurity') }}
      </button>
    </div>

    <div class="my-page-content">
      <section v-if="activeTab === 'notifications'" class="my-notif-section">
        <div class="my-notif-header">
          <h3>{{ t('notifList') }}</h3>
          <div class="my-notif-actions">
            <button class="read-all-btn" @click="handleReadAll">{{ t('markAllRead') }}</button>
            <button class="read-all-btn danger" @click="handleClearAll">全部清除</button>
          </div>
        </div>

        <p v-if="notificationLoading" class="my-loading-text">{{ t('loading') }}</p>
        <div v-else-if="notifications.length === 0 && groupInvites.length === 0" class="my-empty-text">
          {{ t('noNotifications') }}
        </div>
        <div v-else class="my-notif-list">
          <div v-for="invite in groupInvites" :key="`group-invite-${invite.id}`" class="my-notif-item unread">
            <div class="my-notif-avatar">
              <AvatarIcon type="eye" :size="40" />
            </div>
            <div class="my-notif-body">
              <p>
                <span class="my-notif-sender">{{ invite.inviter?.nickname || invite.inviter?.username || t('someone') }}</span>
                邀请你加入群聊「{{ invite.group_name }}」
              </p>
              <span class="my-notif-time">{{ invite.created_at }}</span>
              <div class="chat-list-actions friend-request-actions">
                <button type="button" class="mini-btn friend-request-btn" @click.stop="handleAcceptGroupInvite(invite.id)">同意</button>
                <button type="button" class="mini-btn ghost-mini-btn friend-request-btn" @click.stop="handleRejectGroupInvite(invite.id)">拒绝</button>
              </div>
            </div>
          </div>

          <div
            v-for="notification in notifications"
            :key="notification.id"
            :class="['my-notif-item', notification.is_read ? 'read' : 'unread']"
            @click="handleNotificationClick(notification)"
          >
            <div class="my-notif-avatar">
              <AvatarIcon :type="notification.sender_avatar || 'eye'" :size="40" />
            </div>
            <div class="my-notif-body">
              <p>
                <span class="my-notif-sender">{{ notification.sender_name || t('someone') }}</span>
                {{ getNotificationText(notification) }}
              </p>
              <span class="my-notif-time">{{ notification.created_at }}</span>
            </div>
            <div v-if="!notification.is_read" class="my-notif-unread-badge">{{ t('unread') }}</div>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'posts'" class="my-posts-section">
        <p v-if="postsLoading" class="my-loading-text">{{ t('loading') }}</p>
        <template v-else>
          <PostList :posts="posts" :loading="postsLoading" />
          <Pagination v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages" @change="currentPage = $event" />
        </template>
      </section>

      <section v-if="activeTab === 'account'" class="my-account-section">
        <div class="my-notif-header">
          <h3>{{ t('accountSecurity') }}</h3>
        </div>
        <form class="my-account-form" @submit.prevent="handleBindEmail">
          <div class="my-account-field">
            <label>{{ t('emailLabel') }}</label>
            <input v-model="email" type="email" :placeholder="t('emailPlaceholder')" required />
          </div>
          <div v-if="!emailCodeSent" class="my-account-field">
            <label>{{ t('passwordLabel') }}</label>
            <input v-model="emailPassword" type="password" :placeholder="t('bindEmailPasswordPlaceholder')" required />
          </div>
          <div v-else class="my-account-field">
            <label>{{ t('emailVerificationCode') }}</label>
            <input v-model="emailCode" type="text" :placeholder="t('emailCodePlaceholder')" inputmode="numeric" maxlength="6" required />
          </div>
          <div v-if="emailError" class="my-account-error">{{ emailError }}</div>
          <div v-if="emailSuccess" class="my-account-success">{{ emailSuccess }}</div>
          <button class="read-all-btn my-account-submit" type="submit" :disabled="emailLoading">
            {{ emailLoading ? t('submitting') : (emailCodeSent ? t('confirmBindEmail') : t('sendVerificationCode')) }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, useLang } from '../contexts/app'
import { postService } from '../services/postService'
import { messageService } from '../services/messageService'
import { authService } from '../services/authService'
import AvatarIcon from '../components/AvatarIcon.vue'
import PostList from '../components/PostList.vue'
import Pagination from '../components/Pagination.vue'
import './MyPage.css'

const { user, isLoggedIn, updateUser } = useAuth()
const { t } = useLang()
const router = useRouter()

const activeTab = ref('notifications')
const email = ref(user.value?.email || '')
const emailPassword = ref('')
const emailCode = ref('')
const emailCodeSent = ref(false)
const emailError = ref('')
const emailSuccess = ref('')
const emailLoading = ref(false)
const notifications = ref([])
const groupInvites = ref([])
const notificationLoading = ref(false)
const posts = ref([])
const postsLoading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)

watch(() => user.value?.email, (value) => { email.value = value || '' })
watch([activeTab, currentPage], () => {
  if (activeTab.value === 'notifications') loadNotifications()
  if (activeTab.value === 'posts') loadMyPosts(currentPage.value)
})

onMounted(() => {
  if (isLoggedIn.value) loadNotifications()
})

async function loadNotifications() {
  if (!isLoggedIn.value) return
  notificationLoading.value = true
  try {
    const [data, invites] = await Promise.all([
      postService.getNotifications(1, 50),
      messageService.getGroupInvites(),
    ])
    notifications.value = data.items || []
    groupInvites.value = invites || []
  } catch (error) {
    console.error('Failed to load notifications', error)
  } finally {
    notificationLoading.value = false
  }
}

async function loadMyPosts(page) {
  if (!user.value || user.value.uid === undefined) return
  postsLoading.value = true
  try {
    const data = await postService.getPosts(page, 10, null, 'newest', null, user.value.uid)
    posts.value = data.items || []
    totalPages.value = data.total_pages || 1
  } catch {
    posts.value = []
    totalPages.value = 1
  } finally {
    postsLoading.value = false
  }
}

async function handleReadAll() {
  try {
    notifications.value = notifications.value.map((item) => ({ ...item, is_read: true }))
    window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readAll' } }))
    await postService.readAllNotifications()
  } catch {
    alert(t('operationFailed'))
  }
}

async function handleClearAll() {
  if (!window.confirm('确定要清空所有消息吗？此操作不可恢复。')) return
  try {
    notifications.value = []
    window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readAll' } }))
    await postService.clearAllNotifications()
  } catch {
    alert(t('operationFailed'))
    await loadNotifications()
  }
}

async function handleAcceptGroupInvite(inviteId) {
  try {
    const invite = await messageService.acceptGroupInvite(inviteId)
    await loadNotifications()
    router.push(`/chat/group/${invite.group_id}`)
  } catch (error) {
    alert(error.response?.data?.detail || t('operationFailed'))
  }
}

async function handleRejectGroupInvite(inviteId) {
  try {
    await messageService.rejectGroupInvite(inviteId)
    await loadNotifications()
  } catch (error) {
    alert(error.response?.data?.detail || t('operationFailed'))
  }
}

async function handleNotificationClick(notification) {
  if (!notification.is_read) {
    try {
      notification.is_read = true
      window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readOne' } }))
      await postService.readNotification(notification.id)
    } catch {
      // 保持当前页面状态，下一次刷新会重新同步。
    }
  }
  if (notification.type === 'friend_request') return router.push('/messages')
  if (notification.type === 'grave_request') return router.push('/admin')
  if (notification.post_id) router.push(`/post/${notification.post_id}`)
}

function getNotificationText(notification) {
  if (notification.type === 'friend_request') return ' 申请添加你为好友'
  if (notification.type === 'reply_mention') return ' 回复并提到了你'
  if (notification.type === 'reply') return t('repliedYou')
  if (notification.type === 'grave_request') return ' 提交了坟贴申请'
  return t('mentionedYou')
}

async function handleBindEmail() {
  emailError.value = ''
  emailSuccess.value = ''
  emailLoading.value = true
  try {
    if (!emailCodeSent.value) {
      const data = await authService.sendBindEmailCode(email.value, emailPassword.value)
      emailCodeSent.value = true
      emailPassword.value = ''
      emailSuccess.value = data.detail || t('emailCodeSent')
    } else {
      updateUser(await authService.confirmEmail(email.value, emailCode.value))
      emailPassword.value = ''
      emailCode.value = ''
      emailCodeSent.value = false
      emailSuccess.value = t('emailBindSuccess')
    }
  } catch (error) {
    emailError.value = error.response?.data?.detail || t('emailBindFailed')
  } finally {
    emailLoading.value = false
  }
}
</script>
