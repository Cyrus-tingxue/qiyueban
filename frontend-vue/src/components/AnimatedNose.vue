<template>
  <div class="animated-avatar-container" :style="style" :title="isAnimating ? '用户菜单' : '选择头像'" @click="$emit('click')">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><radialGradient id="nose-bg"><stop stop-color="#400000"/><stop offset=".6" stop-color="#0a0000"/><stop offset="1"/></radialGradient><linearGradient id="nose-body"><stop stop-color="#444"/><stop offset=".2" stop-color="#dcdcdc"/><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#222"/></linearGradient><radialGradient id="nose-flame"><stop stop-color="#fff"/><stop offset=".25" stop-color="#ff4d4d"/><stop offset=".7" stop-color="#770000"/><stop offset="1" stop-color="#110000"/></radialGradient></defs>
      <g :class="isAnimating ? 'candle-animated-group' : 'avatar-static-group'">
        <ellipse cx="50" cy="91" rx="18" ry="4.5" fill="#000" opacity=".9"/>
        <path d="M40 42v48q10 4 20 0V42z" fill="url(#nose-body)"/><ellipse cx="50" cy="42" rx="10" ry="2.5" fill="#888"/><path d="M40 42c0 2 5 4 10 3 5-1 10 0 10-3 0-2-10-3-20 0z" fill="#a10b0b"/>
        <path d="M50 41q2-3-1-8" fill="none" stroke="#080000" stroke-width="1.5"/><circle cx="49" cy="33" r="1.2" fill="#ff6666"/>
        <path d="M49 14c12 11 5 21 0 21-5 0-12-10 0-21z" fill="url(#nose-flame)"/>
        <path d="M49 26c4 5 2 8 0 8s-4-3 0-8z" fill="#080000"/>
      </g>
    </svg>
  </div>
</template>
<script setup>
import './AnimatedNose.css'
import { computed } from 'vue'
const props = defineProps({ isAnimating: { type: Boolean, default: true }, size: { type: Number, default: 90 } })
defineEmits(['click'])
const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>
