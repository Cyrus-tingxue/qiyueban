import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import './LoginPage.css';

function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useLang();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (!codeSent) {
                const data = await authService.forgotPassword(email);
                setCodeSent(true);
                setMessage(data.detail || t('resetCodeSent'));
                return;
            }
            if (password.length < 4) {
                setError(t('passwordMinLength'));
                return;
            }
            if (password !== confirmPassword) {
                setError(t('passwordMismatch'));
                return;
            }

            const data = await authService.resetPassword(email, code, password);
            setMessage(data.detail || t('passwordResetSuccess'));
            setCode('');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.response?.data?.detail || t('passwordResetFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h2>{t('resetPasswordTitle')}</h2>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label>{t('emailLabel')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('emailPlaceholder')}
                            required
                            disabled={codeSent}
                        />
                    </div>
                    {codeSent && (
                        <>
                            <div className="login-field">
                                <label>{t('emailVerificationCode')}</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('newPasswordPlaceholder')}
                                    required
                                />
                            </div>
                            <div className="login-field">
                                <label>{t('confirmNewPassword')}</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder={t('confirmPasswordPlaceholder')}
                                    required
                                />
                            </div>
                        </>
                    )}
                    {error && <div className="login-error">{error}</div>}
                    {message && <div className="login-success">{message}</div>}
                    <button className="login-submit" type="submit" disabled={loading}>
                        {loading ? t('submitting') : (codeSent ? t('confirmReset') : t('sendResetCode'))}
                    </button>
                </form>
                <div className="login-switch">
                    <Link to="/login">{t('goLogin')}</Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
