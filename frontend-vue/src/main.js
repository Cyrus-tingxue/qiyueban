import { createApp, h, onMounted, onUnmounted } from 'vue';
import { createRouter, createWebHistory, RouterView, useRouter } from 'vue-router';
import { provideAuth, provideLanguage, provideSound, useSound } from './contexts/app';
import Layout from './components/Layout.vue';
import ErrorBoundary from './components/ErrorBoundary.vue';
import HomePage from './pages/HomePage.vue';
import PostDetailPage from './pages/PostDetailPage.vue';
import CreatePostPage from './pages/CreatePostPage.vue';
import MyPage from './pages/MyPage.vue';
import AdminPage from './pages/AdminPage.vue';
import MessagesPage from './pages/MessagesPage.vue';
import ChatPage from './pages/ChatPage.vue';
import LoginPage from './pages/LoginPage.vue';
import ResetPasswordPage from './pages/ResetPasswordPage.vue';
import OpeningAnimation from './components/OpeningAnimation.vue';
import './index.css';
import './App.css';

const routes = [{ path: '/', component: Layout, children: [
  { path: '', component: HomePage }, { path: 'featured', component: HomePage }, { path: 'live', component: HomePage }, { path: 'oc', component: HomePage },
  { path: 'my', component: MyPage }, { path: 'admin', component: AdminPage }, { path: 'chat', component: HomePage }, { path: 'post/:id', component: PostDetailPage },
  { path: 'create-post', component: CreatePostPage }, { path: 'messages', component: MessagesPage }, { path: 'chat/:userId', component: ChatPage }, { path: 'chat/private/:userId', component: ChatPage }, { path: 'chat/group/:groupId', component: ChatPage },
  { path: 'login', component: LoginPage }, { path: 'reset-password', component: ResetPasswordPage },
]}];
const router = createRouter({ history: createWebHistory(), routes });

const App = { setup() {
  provideLanguage();
  const sound = provideSound();
  provideAuth();
  // App 自己刚刚调用 provideSound，不能通过 inject 取回自身提供的值。
  // 直接使用 provider 返回的状态，避免应用启动时因解构 undefined 而白屏。
  const { playSound } = sound;
  const handler = (e) => { if (e.target.closest('button, a, .blinking-eye, .post-item, .login-modal-close')) playSound('click'); };
  onMounted(() => document.addEventListener('click', handler, true)); onUnmounted(() => document.removeEventListener('click', handler, true));
  return () => h(ErrorBoundary, null, { default: () => [h(OpeningAnimation), h(RouterView)] });
}};
createApp(App).use(router).mount('#root');
