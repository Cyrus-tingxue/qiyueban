<template>
  <div v-if="searchQuery" class="home-search-results">{{ t('searchResults') }}"{{ searchQuery }}"</div>
  <PostList :posts="posts" :loading="loading" :refreshing="refreshing" />
  <Pagination v-if="totalPages > 1" :current-page="page" :total-pages="totalPages" @change="page = $event" />
  <CreatePostButton />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLang } from '../contexts/app'
import { postService } from '../services/postService'
import PostList from '../components/PostList.vue'
import Pagination from '../components/Pagination.vue'
import CreatePostButton from '../components/CreatePostButton.vue'

const route = useRoute()
const { t } = useLang()
const posts = ref([])
const loading = ref(true)
const refreshing = ref(false)
const page = ref(Number(sessionStorage.getItem(`home_page_${route.path}`) || 1))
const totalPages = ref(1)
const searchQuery = computed(() => route.query.search || '')
let request = 0
let previousPath = route.path
let previousSearch = searchQuery.value

const load = async () => {
  const id = ++request
  if (posts.value.length) refreshing.value = true
  else loading.value = true
  let category = null
  if (route.path === '/live') category = '语c'
  if (route.path === '/oc') category = 'OC投稿'
  try {
    const data = await postService.getPosts(page.value, 10, category, route.path === '/featured' ? 'likes' : 'newest', searchQuery.value)
    if (id === request) {
      posts.value = data.items || []
      totalPages.value = data.total_pages || 1
    }
  } catch {
    if (id === request) { posts.value = []; totalPages.value = 1 }
  } finally {
    if (id === request) {
      loading.value = false
      refreshing.value = false
      requestAnimationFrame(() => {
        const saved = sessionStorage.getItem(`home_scroll_${route.path}`)
        if (saved !== null) window.scrollTo({ top: Number(saved), behavior: 'instant' })
      })
    }
  }
}

const saveScroll = () => sessionStorage.setItem(`home_scroll_${route.path}`, String(window.scrollY))
watch(() => [route.path, searchQuery.value], () => {
  if (previousPath !== route.path || previousSearch !== searchQuery.value) {
    sessionStorage.removeItem(`home_scroll_${route.path}`)
    page.value = 1
  }
  previousPath = route.path
  previousSearch = searchQuery.value
})
watch(() => [route.path, searchQuery.value, page.value], load, { immediate: true })
watch(page, value => sessionStorage.setItem(`home_page_${route.path}`, String(value)))
onMounted(() => window.addEventListener('scroll', saveScroll))
onUnmounted(() => window.removeEventListener('scroll', saveScroll))
</script>

<style scoped>
.home-search-results { padding: 10px 20px; color: #ccc; font-size: 1.2em; }
</style>
