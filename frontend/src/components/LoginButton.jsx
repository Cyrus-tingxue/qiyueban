import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import LoginModal from './LoginModal';
import ChangePasswordModal from './ChangePasswordModal';
import BindEmailModal from './BindEmailModal';
import AvatarIcon from './AvatarIcon';
import './LoginButton.css';

function LoginButton() {
    const { user, isLoggedIn, logout } = useAuth();
    const { t } = useLang();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [showBindEmail, setShowBindEmail] = useState(false);

    if (isLoggedIn) {
        return (
            <div style={{ position: 'relative' }}>
                <AvatarIcon type={user?.avatar || 'eye'} onClick={() => setShowDropdown(!showDropdown)} />
                {showDropdown && (
                    <div className="user-dropdown">
                        <button className="user-dropdown-item" onClick={() => { setShowChangePwd(true); setShowDropdown(false); }}>
                            {t('changePassword')}
                        </button>
                        <button className="user-dropdown-item" onClick={() => { setShowBindEmail(true); setShowDropdown(false); }}>
                            {user?.email ? t('updateEmail') : t('bindEmail')}
                        </button>
                        <button className="user-dropdown-item" onClick={() => { logout(); setShowDropdown(false); }}>
                            {t('logout')}
                        </button>
                    </div>
                )}
                {showChangePwd && createPortal(
                    <ChangePasswordModal onClose={() => setShowChangePwd(false)} />,
                    document.body
                )}
                {showBindEmail && createPortal(
                    <BindEmailModal onClose={() => setShowBindEmail(false)} />,
                    document.body
                )}
            </div>
        );
    }

    return (
        <>
            <button className="login-btn" onClick={() => setShowLoginModal(true)}>
                <span className="login-btn-text">{t('login')}</span>
            </button>
            {showLoginModal && createPortal(
                <LoginModal onClose={() => setShowLoginModal(false)} />,
                document.body
            )}
        </>
    );
}

export default LoginButton;
