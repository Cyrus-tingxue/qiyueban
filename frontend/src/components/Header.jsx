import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import LoginButton from './LoginButton';
import './Header.css';

function Header() {
    const { user, isLoggedIn } = useAuth();
    const { t, toggleLang, lang } = useLang();
    const [keyword, setKeyword] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const navigate = useNavigate();

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
