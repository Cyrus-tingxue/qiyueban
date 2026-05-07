import { useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import api from '../services/api';
import './ChangePasswordModal.css';

function ChangePasswordModal({ onClose }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useLang();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length < 4) {
            setError(t('passwordMinLength'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                old_password: oldPassword,
                new_password: newPassword,
            });
            setSuccess(t('passwordChanged'));
            setTimeout(() => onClose(), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || t('changeFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cpw-overlay" onClick={onClose}>
            <div className="cpw-modal" onClick={(e) => e.stopPropagation()}>
                <button className="cpw-close" onClick={onClose}>&times;</button>
                <h2>{t('changePasswordTitle')}</h2>
                <form className="cpw-form" onSubmit={handleSubmit}>
                    <div className="cpw-field">
                        <label>{t('oldPassword')}</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder={t('oldPasswordPlaceholder')}
                            required
                        />
                    </div>
                    <div className="cpw-field">
                        <label>{t('newPassword')}</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t('newPasswordPlaceholder')}
                            required
                        />
                    </div>
                    <div className="cpw-field">
                        <label>{t('confirmNewPassword')}</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('confirmPasswordPlaceholder')}
                            required
                        />
                    </div>
                    {error && <div className="cpw-error">{error}</div>}
                    {success && <div className="cpw-success">{success}</div>}
                    <button className="cpw-submit" type="submit" disabled={loading}>
                        {loading ? t('submitting') : t('confirmChange')}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ChangePasswordModal;
