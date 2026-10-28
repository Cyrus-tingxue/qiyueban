<template>
  <div class="animated-coin-container" :class="{ swinging: isAnimating }" :style="containerStyle" :title="isAnimating ? '用户菜单' : '登录'" @click="$emit('click')">
    <svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg" style="overflow: visible" aria-hidden="true">
      <defs>
        <radialGradient id="bronzeDark" cx="40%" cy="30%" r="65%"><stop offset="0%" stop-color="#7a5542"/><stop offset="35%" stop-color="#2c1a11"/><stop offset="85%" stop-color="#080302"/><stop offset="100%" stop-color="#000000"/></radialGradient>
        <linearGradient id="textGlow" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#875139"/><stop offset="50%" stop-color="#ab7b5e"/><stop offset="100%" stop-color="#30160d"/></linearGradient>
        <linearGradient id="ropeGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#380606"/><stop offset="50%" stop-color="#961111"/><stop offset="100%" stop-color="#380606"/></linearGradient>
        <radialGradient id="bloodBead" cx="35%" cy="35%" r="60%"><stop offset="0%" stop-color="#ff1a1a"/><stop offset="50%" stop-color="#9c0404"/><stop offset="100%" stop-color="#1a0000"/></radialGradient>
        <filter id="heavyShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="3" dy="6" stdDeviation="4" flood-color="#000" flood-opacity="1"/><feDropShadow dx="0" dy="0" stdDeviation="15" flood-color="#9c0404" flood-opacity=".4"/></filter>
        <filter id="holeShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="1"/><feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#000" flood-opacity=".9"/></filter>
        <filter id="decay"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="5"/><feColorMatrix type="matrix" values="0 0 0 0 0,0 0 0 0 0,0 0 0 0 0,0 0 0 0.4 0"/><feBlend in="SourceGraphic" in2="noise" mode="multiply"/></filter>
      </defs>
      <g class="coin-group" filter="url(#heavyShadow)">
        <path d="M45-10L48 30M55-10L52 30" fill="none" stroke="url(#ropeGrad)" stroke-width="4.5" stroke-linecap="round"/>
        <rect x="46" y="8" width="8" height="6" fill="#1f0202"/><line x1="45" y1="11" x2="55" y2="11" stroke="#875139" stroke-width="1"/>
        <circle cx="50" cy="30" r="6" fill="url(#bloodBead)"/>
        <g transform="translate(50 48)">
          <path d="M0-10L10 0L0 10L-10 0Z" fill="#750b0b" stroke="#1f0202" stroke-width="2" stroke-linejoin="round"/>
          <path d="M-5-5C-25-10-25 10-5 5M5-5C25-10 25 10 5 5M-3-8C-10-25 10-25 3-8M-8 0L8 0M0-8L0 8M-3 9L-3 28M3 9L3 28" fill="none" stroke="url(#ropeGrad)" stroke-width="4.5" stroke-linecap="round"/>
        </g>
        <circle cx="50" cy="105" r="38" fill="url(#bronzeDark)" stroke="#050201" stroke-width="3" filter="url(#decay)"/>
        <circle cx="50" cy="105" r="34" fill="none" stroke="#0f0704" stroke-width="4"/><circle cx="50" cy="105" r="35" fill="none" stroke="#26130b" stroke-width=".8"/><circle cx="50" cy="105" r="31" fill="none" stroke="#402315" stroke-width="1.5" opacity=".6"/>
        <rect x="39" y="94" width="22" height="22" fill="#000" filter="url(#holeShadow)"/><rect x="36" y="91" width="28" height="28" fill="none" stroke="#0f0704" stroke-width="4"/><rect x="37.5" y="92.5" width="25" height="25" fill="none" stroke="#26130b" stroke-width="1"/><rect x="35" y="90" width="30" height="30" fill="none" stroke="#402315" stroke-width="1" opacity=".6"/>
        <g fill="url(#textGlow)" font-family="'Zhi Mang Xing','Ma Shan Zheng','Kaiti',serif" font-size="16" font-weight="900" text-anchor="middle" style="text-shadow: 1px 2px 3px #000"><text x="50" y="79">半</text><text x="50" y="125">月</text><text x="82" y="102">通</text><text x="18" y="102">寶</text></g>
        <path d="M47 75L47 101M53 75L53 101M44 105L44 115M56 105L56 115M44 114C44 125 47 130 47 135M56 114C56 125 53 130 53 135" fill="none" stroke="url(#ropeGrad)" stroke-width="5.5" stroke-linecap="round"/><rect x="46" y="118" width="8" height="5" fill="#1f0202"/>
        <g transform="translate(0 133)"><rect x="46" y="0" width="8" height="12" rx="1.5" fill="#1f0202"/><circle cx="48" cy="18" r="3" fill="url(#bloodBead)"/><circle cx="52" cy="18" r="3" fill="url(#bloodBead)"/><g fill="none" stroke="url(#ropeGrad)" stroke-linecap="round"><path d="M46 22Q35 45 42 75M54 22Q65 45 58 75" stroke-width="2.5"/><path d="M48 22Q46 50 49 85M52 22Q54 50 51 85M50 22C48 40 52 60 50 85" stroke-width="3.5"/><path d="M49 22Q48 50 47 80M51 22Q52 50 53 80" stroke="#260303" stroke-width="1"/></g></g>
      </g>
    </svg>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import './AnimatedCoin.css'
const props = defineProps({ isAnimating: { type: Boolean, default: true }, size: { type: Number, default: 90 } })
defineEmits(['click'])
const containerStyle = computed(() => ({ width: `${props.size / 1.8}px`, height: `${props.size}px` }))
</script>
