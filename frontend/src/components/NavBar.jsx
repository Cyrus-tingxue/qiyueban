import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import './NavBar.css';

function NavBar() {
    const { isLoggedIn } = useAuth();
    const { t } = useLang();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    const navItems = [
        { key: 'navLatest', path: '/', icon: '🔥' },
        { key: 'navFeatured', path: '/featured', icon: '✨' },
        { key: 'navLive', path: '/live', icon: '🎭' },
        { key: 'navOC', path: '/oc', icon: '🎨' },
        { key: 'navMy', path: '/my', icon: '👤' },
        { key: 'navChat', path: '/messages', icon: '💬' },
    ];

    useEffect(() => {
        if (!isLoggedIn) {
            setUnreadCount(0);
            return;
        }

        const fetchUnread = async () => {
            try {
                import('../services/postService').then(async ({ postService }) => {
                    const data = await postService.getNotifications(1, 1);
                    setUnreadCount(data.unread_count || 0);
                });
            } catch (e) { }
        };

        const fetchUnreadMessages = async () => {
            try {
                import('../services/messageService').then(async ({ messageService }) => {
                    const data = await messageService.getUnreadCount();
                    setUnreadMessagesCount(data.unread_count || 0);
                });
            } catch (e) { }
        };

        fetchUnread();
        fetchUnreadMessages();
        const interval = setInterval(() => {
            fetchUnread();
            fetchUnreadMessages();
        }, 30000);

        const handleNotifRead = (e) => {
            if (e.detail?.action === 'readAll') {
                setUnreadCount(0);
            } else if (e.detail?.action === 'readOne') {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            fetchUnread();
        };
        window.addEventListener('notificationRead', handleNotifRead);

        return () => {
            clearInterval(interval);
            window.removeEventListener('notificationRead', handleNotifRead);
        };
    }, [isLoggedIn]);

    return (
        <nav className="navbar">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        `navbar-item ${isActive ? 'active' : ''}`
                    }
                >
                    <span className="navbar-label">{t(item.key)}</span>

                    {item.key === 'navMy' && unreadCount > 0 && (
                        <span className="nav-unread-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
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
