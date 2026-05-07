import { useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import api from '../services/api';
import './InviteGate.css';

function InviteGate({ onPass }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useLang();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!code.trim()) {
            setError(t('inviteEmpty'));
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/verify-invite', { code: code.trim() });
            sessionStorage.setItem('invite_verified', 'true');
            onPass();
        } catch (err) {
            setError(err.response?.data?.detail || t('inviteFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="invite-gate">
            <div className="invite-card">
                <p className="invite-subtitle">{t('inviteSubtitle')}</p>
                <form className="invite-form" onSubmit={handleSubmit}>
                    <input
                        className="invite-input"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={t('invitePlaceholder')}
                        autoFocus
                    />
                    {error && <div className="invite-error">{error}</div>}
                    <button className="invite-submit" type="submit" disabled={loading}>
                        {loading ? t('verifying') : t('enter')}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default InviteGate;
