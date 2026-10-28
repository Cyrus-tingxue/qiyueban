import { computed, inject, provide, ref, watch, onMounted, onUnmounted } from 'vue';
import { authService } from '../services/authService';
import zh from '../i18n/zh';
import en from '../i18n/en';

export const AUTH_KEY = Symbol('auth');
export const LANG_KEY = Symbol('lang');
export const SOUND_KEY = Symbol('sound');

export function provideAuth() {
  const user = ref(null);
  const token = ref(localStorage.getItem('token'));
  try { user.value = JSON.parse(localStorage.getItem('user') || 'null'); } catch { localStorage.removeItem('user'); }
  const isLoggedIn = computed(() => Boolean(token.value && user.value));
  const login = (data, tokenStr) => { user.value = data; token.value = tokenStr; localStorage.setItem('token', tokenStr); localStorage.setItem('user', JSON.stringify(data)); };
  const logout = () => { user.value = null; token.value = null; localStorage.removeItem('token'); localStorage.removeItem('user'); };
  const updateUser = (data) => { user.value = data; localStorage.setItem('user', JSON.stringify(data)); };
  let active = true;
  watch(token, async (currentToken) => { if (!currentToken) return; try { const profile = await authService.getProfile(); if (active) updateUser(profile); } catch { if (active) logout(); } }, { immediate: true });
  onUnmounted(() => { active = false; });
  provide(AUTH_KEY, { user, token, isLoggedIn, login, logout, updateUser });
  return { user, token, isLoggedIn, login, logout, updateUser };
}

export function useAuth() { return inject(AUTH_KEY); }

export function provideLanguage() {
  const lang = ref(localStorage.getItem('lang') || 'zh');
  const toggleLang = () => { lang.value = lang.value === 'zh' ? 'en' : 'zh'; localStorage.setItem('lang', lang.value); };
  const t = (key) => ({ zh, en }[lang.value]?.[key] || en[key] || zh[key] || key);
  provide(LANG_KEY, { lang, toggleLang, t });
  return { lang, toggleLang, t };
}
export function useLang() { return inject(LANG_KEY); }

export function provideSound() {
  const bgmEnabled = ref(false);
  let bgmAudio = null;
  let clickAudio = null;
  let currentBgmIndex = -1;
  const bgmList = ['/assets/sounds/bgm/论坛背景音乐1.mp3', '/assets/sounds/bgm/论坛背景音乐2.mp3', '/assets/sounds/bgm/论坛背景音乐3.mp3', '/assets/sounds/bgm/论坛背景音乐4.mp3'];
  const nextBgm = () => { if (!bgmEnabled.value) return; let n; do { n = Math.floor(Math.random() * bgmList.length); } while (bgmList.length > 1 && n === currentBgmIndex); currentBgmIndex = n; playBgm(n); };
  const playBgm = (index) => { bgmAudio?.pause(); bgmAudio = new Audio(bgmList[index]); bgmAudio.volume = 1; bgmAudio.addEventListener('ended', nextBgm); bgmAudio.play().catch(() => { bgmEnabled.value = false; }); };
  const toggleBgm = () => { bgmEnabled.value = !bgmEnabled.value; if (bgmEnabled.value) { if (!bgmAudio) nextBgm(); else bgmAudio.play().catch(() => { bgmEnabled.value = false; }); } else bgmAudio?.pause(); };
  const playSound = (type) => { if (type === 'click' && clickAudio) { clickAudio.currentTime = 0; clickAudio.play().catch(() => {}); } };
  onMounted(() => { clickAudio = new Audio('/assets/sounds/bgm/按键音效.mp3'); clickAudio.volume = 1; });
  onUnmounted(() => { bgmAudio?.pause(); bgmAudio = null; });
  provide(SOUND_KEY, { bgmEnabled, toggleBgm, nextBgm, playSound });
  return { bgmEnabled, toggleBgm, nextBgm, playSound };
}
export function useSound() { return inject(SOUND_KEY); }

export function useStateMap(initial = {}) {
  const state = ref({ ...initial });
  const set = (key, value) => { state.value[key] = value; };
  return { state, set };
}
