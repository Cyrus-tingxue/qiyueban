import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import AvatarIcon from '../components/AvatarIcon';
import './LoginPage.css';

function LoginPage() {
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
    const navigate = useNavigate();

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
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || t('loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h2>{isForgot ? t('forgotPassword') : (isRegister ? t('registerTitle') : t('loginTitle'))}</h2>
                <form className="login-form" onSubmit={handleSubmit}>
                    {!isForgot && (
                        <div className="login-field">
                            <label>{t('usernameLabel')}</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t('usernamePlaceholder')}
                                required
                            />
                        </div>
                    )}

                    {(isRegister || isForgot) && (
                        <div className="login-field">
                            <label>{t('emailLabel')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={isRegister ? t('registerEmailPlaceholder') : t('emailPlaceholder')}
                                required={isForgot}
                            />
                        </div>
                    )}

                    {isForgot && resetCodeSent && (
                        <>
                            <div className="login-field">
                                <label>{t('emailVerificationCode')}</label>
                                <input
                                    type="text"
                                    value={resetCode}
                                    onChange={(e) => setResetCode(e.target.value)}
                                    placeholder={t('emailCodePlaceholder')}
                                    inputMode="numeric"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <div className="login-field">
                                <label>{t('newPassword')}</label>
                                <input
                                    type="password"
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                    placeholder={t('newPasswordPlaceholder')}
                                    required
                                />
                            </div>
                            <div className="login-field">
                                <label>{t('confirmNewPassword')}</label>
                                <input
                                    type="password"
                                    value={resetConfirmPassword}
                                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                                    placeholder={t('confirmPasswordPlaceholder')}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {isRegister && (
                        <>
                            <div className="login-field">
                                <label>{t('nicknameLabel')}</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder={t('nicknamePlaceholder')}
                                />
                            </div>
                            <div className="login-field">
                                <label>{t('chooseAvatar')}</label>
                                <div className="avatar-options" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '10px', alignItems: 'center' }}>
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
                        </>
                    )}

                    {!isForgot && (
                        <div className="login-field">
                            <label>{t('passwordLabel')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('passwordPlaceholder')}
                                required
                            />
                        </div>
                    )}

                    {error && <div className="login-error">{error}</div>}
                    {message && <div className="login-success">{message}</div>}
                    <button className="login-submit" type="submit" disabled={loading}>
                        {loading ? t('processing') : (isForgot ? (resetCodeSent ? t('confirmReset') : t('sendResetCode')) : (isRegister ? t('register') : t('loginBtn')))}
                    </button>
                </form>
                <div className="login-switch">
                    {isForgot ? t('rememberPassword') : (isRegister ? t('haveAccount') : t('noAccount'))}
                    <button onClick={() => switchMode(isRegister || isForgot ? 'login' : 'register')}>
                        {isRegister || isForgot ? t('goLogin') : t('goRegister')}
                    </button>
                </div>
                {!isRegister && !isForgot && (
                    <div className="login-switch">
                        <button onClick={() => switchMode('forgot')}>{t('forgotPassword')}</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LoginPage;
