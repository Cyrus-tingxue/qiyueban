<script setup>
import AnimatedCoin from './AnimatedCoin.vue'
import AnimatedNose from './AnimatedNose.vue'
import AnimatedEar from './AnimatedEar.vue'
import AnimatedIncenseBurner from './AnimatedIncenseBurner.vue'
const props = defineProps({ type: { type: String, default: 'eye' }, isAnimating: { type: Boolean, default: true }, size: { type: Number, default: 90 } })
defineEmits(['click'])
</script>
<template>
  <AnimatedNose v-if="props.type === 'nose'" :size="props.size" :is-animating="props.isAnimating" @click="$emit('click')" />
  <AnimatedEar v-else-if="props.type === 'ear'" :size="props.size" :is-animating="props.isAnimating" @click="$emit('click')" />
  <AnimatedIncenseBurner v-else-if="props.type === 'mouth'" :size="props.size" :is-animating="props.isAnimating" @click="$emit('click')" />
  <AnimatedCoin v-else :size="props.size" :is-animating="props.isAnimating" @click="$emit('click')" />
</template>
