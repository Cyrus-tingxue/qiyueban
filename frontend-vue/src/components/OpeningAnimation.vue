<template>
  <Transition name="opening-fade">
    <section v-if="visible" class="opening-animation" aria-label="柒月半开场动画">
      <video
        ref="video"
        class="opening-animation__video"
        src="/assets/videos/touqi-opening-final.mp4"
        autoplay
        muted
        playsinline
        preload="auto"
        @ended="close"
      ></video>
      <div class="opening-animation__color-grade" aria-hidden="true"></div>
      <div class="opening-animation__film-frame" aria-hidden="true"></div>
      <div class="opening-animation__grain" aria-hidden="true"></div>
      <div class="opening-animation__curtain opening-animation__curtain--left" aria-hidden="true"></div>
      <div class="opening-animation__curtain opening-animation__curtain--right" aria-hidden="true"></div>
      <div class="opening-animation__watermark-mask opening-animation__watermark-mask--top" aria-hidden="true"></div>
      <div class="opening-animation__watermark-mask opening-animation__watermark-mask--bottom" aria-hidden="true"></div>

      <button class="opening-animation__skip" type="button" @click="close">跳过开场</button>

      <div class="opening-animation__title" aria-hidden="true">
        <p class="opening-animation__title-kicker">夜半 · 禁语 · 回声</p>
        <h1>柒月半</h1>
        <div class="opening-animation__rule">
          <i></i>
          <span>听见夜里的另一种声音</span>
          <i></i>
        </div>
        <div class="opening-animation__seal">柒</div>
      </div>

      <div class="opening-animation__progress" aria-hidden="true"><i></i></div>
    </section>
  </Transition>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

const visible = ref(false)
const video = ref(null)
const INTRO_KEY = 'touqi_opening_seen'
let timer

const markSeen = () => {
  try {
    sessionStorage.setItem(INTRO_KEY, '1')
  } catch {
    // 隐私模式下无法写入存储时，不影响动画关闭。
  }
}

const close = () => {
  if (!visible.value) return
  visible.value = false
  document.body.classList.remove('opening-active')
  video.value?.pause()
  markSeen()
}

onMounted(async () => {
  let seen = false
  let reducedMotion = false
  try {
    seen = sessionStorage.getItem(INTRO_KEY) === '1'
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    // 使用默认播放策略。
  }
  if (seen || reducedMotion) return

  visible.value = true
  document.body.classList.add('opening-active')
  await nextTick()
  video.value?.play().catch(() => {})
  timer = window.setTimeout(close, 4700)
})

onUnmounted(() => {
  window.clearTimeout(timer)
  document.body.classList.remove('opening-active')
})
</script>

<style src="./OpeningAnimation.css"></style>
