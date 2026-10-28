<template>
  <header class="header">
    <div class="header-logo" @click="router.push('/')"><span class="header-logo-text">柒月半</span></div>
    <div :class="['header-search', { open: searchOpen }]">
      <input v-model="keyword" type="text" :placeholder="t('searchPlaceholder')" @keydown.enter="search" />
      <button class="header-search-btn" @click="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
    </div>
    <div class="header-right">
      <button class="header-search-toggle" @click="searchOpen=!searchOpen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
      <button class="header-lang-btn" title="Switch Language" @click="toggleLang">{{ lang === 'zh' ? 'EN' : '中' }}</button>
      <div v-if="showAppBtn" class="header-app-btn"><span class="app-btn-text" @click="download">下载 App</span><button class="app-btn-close" title="隐藏" @click="dismiss">✕</button></div>
      <div v-if="isLoggedIn" :class="['header-user-badge', { 'header-user-admin': user?.is_admin }]">
        <span class="header-user-name"><span v-if="user?.is_admin" class="header-admin-tag">{{ t('superAdmin') }}</span>{{ user?.nickname }}</span>
        <span class="header-user-uid">uid: {{ String(user?.uid || '').padStart(5, '0') }}</span>
      </div>
      <LoginButton />
    </div>
  </header>
</template>
<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, useLang } from '../contexts/app'
import api from '../services/api'
import LoginButton from './LoginButton.vue'
import './Header.css'
const router = useRouter()
const { user, isLoggedIn } = useAuth()
const { t, toggleLang, lang } = useLang()
const keyword = ref(''), searchOpen = ref(false), showAppBtn = ref(true)
const dismiss = () => { showAppBtn.value = false; if (isLoggedIn.value) localStorage.setItem(`hideAppBtnTime_${user.value.uid}`, Date.now().toString()) }
watch([isLoggedIn, () => user.value?.uid], () => { const saved = localStorage.getItem(`hideAppBtnTime_${user.value?.uid}`); showAppBtn.value = !(saved && Date.now() - Number(saved) < 7 * 24 * 60 * 60 * 1000) }, { immediate: true })
const search = () => { router.push(keyword.value.trim() ? `/?search=${encodeURIComponent(keyword.value.trim())}` : '/'); searchOpen.value = false }
const download = async () => { try { const result = await api.get('/app-version/latest'); if (result.data?.download_url) { let url = result.data.download_url; if (!/^https?:\/\//i.test(url)) { url = `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${url.startsWith('/') ? '' : '/'}${url}` } location.href = url } else alert('App 下载地址未配置') } catch (error) { alert(error.response?.status === 404 ? '当前暂无最新版本的 App 可供下载' : '获取下载链接失败，请稍后重试') } }
</script>
