import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/postService';
import { authService } from '../services/authService';
import { messageService } from '../services/messageService';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import AvatarIcon from '../components/AvatarIcon';
import PostList from '../components/PostList';
import Pagination from '../components/Pagination';
import './MyPage.css';

function MyPage() {
    const { user, isLoggedIn, updateUser } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('notifications');
    const [email, setEmail] = useState(user?.email || '');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [emailCodeSent, setEmailCodeSent] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [groupInvites, setGroupInvites] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        if (!isLoggedIn) {
            return;
        }

        if (activeTab === 'notifications') {
            loadNotifications();
        } else if (activeTab === 'posts') {
            loadMyPosts(currentPage);
        }
    }, [isLoggedIn, activeTab, currentPage]);

    useEffect(() => {
        setEmail(user?.email || '');
    }, [user?.email]);

    const loadNotifications = async () => {
        setNotifLoading(true);
        try {
            const [data, inviteData] = await Promise.all([
                postService.getNotifications(1, 50),
                messageService.getGroupInvites(),
            ]);
            setNotifications(data.items || []);
            setGroupInvites(inviteData || []);
        } catch (e) {
            console.error('Failed to load notifications', e);
        } finally {
            setNotifLoading(false);
        }
    };

    const loadMyPosts = async (page) => {
        if (!user || user.uid === undefined) return;
        setPostsLoading(true);
        try {
            const data = await postService.getPosts(page, pageSize, null, 'newest', null, user.uid);
            setPosts(data.items || []);
            setTotalPages(data.total_pages || 1);
        } catch (e) {
            setPosts([]);
            setTotalPages(1);
        } finally {
            setPostsLoading(false);
        }
    };

    const handleReadAll = async () => {
        try {
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readAll' } }));
            await postService.readAllNotifications();
        } catch (e) {
            alert(t('operationFailed'));
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('确定要清空所有消息吗？此操作不可恢复。')) {
            return;
        }
        try {
            setNotifications([]);
            window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readAll' } }));
            await postService.clearAllNotifications();
        } catch (e) {
            alert(t('operationFailed'));
            loadNotifications();
        }
    };

    const handleAcceptGroupInvite = async (inviteId) => {
        try {
            const invite = await messageService.acceptGroupInvite(inviteId);
            await loadNotifications();
            navigate(`/chat/group/${invite.group_id}`);
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleRejectGroupInvite = async (inviteId) => {
        try {
            await messageService.rejectGroupInvite(inviteId);
            await loadNotifications();
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            try {
                setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
                window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readOne' } }));
                await postService.readNotification(notif.id);
            } catch (e) { }
        }
        if (notif.type === 'friend_request') {
            navigate('/messages');
            return;
        }
        if (notif.type === 'grave_request') {
            navigate('/admin');
            return;
        }
        if (notif.post_id) {
            navigate(`/post/${notif.post_id}`);
        }
    };

    const getNotificationText = (notif) => {
        if (notif.type === 'friend_request') return ' 申请添加你为好友';
        if (notif.type === 'reply_mention') return ' 回复并提到了你';
        if (notif.type === 'reply') return t('repliedYou');
        if (notif.type === 'grave_request') return ' 提交了坟贴申请';
        return t('mentionedYou');
    };

    const handleBindEmail = async (e) => {
        e.preventDefault();
        setEmailError('');
        setEmailSuccess('');
        setEmailLoading(true);
        try {
            if (!emailCodeSent) {
                const data = await authService.sendBindEmailCode(email, emailPassword);
                setEmailCodeSent(true);
                setEmailPassword('');
                setEmailSuccess(data.detail || t('emailCodeSent'));
                return;
            }

            const updatedUser = await authService.confirmEmail(email, emailCode);
            updateUser(updatedUser);
            setEmailPassword('');
            setEmailCode('');
            setEmailCodeSent(false);
            setEmailSuccess(t('emailBindSuccess'));
        } catch (err) {
            setEmailError(err.response?.data?.detail || t('emailBindFailed'));
        } finally {
            setEmailLoading(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="my-page-guest">
                <h2>{t('welcomeCenter')}</h2>
                <p>{t('pleaseLogin')}</p>
            </div>
        );
    }

    return (
        <div className="my-page">
            <div className="my-page-tabs">
                <button
                    className={`my-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    {t('myNotifications')}
                </button>
                <button
                    className={`my-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('posts');
                        setCurrentPage(1);
                    }}
                >
                    {t('myPosts')}
                </button>
                <button
                    className={`my-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                    onClick={() => setActiveTab('account')}
                >
                    {t('accountSecurity')}
                </button>
            </div>

            <div className="my-page-content">
                {activeTab === 'notifications' && (
                    <div className="my-notif-section">
                        <div className="my-notif-header">
                            <h3>{t('notifList')}</h3>
                            <div className="my-notif-actions">
                                <button className="read-all-btn" onClick={handleReadAll}>{t('markAllRead')}</button>
                                <button className="read-all-btn danger" onClick={handleClearAll}>全部清除</button>
                            </div>
                        </div>
                        {notifLoading ? (
                            <p className="my-loading-text">{t('loading')}</p>
                        ) : notifications.length === 0 && groupInvites.length === 0 ? (
                            <div className="my-empty-text">{t('noNotifications')}</div>
                        ) : (
                            <div className="my-notif-list">
                                {groupInvites.map((invite) => (
                                    <div key={`group-invite-${invite.id}`} className="my-notif-item unread">
                                        <div className="my-notif-avatar">
                                            <AvatarIcon type="eye" size={40} />
                                        </div>
                                        <div className="my-notif-body">
                                            <p>
                                                <span className="my-notif-sender">{invite.inviter?.nickname || invite.inviter?.username || t('someone')}</span>
                                                {' '}邀请你加入群聊「{invite.group_name}」
                                            </p>
                                            <span className="my-notif-time">{invite.created_at}</span>
                                            <div className="chat-list-actions friend-request-actions">
                                                <button type="button" className="mini-btn friend-request-btn" onClick={() => handleAcceptGroupInvite(invite.id)}>
                                                    同意
                                                </button>
                                                <button type="button" className="mini-btn ghost-mini-btn friend-request-btn" onClick={() => handleRejectGroupInvite(invite.id)}>
                                                    拒绝
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`my-notif-item ${notif.is_read ? 'read' : 'unread'}`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="my-notif-avatar">
                                            <AvatarIcon type={notif.sender_avatar || 'eye'} size={40} />
                                        </div>
                                        <div className="my-notif-body">
                                            <p>
                                                <span className="my-notif-sender">{notif.sender_name || t('someone')}</span>
                                                {getNotificationText(notif)}
                                            </p>
                                            <span className="my-notif-time">{notif.created_at}</span>
                                        </div>
                                        {!notif.is_read && <div className="my-notif-unread-badge">{t('unread')}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'posts' && (
                    <div className="my-posts-section">
                        {postsLoading ? (
                            <p className="my-loading-text">{t('loading')}</p>
                        ) : (
                            <>
                                <PostList posts={posts} loading={postsLoading} />
                                {totalPages > 1 && (
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'account' && (
                    <div className="my-account-section">
                        <div className="my-notif-header">
                            <h3>{t('accountSecurity')}</h3>
                        </div>
                        <form className="my-account-form" onSubmit={handleBindEmail}>
                            <div className="my-account-field">
                                <label>{t('emailLabel')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('emailPlaceholder')}
                                    required
                                />
                            </div>
                            {!emailCodeSent && (
                                <div className="my-account-field">
                                    <label>{t('passwordLabel')}</label>
                                    <input
                                        type="password"
                                        value={emailPassword}
                                        onChange={(e) => setEmailPassword(e.target.value)}
                                        placeholder={t('bindEmailPasswordPlaceholder')}
                                        required
                                    />
                                </div>
                            )}
                            {emailCodeSent && (
                                <div className="my-account-field">
                                    <label>{t('emailVerificationCode')}</label>
                                    <input
                                        type="text"
                                        value={emailCode}
                                        onChange={(e) => setEmailCode(e.target.value)}
                                        placeholder={t('emailCodePlaceholder')}
                                        inputMode="numeric"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            )}
                            {emailError && <div className="my-account-error">{emailError}</div>}
                            {emailSuccess && <div className="my-account-success">{emailSuccess}</div>}
                            <button className="read-all-btn my-account-submit" type="submit" disabled={emailLoading}>
                                {emailLoading ? t('submitting') : (emailCodeSent ? t('confirmBindEmail') : t('sendVerificationCode'))}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyPage;
