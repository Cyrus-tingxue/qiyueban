import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { messageService } from '../services/messageService';
import { postService } from '../services/postService';
import { getMutedGroupIds } from '../utils/groupMute';
import './NavBar.css';

const UNREAD_REFRESH_MS = 3000;
function NavBar() {
    const { isLoggedIn } = useAuth();
    const { t } = useLang();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    const navItems = [
        { key: 'navLatest', path: '/', icon: '馃敟' },
        { key: 'navFeatured', path: '/featured', icon: '鉁?' },
        { key: 'navLive', path: '/live', icon: '馃幁' },
        { key: 'navOC', path: '/oc', icon: '馃帹' },
        { key: 'navMy', path: '/my', icon: '馃懁' },
        { key: 'navChat', path: '/messages', icon: '馃挰' },
    ];

    useEffect(() => {
        if (!isLoggedIn) {
            setUnreadCount(0);
            setUnreadMessagesCount(0);
            return undefined;
        }

        let disposed = false;
        const fetchUnread = async () => {
            try {
                const [notificationData, conversations, groups] = await Promise.all([
                    postService.getUnreadNotificationsCount(),
                    messageService.getConversations(),
                    messageService.getGroups(),
                ]);
                if (disposed) return;
                const mutedGroupIds = new Set(getMutedGroupIds());
                const privateUnreadCount = conversations.reduce((sum, item) => sum + (item.unread_count || 0), 0);
                const groupUnreadCount = groups.reduce((sum, item) => (
                    mutedGroupIds.has(item.id) ? sum : sum + (item.unread_count || 0)
                ), 0);
                setUnreadCount(notificationData.unread_count || 0);
                setUnreadMessagesCount(privateUnreadCount + groupUnreadCount);
            } catch (e) {
                // Keep the current badge values if refresh fails.
            }
        };

        const handleNotifRead = (e) => {
            if (e.detail?.action === 'readAll') {
                setUnreadCount(0);
            } else if (e.detail?.action === 'readOne') {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
            fetchUnread();
        };

        const handleAppFocus = () => {
            if (document.visibilityState === 'visible') {
                fetchUnread();
            }
        };

        const handleMessageDataChanged = () => {
            fetchUnread();
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, UNREAD_REFRESH_MS);
        window.addEventListener('notificationRead', handleNotifRead);
        window.addEventListener('messageDataChanged', handleMessageDataChanged);
        window.addEventListener('messageUnreadStateChanged', handleMessageDataChanged);
        window.addEventListener('groupMuteChanged', handleMessageDataChanged);
        window.addEventListener('focus', handleAppFocus);
        document.addEventListener('visibilitychange', handleAppFocus);

        return () => {
            disposed = true;
            clearInterval(interval);
            window.removeEventListener('notificationRead', handleNotifRead);
            window.removeEventListener('messageDataChanged', handleMessageDataChanged);
            window.removeEventListener('messageUnreadStateChanged', handleMessageDataChanged);
            window.removeEventListener('groupMuteChanged', handleMessageDataChanged);
            window.removeEventListener('focus', handleAppFocus);
            document.removeEventListener('visibilitychange', handleAppFocus);
        };
    }, [isLoggedIn]);

    return (
        <nav className="navbar">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `navbar-item ${isActive ? 'active' : ''}`}
                >
                    <span className="navbar-label">{t(item.key)}</span>

                    {item.key === 'navMy' && unreadCount > 0 && (
                        <span className="nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}

                    {item.key === 'navChat' && unreadMessagesCount > 0 && (
                        <span className="nav-unread-badge">
                            {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                        </span>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}

export default NavBar;
