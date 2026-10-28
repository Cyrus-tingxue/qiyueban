<template>
  <div v-if="hasError" class="vue-error-boundary">
    <h2>{{ lang === 'en' ? 'Something went wrong' : '页面出错了' }}</h2>
    <p>{{ error?.message }}</p>
    <button type="button" @click="reload">{{ lang === 'en' ? 'Reload' : '重新加载' }}</button>
  </div>
  <slot v-else />
</template>

<script setup>
import { onErrorCaptured, ref } from 'vue'

const hasError = ref(false)
const error = ref(null)
const lang = localStorage.getItem('lang') || 'zh'
onErrorCaptured((caught) => {
  hasError.value = true
  error.value = caught
  console.error('ErrorBoundary caught:', caught)
  return false
})
const reload = () => window.location.reload()
</script>

<style scoped>
.vue-error-boundary { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:50vh; color:#e0d8d0; font-family:var(--font-sans); padding:2rem; text-align:center; }
.vue-error-boundary h2 { color:#c42b2b; margin-bottom:1rem; }
.vue-error-boundary p { color:#8a8078; max-width:40rem; overflow-wrap:anywhere; }
.vue-error-boundary button { margin-top:1rem; padding:8px 24px; background:#c42b2b; color:#fff; border:none; cursor:pointer; }
</style>
