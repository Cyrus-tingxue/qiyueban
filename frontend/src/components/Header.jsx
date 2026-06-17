import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import LoginButton from './LoginButton';
import api from '../services/api';
import './Header.css';

function Header() {
    const { user, isLoggedIn } = useAuth();
    const { t, toggleLang, lang } = useLang();
    const [keyword, setKeyword] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const navigate = useNavigate();

    const [showAppBtn, setShowAppBtn] = useState(true);

    useEffect(() => {
        if (isLoggedIn) {
            const hideTime = localStorage.getItem(`hideAppBtnTime_${user?.uid}`);
            if (hideTime) {
                const time = parseInt(hideTime, 10);
                if (Date.now() - time < 7 * 24 * 60 * 60 * 1000) {
                    setShowAppBtn(false);
                }
            }
        }
    }, [isLoggedIn, user?.uid]);

    const handleDismissAppBtn = () => {
        setShowAppBtn(false);
        if (isLoggedIn) {
            localStorage.setItem(`hideAppBtnTime_${user?.uid}`, Date.now().toString());
        }
    };

    const handleDownloadApp = async () => {
        try {
            const res = await api.get('/app-version/latest');
            if (res.data && res.data.download_url) {
                let url = res.data.download_url;
                if (!url.startsWith('http')) {
                    url = `${api.defaults.baseURL.replace('/api', '')}${url.startsWith('/') ? '' : '/'}${url}`;
                }
                window.location.href = url;
            } else {
                alert('App 下载地址未配置');
            }
        } catch (e) {
            if (e.response?.status === 404) {
                alert('当前暂无最新版本的 App 可供下载');
            } else {
                alert('获取下载链接失败，请稍后重试');
            }
        }
    };

    const handleSearch = () => {
        if (keyword.trim()) {
            navigate(`/?search=${encodeURIComponent(keyword.trim())}`);
            setSearchOpen(false);
        } else {
            navigate(`/`);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <header className="header">
            {/* 左侧 Logo */}
            <div className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <span className="header-logo-text">柒月半</span>
            </div>

            {/* 中间搜索框 */}
            <div className={`header-search ${searchOpen ? 'open' : ''}`}>
                <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className="header-search-btn" onClick={handleSearch}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </button>
            </div>

            {/* 右侧 */}
            <div className="header-right">
                <button className="header-search-toggle" onClick={() => setSearchOpen(!searchOpen)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </button>

                <button className="header-lang-btn" onClick={toggleLang} title="Switch Language">
                    {lang === 'zh' ? 'EN' : '中'}
                </button>

                {showAppBtn && (
                    <div className="header-app-btn">
                        <span onClick={handleDownloadApp} className="app-btn-text">下载 App</span>
                        <button className="app-btn-close" onClick={handleDismissAppBtn} title="隐藏">✕</button>
                    </div>
                )}

                {isLoggedIn && (
                    <div className={`header-user-badge ${user?.is_admin ? 'header-user-admin' : ''}`}>
                        <span className="header-user-name">
                            {user?.is_admin && <span className="header-admin-tag">{t('superAdmin')}</span>}
                            {user?.nickname}
                        </span>
                        <span className="header-user-uid">uid: {String(user?.uid || '').padStart(5, '0')}</span>
                    </div>
                )}
                <LoginButton />
            </div>
        </header>
    );
}

export default Header;
