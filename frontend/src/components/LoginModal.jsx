import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import AvatarIcon from './AvatarIcon';
import './LoginModal.css';

function LoginModal({ onClose }) {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const [resetCodeSent, setResetCodeSent] = useState(false);
    const [avatar, setAvatar] = useState('eye');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { t } = useLang();

    const isRegister = mode === 'register';
    const isForgot = mode === 'forgot';

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setError('');
        setMessage('');
        setResetCode('');
        setResetPassword('');
        setResetConfirmPassword('');
        setResetCodeSent(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            if (isForgot) {
                if (!resetCodeSent) {
                    const data = await authService.forgotPassword(email);
                    setResetCodeSent(true);
                    setMessage(data.detail || t('resetCodeSent'));
                    return;
                }
                if (resetPassword.length < 4) {
                    setError(t('passwordMinLength'));
                    return;
                }
                if (resetPassword !== resetConfirmPassword) {
                    setError(t('passwordMismatch'));
                    return;
                }
                const data = await authService.resetPassword(email, resetCode, resetPassword);
                setMessage(data.detail || t('passwordResetSuccess'));
                setResetCode('');
                setResetPassword('');
                setResetConfirmPassword('');
                return;
            }

            const data = isRegister
                ? await authService.register(username, password, nickname || username, avatar, email)
                : await authService.login(username, password);
            login(data.user, data.token);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || t('loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="login-modal-overlay" onClick={handleOverlayClick}>
            <div className="login-modal">
                <div className="login-modal-header">
                    <span className="login-modal-title">{isForgot ? t('forgotPassword') : (isRegister ? t('registerTitle') : t('loginTitle'))}</span>
                    <button className="login-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="login-modal-body">
                        {!isForgot && (
                            <input
                                className="login-modal-input"
                                type="text"
                                placeholder={t('usernamePlaceholder')}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        )}

                        {(isRegister || isForgot) && (
                            <input
                                className="login-modal-input"
                                type="email"
                                placeholder={isRegister ? t('registerEmailPlaceholder') : t('emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required={isForgot}
                                autoFocus={isForgot}
                            />
                        )}

                        {isForgot && resetCodeSent && (
                            <>
                                <input
                                    className="login-modal-input"
                                    type="text"
                                    placeholder={t('emailCodePlaceholder')}
                                    value={resetCode}
                                    onChange={(e) => setResetCode(e.target.value)}
                                    inputMode="numeric"
                                    maxLength={6}
                                    required
                                />
                                <input
                                    className="login-modal-input"
                                    type="password"
                                    placeholder={t('newPasswordPlaceholder')}
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                    required
                                />
                                <input
                                    className="login-modal-input"
                                    type="password"
                                    placeholder={t('confirmPasswordPlaceholder')}
                                    value={resetConfirmPassword}
                                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                                    required
                                />
                            </>
                        )}

                        {!isForgot && (
                            <input
                                className="login-modal-input"
                                type="password"
                                placeholder={t('passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        )}

                        {isRegister && (
                            <div className="login-modal-register-field">
                                <input
                                    className="login-modal-input"
                                    type="text"
                                    placeholder={t('nicknamePlaceholder')}
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                />
                                <div className="avatar-selection">
                                    <p>{t('chooseAvatar')}</p>
                                    <div className="avatar-options" style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '10px 0', alignItems: 'center' }}>
                                        {['eye', 'ear', 'nose', 'mouth'].map((type) => (
                                            <div
                                                key={type}
                                                onClick={() => setAvatar(type)}
                                                style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    border: avatar === type ? '2px solid red' : '2px solid transparent',
                                                    borderRadius: '8px',
                                                    padding: '2px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'visible'
                                                }}
                                            >
                                                <AvatarIcon type={type} isAnimating={avatar === type} size={type === 'eye' ? 30 : 40} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && <div className="login-modal-error">{error}</div>}
                        {message && <div className="login-modal-success">{message}</div>}

                        <button className="login-modal-submit" type="submit" disabled={loading}>
                            {loading ? t('processing') : (isForgot ? (resetCodeSent ? t('confirmReset') : t('sendResetCode')) : (isRegister ? t('register') : t('loginBtn')))}
                        </button>
                    </div>
                </form>

                <div className="login-modal-footer">
                    <button className="login-modal-action" type="button" onClick={() => switchMode(isRegister || isForgot ? 'login' : 'register')}>
                        {isRegister || isForgot ? t('backToLogin') : t('registerAccount')}
                    </button>
                    {!isRegister && !isForgot && (
                        <button className="login-modal-action" type="button" onClick={() => switchMode('forgot')}>
                            {t('forgotPassword')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LoginModal;
