<template>
  <div v-if="!isLoggedIn"><RouterLink to="/login">请先登录</RouterLink></div>
  <div v-else-if="!user?.is_admin"><RouterLink to="/my">无权限，返回个人中心</RouterLink></div>
  <div v-else class="my-page admin-page">
    <div class="admin-title-row"><h2>管理后台</h2><button class="read-all-btn" type="button" :disabled="adminLoading" @click="loadAdminModeration">{{ adminLoading ? '刷新中...' : '刷新' }}</button></div>
    <div v-if="adminMessage" class="my-account-success admin-global-message">{{ adminMessage }}</div>
    <section class="my-admin-panel admin-panel-first"><div class="my-notif-header"><h3>公告管理</h3></div><form class="my-account-form" @submit.prevent="saveAnnouncement"><div class="my-account-field"><label>论坛公告内容</label><textarea v-model="announcementDraft" class="my-admin-textarea" placeholder="请输入论坛公告内容" :disabled="announcementLoading || announcementSaving" /></div><div v-if="announcementError" class="my-account-error">{{ announcementError }}</div><div v-if="announcementSuccess" class="my-account-success">{{ announcementSuccess }}</div><button class="read-all-btn my-account-submit" type="submit" :disabled="announcementLoading || announcementSaving">{{ announcementLoading ? '加载中...' : announcementSaving ? '保存中...' : '保存公告' }}</button></form></section>
    <section class="my-admin-panel"><div class="my-notif-header"><h3>坟贴申请</h3></div><div v-if="!graveRequests.length" class="my-empty-text">暂无待审核坟贴申请</div><div v-else class="my-admin-list"><div v-for="item in graveRequests" :key="item.id" class="my-admin-item"><div><strong>{{ item.post_title || `帖子 #${item.post_id}` }}</strong><p>申请人：{{ item.requester_name }}</p><p v-if="item.reason">原因：{{ item.reason }}</p></div><div class="my-admin-actions"><button class="read-all-btn" type="button" :disabled="adminLoading" @click="reviewGrave(item.id,true)">同意</button><button class="read-all-btn danger" type="button" :disabled="adminLoading" @click="reviewGrave(item.id,false)">拒绝</button></div></div></div></section>
    <section class="my-admin-panel"><div class="my-notif-header"><h3>账号封禁</h3></div><form class="my-account-form" @submit.prevent="banUserById"><div class="my-account-field"><label>用户 UID</label><input v-model="banUserId" inputmode="numeric" placeholder="输入用户 UID" required /></div><div class="my-account-field"><label>用户名</label><input v-model="banUsername" placeholder="输入用户名" /></div><div class="my-account-field"><label>封禁原因</label><input v-model="banReason" placeholder="可留空" /></div><div class="my-admin-actions left"><button class="read-all-btn" type="submit">按 UID 封禁</button><button class="read-all-btn" type="button" :disabled="!banUsername.trim()" @click="banUserByName">按用户名封禁</button><button class="read-all-btn danger" type="button" @click="unbanUser">解除封禁</button></div></form></section>
    <section class="my-admin-panel"><div class="my-notif-header"><h3>IP 封禁</h3></div><form class="my-account-form" @submit.prevent="banIp"><div class="my-account-field"><label>IP 地址</label><input v-model="banIpAddress" placeholder="例如 127.0.0.1" required /></div><div class="my-account-field"><label>封禁原因</label><input v-model="banIpReason" placeholder="可留空" /></div><button class="read-all-btn my-account-submit" type="submit">封禁 IP</button></form><div class="my-admin-list"><div v-for="item in ipBans" :key="item.id" class="my-admin-item"><div><strong>{{ item.ip_address }}</strong><p v-if="item.reason">{{ item.reason }}</p></div><button class="read-all-btn danger" type="button" @click="unbanIp(item.id)">解除</button></div></div></section>
  </div>
</template>
<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, useLang } from '../contexts/app'
import { announcementService } from '../services/announcementService'
import { authService } from '../services/authService'
import { postService } from '../services/postService'
import './MyPage.css'; import './AdminPage.css'
const router = useRouter()
const { user, isLoggedIn } = useAuth(); const { t } = useLang()
const announcementDraft=ref(''),announcementLoading=ref(false),announcementSaving=ref(false),announcementError=ref(''),announcementSuccess=ref(''),graveRequests=ref([]),adminLoading=ref(false),adminMessage=ref(''),banUserId=ref(''),banUsername=ref(''),banReason=ref(''),banIpAddress=ref(''),banIpReason=ref(''),ipBans=ref([])
const syncAccess = () => { if (!isLoggedIn.value) router.replace('/login'); else if (!user.value?.is_admin) router.replace('/my'); else { loadAnnouncement(); loadAdminModeration() } }
watch([isLoggedIn, () => user.value?.is_admin], syncAccess, { immediate: true })
onMounted(()=>syncAccess())
async function loadAnnouncement(){announcementLoading.value=true;announcementError.value='';try{announcementDraft.value=(await announcementService.getAnnouncement()).content||''}catch(e){announcementError.value=e.response?.data?.detail||'公告加载失败'}finally{announcementLoading.value=false}}
async function saveAnnouncement(){announcementSaving.value=true;announcementError.value='';announcementSuccess.value='';try{announcementDraft.value=(await announcementService.updateAnnouncement(announcementDraft.value)).content||'';announcementSuccess.value='公告已更新'}catch(e){announcementError.value=e.response?.data?.detail||'公告保存失败'}finally{announcementSaving.value=false}}
async function loadAdminModeration(){adminLoading.value=true;try{const [requests,bans]=await Promise.all([postService.getGraveRequests('pending'),authService.getIpBans()]);graveRequests.value=requests||[];ipBans.value=bans||[]}catch(e){adminMessage.value=e.response?.data?.detail||t('operationFailed')}finally{adminLoading.value=false}}
async function reviewGrave(id,approved){try{if(approved){await postService.approveGraveRequest(id);adminMessage.value='已同意坟贴申请，并自动锁定帖子'}else{await postService.rejectGraveRequest(id);adminMessage.value='已拒绝坟贴申请'}await loadAdminModeration()}catch(e){adminMessage.value=e.response?.data?.detail||t('operationFailed')}}
async function banUserById(){try{await authService.banUser(banUserId.value,banReason.value);adminMessage.value='账号已封禁';banUserId.value='';banReason.value=''}catch(e){adminMessage.value=e.response?.data?.detail||t('operationFailed')}}
async function banUserByName(){try{await authService.banUserByUsername(banUsername.value,banReason.value);adminMessage.value='账号已封禁';banUsername.value='';banReason.value=''}catch(e){adminMessage.value=e.response?.data?.detail||t('operationFailed')}}
async function unbanUser(){if(!/^\d+$/.test(banUserId.value.trim())){adminMessage.value='解除封禁请填写用户 UID';return}try{await authService.unbanUser(banUserId.value.trim());adminMessage.value='账号已解除封禁';banUserId.value=''}catch(e){adminMessage.value=e.response?.data?.detail||t('operationFailed')}}
async function banIp(){try{await authService.banIp(banIpAddress.value,banIpReason.value);adminMessage.value='IP 已封禁';banIpAddress.value='';banIpReason.value='';await loadAdminModeration()}catch(e){adminMessage.value=e.response?.data?.detail||t('operationFailed')}}
async function unbanIp(id){try{await authService.unbanIp(id);adminMessage.value='IP 已解除封禁';await loadAdminModeration()}catch(e){adminMessage.value=e.response?.data?.detail||t('operationFailed')}}
</script>
