import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SoundProvider, useSound } from './contexts/SoundContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import CreatePostPage from './pages/CreatePostPage';
import MyPage from './pages/MyPage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SoundController from './components/SoundController';
import { useEffect } from 'react';
import './App.css';

// 独立抽出负责绑定全局事件的组件，以便能调用 useSound hook
function GlobalSoundEffects() {
  const { playSound } = useSound();

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const interactable = e.target.closest('button, a, .blinking-eye, .post-item, .login-modal-close');
      if (interactable) {
        playSound('click');
      }
    };

    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [playSound]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <SoundProvider>
          <AuthProvider>
            <BrowserRouter>
              <GlobalSoundEffects />
              <SoundController />
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="featured" element={<HomePage />} />
                  <Route path="live" element={<HomePage />} />
                  <Route path="oc" element={<HomePage />} />
                  <Route path="my" element={<MyPage />} />
                  <Route path="chat" element={<HomePage />} />
                  <Route path="post/:id" element={<PostDetailPage />} />
                  <Route path="create-post" element={<CreatePostPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="chat/:userId" element={<ChatPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="reset-password" element={<ResetPasswordPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </SoundProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
