import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import './ChangePasswordModal.css';

function BindEmailModal({ onClose }) {
    const { user, updateUser } = useAuth();
    const { t } = useLang();
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (!codeSent) {
                const data = await authService.sendBindEmailCode(email, password);
                setCodeSent(true);
                setPassword('');
                setSuccess(data.detail || t('emailCodeSent'));
                return;
            }

            const updatedUser = await authService.confirmEmail(email, code);
            updateUser(updatedUser);
            setSuccess(t('emailBindSuccess'));
            setTimeout(() => onClose(), 1200);
        } catch (err) {
            setError(err.response?.data?.detail || t('emailBindFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cpw-overlay" onClick={onClose}>
            <div className="cpw-modal" onClick={(e) => e.stopPropagation()}>
                <button className="cpw-close" onClick={onClose}>&times;</button>
                <h2>{user?.email ? t('updateEmail') : t('bindEmail')}</h2>
                <form className="cpw-form" onSubmit={handleSubmit}>
                    <div className="cpw-field">
                        <label>{t('emailLabel')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('emailPlaceholder')}
                            required
                        />
                    </div>
                    {!codeSent && (
                        <div className="cpw-field">
                            <label>{t('passwordLabel')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('bindEmailPasswordPlaceholder')}
                                required
                            />
                        </div>
                    )}
                    {codeSent && (
                        <div className="cpw-field">
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
                    )}
                    {error && <div className="cpw-error">{error}</div>}
                    {success && <div className="cpw-success">{success}</div>}
                    <button className="cpw-submit" type="submit" disabled={loading}>
                        {loading ? t('submitting') : (codeSent ? t('confirmBindEmail') : t('sendVerificationCode'))}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default BindEmailModal;
