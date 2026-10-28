<template>
  <div class="animated-avatar-container" :style="style" :title="isAnimating ? '用户菜单' : '选择香炉头像'" @click="$emit('click')"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="burner-metal"><stop stop-color="#1a1a1a"/><stop offset=".5" stop-color="#4a0f0f"/><stop offset="1" stop-color="#0a0a0a"/></linearGradient></defs><g :class="isAnimating ? 'incense-animated-group' : 'avatar-static-group'"><path class="smoke smoke-1" d="M38 36c-2-8 6-16 0-26C34 3 42-4 40-8" fill="none" stroke="#c86464" stroke-width="1.2"/><path class="smoke smoke-2" d="M50 28c5-10-7-20 0-28 6-8-5-14 0-18" fill="none" stroke="#ddd" stroke-width="1.8"/><path class="smoke smoke-3" d="M62 36c2-8-6-16 0-26 4-7-4-14-2-18" fill="none" stroke="#c86464" stroke-width="1.2"/><line x1="38" y1="38" x2="43" y2="60" stroke="#3d1c10" stroke-width="2.5"/><line x1="50" y1="32" x2="50" y2="61" stroke="#2b1108" stroke-width="3"/><line x1="62" y1="38" x2="57" y2="60" stroke="#3d1c10" stroke-width="2.5"/><path d="M18 60c0 32 64 32 64 0z" fill="url(#burner-metal)" stroke="#0a0000" stroke-width="1.5"/><path d="M26 66c9-8 16 6 19 0 5-4 5 4 10 0 3 6 10-8 19 0" fill="none" stroke="#e60000" stroke-width="1.2" opacity=".6"/><ellipse cx="50" cy="59" rx="32" ry="8" fill="#661010" stroke="#0a0000" stroke-width="1.5"/><ellipse cx="50" cy="59" rx="25" ry="4" fill="#2d1c1c"/></g></svg></div>
</template>
<script setup>
import './AnimatedIncenseBurner.css'
import { computed } from 'vue'
const props = defineProps({ isAnimating: { type: Boolean, default: true }, size: { type: Number, default: 90 } })
defineEmits(['click'])
const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>
