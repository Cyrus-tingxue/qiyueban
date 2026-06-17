import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { announcementService } from '../services/announcementService';
import { authService } from '../services/authService';
import { postService } from '../services/postService';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import './MyPage.css';
import './AdminPage.css';

function AdminPage() {
    const { user, isLoggedIn } = useAuth();
    const { t } = useLang();
    const [announcementDraft, setAnnouncementDraft] = useState('');
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [announcementSaving, setAnnouncementSaving] = useState(false);
    const [announcementError, setAnnouncementError] = useState('');
    const [announcementSuccess, setAnnouncementSuccess] = useState('');
    const [graveRequests, setGraveRequests] = useState([]);
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminMessage, setAdminMessage] = useState('');
    const [banUserId, setBanUserId] = useState('');
    const [banUsername, setBanUsername] = useState('');
    const [banReason, setBanReason] = useState('');
    const [banIp, setBanIp] = useState('');
    const [banIpReason, setBanIpReason] = useState('');
    const [ipBans, setIpBans] = useState([]);

    const [appVersionLoading, setAppVersionLoading] = useState(false);
    const [appDownloadUrl, setAppDownloadUrl] = useState('');
    const [appVersionId, setAppVersionId] = useState(null);
    const [appVersionMessage, setAppVersionMessage] = useState('');

    useEffect(() => {
        if (!isLoggedIn || !user?.is_admin) return;
        loadAnnouncement();
        loadAdminModeration();
        loadAppVersion();
    }, [isLoggedIn, user?.is_admin]);

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

    const loadAppVersion = async () => {
        try {
            const { data } = await api.get('/app-version/latest');
            setAppDownloadUrl(data.download_url || '');
            setAppVersionId(data.id);
        } catch (err) {
            // No version exists yet
        }
    };

    const handleApkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAppVersionLoading(true);
        setAppVersionMessage('正在上传安装包(APK 文件较大，请耐心等待)...');
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post('/uploads/upload/apk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAppDownloadUrl(data.url);
            setAppVersionMessage('APK 上传成功！请点击下方“保存配置”按钮生效。');
        } catch (err) {
            setAppVersionMessage(err.response?.data?.detail || '上传失败，可能文件太大或格式不正确');
        } finally {
            setAppVersionLoading(false);
            e.target.value = null;
        }
    };

    const handleSaveAppVersion = async (e) => {
        e.preventDefault();
        setAppVersionLoading(true);
        setAppVersionMessage('');
        try {
            if (appVersionId) {
                await api.put(`/app-version/${appVersionId}`, { download_url: appDownloadUrl });
            } else {
                await api.post('/app-version/', { 
                    version_code: 999, 
                    version_name: '1.0.0', 
                    download_url: appDownloadUrl,
                    update_log: '初始发布'
                });
            }
            setAppVersionMessage('App 下载地址配置已生效！去前台点下载试试吧！');
            await loadAppVersion();
        } catch (err) {
            setAppVersionMessage(err.response?.data?.detail || '保存配置失败');
        } finally {
            setAppVersionLoading(false);
        }
    };

    const loadAdminModeration = async () => {
        setAdminLoading(true);
        try {
            const [requests, bans] = await Promise.all([
                postService.getGraveRequests('pending'),
                authService.getIpBans(),
            ]);
            setGraveRequests(requests || []);
            setIpBans(bans || []);
        } catch (err) {
            setAdminMessage(err.response?.data?.detail || t('operationFailed'));
        } finally {
            setAdminLoading(false);
        }
    };

    const handleReviewGraveRequest = async (requestId, approved) => {
        try {
            if (approved) {
                await postService.approveGraveRequest(requestId);
                setAdminMessage('已同意坟贴申请，并自动锁定帖子');
            } else {
                await postService.rejectGraveRequest(requestId);
                setAdminMessage('已拒绝坟贴申请');
            }
            await loadAdminModeration();
        } catch (err) {
            setAdminMessage(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleBanUserById = async (e) => {
        e.preventDefault();
        try {
            await authService.banUser(banUserId, banReason);
            setAdminMessage('账号已封禁');
            setBanUserId('');
            setBanReason('');
        } catch (err) {
            setAdminMessage(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleBanUserByUsername = async () => {
        try {
            await authService.banUserByUsername(banUsername, banReason);
            setAdminMessage('账号已封禁');
            setBanUsername('');
            setBanReason('');
        } catch (err) {
            setAdminMessage(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleUnbanUser = async () => {
        if (!banUserId || !/^\d+$/.test(banUserId.trim())) {
            setAdminMessage('解除封禁请填写用户 UID');
            return;
        }
        try {
            await authService.unbanUser(banUserId.trim());
            setAdminMessage('账号已解除封禁');
            setBanUserId('');
            setBanReason('');
        } catch (err) {
            setAdminMessage(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleBanIp = async (e) => {
        e.preventDefault();
        try {
            await authService.banIp(banIp, banIpReason);
            setAdminMessage('IP 已封禁');
            setBanIp('');
            setBanIpReason('');
            await loadAdminModeration();
        } catch (err) {
            setAdminMessage(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleUnbanIp = async (banId) => {
        try {
            await authService.unbanIp(banId);
            setAdminMessage('IP 已解除封禁');
            await loadAdminModeration();
        } catch (err) {
            setAdminMessage(err.response?.data?.detail || t('operationFailed'));
        }
    };

    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (!user?.is_admin) return <Navigate to="/my" replace />;

    return (
        <div className="my-page admin-page">
            <div className="admin-title-row">
                <h2>管理后台</h2>
                <button className="read-all-btn" type="button" onClick={loadAdminModeration} disabled={adminLoading}>
                    {adminLoading ? '刷新中...' : '刷新'}
                </button>
            </div>

            {adminMessage && <div className="my-account-success admin-global-message">{adminMessage}</div>}

            <section className="my-admin-panel admin-panel-first">
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
                    <button className="read-all-btn my-account-submit" type="submit" disabled={announcementLoading || announcementSaving}>
                        {announcementLoading ? '加载中...' : (announcementSaving ? '保存中...' : '保存公告')}
                    </button>
                </form>
            </section>

            <section className="my-admin-panel">
                <div className="my-notif-header">
                    <h3>App 下载配置</h3>
                </div>
                <form className="my-account-form" onSubmit={handleSaveAppVersion}>
                    <div className="my-account-field">
                        <label>安装包直链 (Download URL)</label>
                        <input
                            type="text"
                            value={appDownloadUrl}
                            onChange={(e) => setAppDownloadUrl(e.target.value)}
                            placeholder="可直接填入蓝奏云直链，或在下方直接上传本地 APK"
                            disabled={appVersionLoading}
                        />
                    </div>
                    
                    <div className="my-account-field">
                        <label>上传本地 APK 到服务器 (会自动填充链接)</label>
                        <input
                            type="file"
                            accept=".apk"
                            onChange={handleApkUpload}
                            disabled={appVersionLoading}
                            style={{ padding: '8px 0', border: 'none', background: 'transparent' }}
                        />
                    </div>

                    {appVersionMessage && (
                        <div className={`my-account-${appVersionMessage.includes('失败') ? 'error' : 'success'}`}>
                            {appVersionMessage}
                        </div>
                    )}
                    
                    <button className="read-all-btn my-account-submit" type="submit" disabled={appVersionLoading}>
                        {appVersionLoading ? '处理中...' : '保存配置'}
                    </button>
                </form>
            </section>

            <section className="my-admin-panel">
                <div className="my-notif-header">
                    <h3>坟贴申请</h3>
                </div>
                {graveRequests.length === 0 ? (
                    <div className="my-empty-text">暂无待审核坟贴申请</div>
                ) : (
                    <div className="my-admin-list">
                        {graveRequests.map((item) => (
                            <div className="my-admin-item" key={item.id}>
                                <div>
                                    <strong>{item.post_title || `帖子 #${item.post_id}`}</strong>
                                    <p>申请人：{item.requester_name}</p>
                                    {item.reason && <p>原因：{item.reason}</p>}
                                </div>
                                <div className="my-admin-actions">
                                    <button className="read-all-btn" type="button" onClick={() => handleReviewGraveRequest(item.id, true)}>同意</button>
                                    <button className="read-all-btn danger" type="button" onClick={() => handleReviewGraveRequest(item.id, false)}>拒绝</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="my-admin-panel">
                <div className="my-notif-header">
                    <h3>账号封禁</h3>
                </div>
                <form className="my-account-form" onSubmit={handleBanUserById}>
                    <div className="my-account-field">
                        <label>用户 UID</label>
                        <input value={banUserId} onChange={(e) => setBanUserId(e.target.value)} placeholder="输入用户 UID" inputMode="numeric" required />
                    </div>
                    <div className="my-account-field">
                        <label>用户名</label>
                        <input value={banUsername} onChange={(e) => setBanUsername(e.target.value)} placeholder="输入用户名" />
                    </div>
                    <div className="my-account-field">
                        <label>封禁原因</label>
                        <input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="可留空" />
                    </div>
                    <div className="my-admin-actions left">
                        <button className="read-all-btn" type="submit">按 UID 封禁</button>
                        <button className="read-all-btn" type="button" onClick={handleBanUserByUsername} disabled={!banUsername.trim()}>按用户名封禁</button>
                        <button className="read-all-btn danger" type="button" onClick={handleUnbanUser}>解除封禁</button>
                    </div>
                </form>
            </section>

            <section className="my-admin-panel">
                <div className="my-notif-header">
                    <h3>IP 封禁</h3>
                </div>
                <form className="my-account-form" onSubmit={handleBanIp}>
                    <div className="my-account-field">
                        <label>IP 地址</label>
                        <input value={banIp} onChange={(e) => setBanIp(e.target.value)} placeholder="例如 127.0.0.1" required />
                    </div>
                    <div className="my-account-field">
                        <label>封禁原因</label>
                        <input value={banIpReason} onChange={(e) => setBanIpReason(e.target.value)} placeholder="可留空" />
                    </div>
                    <button className="read-all-btn my-account-submit" type="submit">封禁 IP</button>
                </form>
                <div className="my-admin-list">
                    {ipBans.map((item) => (
                        <div className="my-admin-item" key={item.id}>
                            <div>
                                <strong>{item.ip_address}</strong>
                                {item.reason && <p>{item.reason}</p>}
                            </div>
                            <button className="read-all-btn danger" type="button" onClick={() => handleUnbanIp(item.id)}>解除</button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default AdminPage;
