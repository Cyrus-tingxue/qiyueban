import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { announcementService } from '../services/announcementService';
import './AnnouncementModal.css';

function getAnnouncementHideKey(user) {
    return user?.uid ? `announcement_hidden_until_${user.uid}` : 'announcement_hidden_until_guest';
}

function getTokenExpireAt(token) {
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = JSON.parse(window.atob(padded));
        return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    } catch {
        return null;
    }
}

const AnnouncementModal = () => {
    const { user, token } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [skipForThisLogin, setSkipForThisLogin] = useState(false);

    const hideKey = useMemo(() => getAnnouncementHideKey(user), [user]);

    useEffect(() => {
        const hiddenUntil = Number(localStorage.getItem(hideKey) || 0);
        if (hiddenUntil > Date.now()) {
            setIsVisible(false);
            setLoading(false);
            return;
        }

        localStorage.removeItem(hideKey);
    }, [hideKey]);

    useEffect(() => {
        if (!isVisible) return;

        let active = true;

        const loadAnnouncement = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await announcementService.getAnnouncement();
                if (!active) return;
                setContent(data.content || '');
            } catch (err) {
                if (!active) return;
                setError(err.response?.data?.detail || '公告加载失败');
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadAnnouncement();
        return () => {
            active = false;
        };
    }, [isVisible]);

    const handleClose = () => {
        if (skipForThisLogin) {
            const expireAt = getTokenExpireAt(token);
            if (expireAt && user?.uid) {
                localStorage.setItem(hideKey, String(expireAt));
            }
        }
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="announcement-modal-overlay">
            <div className="announcement-modal">
                <button className="announcement-close" onClick={handleClose}>&times;</button>
                <h2>网站公告</h2>
                <div className="announcement-content">
                    <div className="announcement-panel">
                        {loading ? (
                            <p className="announcement-text announcement-loading">加载中...</p>
                        ) : (
                            <p className="announcement-text">{content || '暂无公告内容'}</p>
                        )}
                    </div>
                    {error && <p className="announcement-error">{error}</p>}
                </div>
                {user?.uid && (
                    <label className="announcement-checkbox">
                        <input
                            type="checkbox"
                            checked={skipForThisLogin}
                            onChange={(e) => setSkipForThisLogin(e.target.checked)}
                        />
                        <span>在本次登录有效期内不再弹出</span>
                    </label>
                )}
                <button className="announcement-btn" onClick={handleClose}>确认</button>
            </div>
        </div>
    );
};

export default AnnouncementModal;
