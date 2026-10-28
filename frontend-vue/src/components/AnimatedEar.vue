<template>
  <div class="animated-comb-container" :style="style" :title="isAnimating ? '用户菜单' : '选择符纸头像'" @click="$emit('click')">
    <svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d4a84a"/><stop offset=".5" stop-color="#b88828"/><stop offset="1" stop-color="#986818"/></linearGradient><linearGradient id="cinnabar" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#cc2222"/><stop offset="1" stop-color="#881111"/></linearGradient></defs><g :class="isAnimating ? 'talisman-float' : 'avatar-static-group'"><path d="M8 5q6-3 12 0q8-3 20 0q12-3 20 0q8-3 12 0l1 20-1 20 1 20-1 20 1 12q-6 3-12 0-8 3-15 0-8 3-15 0-8 3-13 0l-1-20 1-20-1-20z" fill="url(#paper)" stroke="#8a6818"/><rect x="12" y="10" width="56" height="96" fill="none" stroke="url(#cinnabar)" stroke-width="1.2"/><g stroke="url(#cinnabar)" fill="none" stroke-linecap="round"><ellipse cx="40" cy="24" rx="8" ry="5"/><circle cx="40" cy="24" r="2.5" fill="#aa1111"/><path d="M30 38h20M40 35v13M33 42h14M32 55h16M40 52v10M34 58q6 5 12 0M40 66v16M34 70h12M36 74h8M33 78h14M34 82q6 4 12 0"/></g><g transform="translate(40 95)" stroke="#cc2222" fill="none"><rect x="-7" y="-6" width="14" height="12"/><path d="M-3-3h6M0-4v7M-2 1q2 3 4 0"/></g></g></svg>
  </div>
</template>
<script setup>
import './AnimatedEar.css'
import { computed } from 'vue'
const props = defineProps({ isAnimating: { type: Boolean, default: true }, size: { type: Number, default: 90 } })
defineEmits(['click'])
const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>
