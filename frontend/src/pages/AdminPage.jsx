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

    useEffect(() => {
        if (!isLoggedIn || !user?.is_admin) return;
        loadAnnouncement();
        loadAdminModeration();
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
            <section className="my-admin-panel">
                <div className="my-notif-header">
                    <h3>App 版本发布</h3>
                </div>
                <form className="my-account-form" onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                        const form = e.target;
                        const data = {
                            version_code: parseInt(form.version_code.value, 10),
                            version_name: form.version_name.value,
                            download_url: form.download_url.value,
                            update_log: form.update_log.value,
                            force_update: form.force_update.checked
                        };
                        const { appVersionService } = await import('../services/appVersionService.js').catch(() => ({ 
                            appVersionService: {
                                createVersion: async (d) => {
                                    const { default: api } = await import('../services/api.js');
                                    return (await api.post('/app-version/', d)).data;
                                }
                            } 
                        }));
                        await appVersionService.createVersion(data);
                        setAdminMessage('App 新版本发布成功！');
                        form.reset();
                    } catch (err) {
                        setAdminMessage(err.response?.data?.detail || 'App 发布失败');
                    }
                }}>
                    <div className="my-account-field">
                        <label>版本号 (数字, 如 2)</label>
                        <input name="version_code" type="number" placeholder="必须比上一个版本大" required />
                    </div>
                    <div className="my-account-field">
                        <label>版本名 (如 1.0.1)</label>
                        <input name="version_name" placeholder="如 1.0.1" required />
                    </div>
                    <div className="my-account-field">
                        <label>下载链接 (下载地址)</label>
                        <input name="download_url" placeholder="/api/uploads/qiyueban.apk" required defaultValue="/api/uploads/qiyueban.apk" />
                    </div>
                    <div className="my-account-field">
                        <label>更新日志</label>
                        <textarea className="my-admin-textarea" name="update_log" placeholder="填写新版本更新内容" required></textarea>
                    </div>
                    <div className="my-account-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" name="force_update" id="force_update" style={{ width: 'auto', marginBottom: 0 }} />
                        <label htmlFor="force_update" style={{ marginBottom: 0 }}>是否强制用户更新？</label>
                    </div>
                    <button className="read-all-btn my-account-submit" type="submit" style={{ marginTop: '15px' }}>发布新版本</button>
                </form>
            </section>
        </div>
    );
}

export default AdminPage;
