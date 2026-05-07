import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/postService';
import { authService } from '../services/authService';
import { announcementService } from '../services/announcementService';
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
    const [announcementDraft, setAnnouncementDraft] = useState('');
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [announcementSaving, setAnnouncementSaving] = useState(false);
    const [announcementError, setAnnouncementError] = useState('');
    const [announcementSuccess, setAnnouncementSuccess] = useState('');

    const [notifications, setNotifications] = useState([]);
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

    useEffect(() => {
        if (!isLoggedIn || !user?.is_admin || activeTab !== 'account') {
            return;
        }
        loadAnnouncement();
    }, [isLoggedIn, user?.is_admin, activeTab]);

    const loadNotifications = async () => {
        setNotifLoading(true);
        try {
            const data = await postService.getNotifications(1, 50);
            setNotifications(data.items || []);
        } catch (e) {
            console.error("加载消息失败", e);
        } finally {
            setNotifLoading(false);
        }
    };

    const loadMyPosts = async (page) => {
        if (!user || user.uid === undefined) return;
        setPostsLoading(true);
        try {
            const data = await postService.getPosts(page, pageSize, null, 'newest', null, user?.uid);
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
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readAll' } }));
            await postService.readAllNotifications();
        } catch (e) {
            alert(t('operationFailed'));
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            try {
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'readOne' } }));

                await postService.readNotification(notif.id);
            } catch (e) { }
        }
        if (notif.post_id) {
            navigate(`/post/${notif.post_id}`);
        }
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

    const loadAnnouncement = async () => {
        setAnnouncementLoading(true);
        setAnnouncementError('');
        try {
            const data = await announcementService.getAnnouncement();
            setAnnouncementDraft(data.content || '');
        } catch (err) {
            setAnnouncementError(err.response?.data?.detail || '公告加载失败');
        } finally {
            setAnnouncementLoading(false);
        }
    };

    const handleAnnouncementSave = async (e) => {
        e.preventDefault();
        setAnnouncementSaving(true);
        setAnnouncementError('');
        setAnnouncementSuccess('');
        try {
            const data = await announcementService.updateAnnouncement(announcementDraft);
            setAnnouncementDraft(data.content || '');
            setAnnouncementSuccess('公告已更新');
        } catch (err) {
            setAnnouncementError(err.response?.data?.detail || '公告保存失败');
        } finally {
            setAnnouncementSaving(false);
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
                            <button className="read-all-btn" onClick={handleReadAll}>{t('markAllRead')}</button>
                        </div>
                        {notifLoading ? (
                            <p className="my-loading-text">{t('loading')}</p>
                        ) : notifications.length === 0 ? (
                            <div className="my-empty-text">{t('noNotifications')}</div>
                        ) : (
                            <div className="my-notif-list">
                                {notifications.map(notif => (
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
                                                {notif.type === 'reply' ? t('repliedYou') : t('mentionedYou')}
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

                        {user?.is_admin && (
                            <div className="my-admin-section">
                                <div className="my-notif-header">
                                    <h3>公告管理</h3>
                                </div>
                                <form className="my-account-form" onSubmit={handleAnnouncementSave}>
                                    <div className="my-account-field">
                                        <label>论坛公告内容</label>
                                        <textarea
                                            className="my-admin-textarea"
                                            value={announcementDraft}
                                            onChange={(e) => setAnnouncementDraft(e.target.value)}
                                            placeholder="请输入论坛公告内容"
                                            disabled={announcementLoading || announcementSaving}
                                        />
                                    </div>
                                    {announcementError && <div className="my-account-error">{announcementError}</div>}
                                    {announcementSuccess && <div className="my-account-success">{announcementSuccess}</div>}
                                    <button
                                        className="read-all-btn my-account-submit"
                                        type="submit"
                                        disabled={announcementLoading || announcementSaving}
                                    >
                                        {announcementLoading ? '加载中...' : (announcementSaving ? '保存中...' : '保存公告')}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyPage;
