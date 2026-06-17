import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';

import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { messageService } from '../services/messageService';
import { postService } from '../services/postService';
import { getMutedGroupIds } from '../utils/groupMute';
import './NavBar.css';

const UNREAD_REFRESH_MS = 3000;

function NavBar() {
    const { isLoggedIn, user } = useAuth();
    const { t } = useLang();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    const navItems = [
        { key: 'navLatest', path: '/', icon: 'new' },
        { key: 'navFeatured', path: '/featured', icon: 'hot' },
        { key: 'navLive', path: '/live', icon: 'live' },
        { key: 'navOC', path: '/oc', icon: 'oc' },
        { key: 'navMy', path: '/my', icon: 'my' },
        { key: 'navChat', path: '/messages', icon: 'chat' },
    ];

    if (user?.is_admin) {
        navItems.push({ key: 'navAdmin', path: '/admin', label: '管理', icon: 'admin' });
    }



    useEffect(() => {
        if (!isLoggedIn) {
            setUnreadCount(0);
            setUnreadMessagesCount(0);
            return undefined;
        }

        let disposed = false;
        const fetchUnread = async () => {
            try {
                const [notificationData, conversations, groups, groupInvites] = await Promise.all([
                    postService.getUnreadNotificationsCount(),
                    messageService.getConversations(),
                    messageService.getGroups(),
                    messageService.getGroupInvites(),
                ]);
                if (disposed) return;
                const mutedGroupIds = new Set(getMutedGroupIds());
                const privateUnreadCount = conversations.reduce((sum, item) => sum + (item.unread_count || 0), 0);
                const groupUnreadCount = groups.reduce((sum, item) => (
                    mutedGroupIds.has(item.id) ? sum : sum + (item.unread_count || 0)
                ), 0);
                const groupInviteCount = groupInvites.length;
                setUnreadCount((notificationData.unread_count || 0) + groupInviteCount);
                setUnreadMessagesCount(privateUnreadCount + groupUnreadCount + groupInviteCount);
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
                    <span className="navbar-label">{item.label || t(item.key)}</span>

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
