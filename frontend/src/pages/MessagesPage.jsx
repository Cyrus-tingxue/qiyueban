import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AvatarIcon from '../components/AvatarIcon';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { messageService } from '../services/messageService';
import { getMutedGroupIds } from '../utils/groupMute';
import './MessagesPage.css';

const DASHBOARD_REFRESH_MS = 10000;

const MessagesPage = () => {
    const { user } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('friends');
    const [conversations, setConversations] = useState([]);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [groupInvites, setGroupInvites] = useState([]);
    const [groups, setGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [panelMode, setPanelMode] = useState('');
    const [friendMenuOpenId, setFriendMenuOpenId] = useState(null);
    const [mutedGroupIds, setMutedGroupIds] = useState(() => getMutedGroupIds());

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchAll();
    }, [user, navigate]);

    useEffect(() => {
        if (!user) return undefined;

        let disposed = false;

        const safeFetchAll = async () => {
            if (disposed || document.visibilityState !== 'visible') return;
            await fetchAll({ silent: true });
        };

        const handleMessageDataChanged = () => {
            safeFetchAll();
        };
        const handleGroupMuteChanged = () => {
            setMutedGroupIds(getMutedGroupIds());
        };
        const handleAppFocus = () => {
            if (document.visibilityState === 'visible') {
                safeFetchAll();
            }
        };

        const interval = window.setInterval(safeFetchAll, DASHBOARD_REFRESH_MS);
        window.addEventListener('messageDataChanged', handleMessageDataChanged);
        window.addEventListener('messageUnreadStateChanged', handleMessageDataChanged);
        window.addEventListener('groupMuteChanged', handleGroupMuteChanged);
        window.addEventListener('focus', handleAppFocus);
        document.addEventListener('visibilitychange', handleAppFocus);

        return () => {
            disposed = true;
            window.clearInterval(interval);
            window.removeEventListener('messageDataChanged', handleMessageDataChanged);
            window.removeEventListener('messageUnreadStateChanged', handleMessageDataChanged);
            window.removeEventListener('groupMuteChanged', handleGroupMuteChanged);
            window.removeEventListener('focus', handleAppFocus);
            document.removeEventListener('visibilitychange', handleAppFocus);
        };
    }, [user]);

    useEffect(() => {
        if (!searchQuery.trim() || panelMode !== 'add-friend') {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await authService.searchUsers(searchQuery.trim());
                setSearchResults(results.filter((item) => item.uid !== user?.uid));
            } catch (err) {
                console.error('Failed to search users:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, panelMode, user?.uid]);

    const fetchAll = async ({ silent = false } = {}) => {
        try {
            if (!silent) {
                setLoading(true);
                setError('');
            }
            const [conversationData, friendData, requestData, groupInviteData, groupData] = await Promise.all([
                messageService.getConversations(),
                messageService.getFriends(),
                messageService.getFriendRequests(),
                messageService.getGroupInvites(),
                messageService.getGroups(),
            ]);
            setConversations(conversationData);
            setFriends(friendData);
            setFriendRequests(requestData);
            setGroupInvites(groupInviteData);
            setGroups(groupData);
        } catch (err) {
            console.error('Failed to load message dashboard:', err);
            if (!silent) {
                setError(t('loadConvFailed'));
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const friendStatusMap = useMemo(() => {
        const map = new Map();
        friends.forEach((item) => map.set(item.friend.uid, 'friend'));
        friendRequests.forEach((item) => {
            const other = item.direction === 'incoming' ? item.requester : item.addressee;
            map.set(other.uid, item.direction === 'incoming' ? 'incoming' : 'outgoing');
        });
        return map;
    }, [friends, friendRequests]);

    const unreadConversationMap = useMemo(() => {
        const map = new Map();
        conversations.forEach((item) => {
            map.set(item.with_user.uid, item.unread_count || 0);
        });
        return map;
    }, [conversations]);

    const unreadGroupMap = useMemo(() => {
        const mutedIds = new Set(mutedGroupIds);
        const map = new Map();
        groups.forEach((item) => {
            map.set(item.id, mutedIds.has(item.id) ? 0 : (item.unread_count || 0));
        });
        return map;
    }, [groups, mutedGroupIds]);

    const incomingFriendRequests = useMemo(
        () => friendRequests.filter((item) => item.direction === 'incoming'),
        [friendRequests]
    );

    const joinedGroups = useMemo(
        () => groups.filter((group) => group.is_member),
        [groups]
    );

    const handlePrivateChat = (otherUserId) => {
        navigate(`/chat/private/${otherUserId}`);
    };

    const handleGroupChat = (groupId) => {
        navigate(`/chat/group/${groupId}`);
    };

    const handleSendFriendRequest = async (targetUserId) => {
        try {
            await messageService.sendFriendRequest(targetUserId);
            await fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleAcceptFriendRequest = async (requestId) => {
        try {
            await messageService.acceptFriendRequest(requestId);
            await fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleRejectFriendRequest = async (requestId) => {
        try {
            await messageService.rejectFriendRequest(requestId);
            await fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleRemoveFriend = async (friendUserId, friendName) => {
        if (!window.confirm(`确定要删除好友“${friendName}”吗？`)) return;
        try {
            await messageService.removeFriend(friendUserId);
            setFriendMenuOpenId(null);
            await fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleToggleFriendSelection = (friendId) => {
        setSelectedFriendIds((prev) =>
            prev.includes(friendId) ? prev.filter((item) => item !== friendId) : [...prev, friendId]
        );
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        try {
            const group = await messageService.createGroup(groupName.trim(), selectedFriendIds, true);
            setGroupName('');
            setSelectedFriendIds([]);
            setPanelMode('');
            await fetchAll();
            navigate(`/chat/group/${group.id}`);
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const formatLastSeen = (dateString) => {
        if (!dateString) return '最近离线';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '最近离线';

        const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
        if (diffMinutes < 1) return '刚刚在线';
        if (diffMinutes < 60) return `${diffMinutes} 分钟前在线`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} 小时前在线`;
        return `${Math.floor(diffMinutes / 1440)} 天前在线`;
    };

    const openPanel = (mode) => {
        setMenuOpen(false);
        setPanelMode(mode);
        setSearchQuery('');
        setSearchResults([]);
    };

    const closePanel = () => {
        setPanelMode('');
        setSearchQuery('');
        setSearchResults([]);
        setGroupName('');
        setSelectedFriendIds([]);
    };

    if (loading) {
        return <div className="loading-state">消息加载中...</div>;
    }

    return (
        <div className="messages-page">
            <div className="chat-home-shell">
                <div className="chat-home-topbar">
                    <div className="topbar-search">
                        <input
                            type="text"
                            placeholder={activeTab === 'friends' ? '搜索好友' : '搜索群聊'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="topbar-search-input"
                        />
                    </div>

                    <div className="topbar-actions">
                        <button type="button" className="icon-btn refresh-btn" onClick={() => fetchAll()} title="刷新">
                            ↻
                        </button>
                        <button
                            type="button"
                            className={`icon-btn ${menuOpen ? 'active' : ''}`}
                            onClick={() => setMenuOpen((prev) => !prev)}
                            title="更多"
                        >
                            +
                        </button>

                        {menuOpen && (
                            <div className="action-menu">
                                <button type="button" className="menu-item" onClick={() => openPanel('add-friend')}>
                                    添加好友
                                </button>
                                <button type="button" className="menu-item" onClick={() => openPanel('create-group')}>
                                    创建群聊
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chat-home-tabs">
                    <button
                        type="button"
                        className={`home-tab ${activeTab === 'friends' ? 'active' : ''}`}
                        onClick={() => setActiveTab('friends')}
                    >
                        好友
                    </button>
                    <button
                        type="button"
                        className={`home-tab ${activeTab === 'groups' ? 'active' : ''}`}
                        onClick={() => setActiveTab('groups')}
                    >
                        群聊
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="chat-list">
                    {activeTab === 'friends' ? (
                        <>
                            {incomingFriendRequests.map((item) => (
                                <div key={item.id} className="chat-list-item friend-request-item">
                                    <div className="chat-list-avatar">
                                        <AvatarIcon type={item.requester.avatar || 'eye'} size={44} />
                                        <span className={`online-dot ${item.requester.is_online ? 'online' : ''}`} />
                                    </div>
                                    <div className="chat-list-copy friend-request-copy">
                                        <div className="friend-request-head">
                                            <div className="chat-list-name">{item.requester.nickname || item.requester.username}</div>
                                            <span className="friend-request-badge">好友申请</span>
                                        </div>
                                        <div className="chat-list-subtitle">等待你处理的好友申请</div>
                                    </div>
                                    <div className="chat-list-actions friend-request-actions">
                                        <button type="button" className="mini-btn friend-request-btn" onClick={() => handleAcceptFriendRequest(item.id)}>
                                            同意
                                        </button>
                                        <button type="button" className="mini-btn ghost-mini-btn friend-request-btn" onClick={() => handleRejectFriendRequest(item.id)}>
                                            拒绝
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {friends.length === 0 ? (
                                <div className="empty-state">{incomingFriendRequests.length > 0 ? '还没有已添加的好友' : '还没有好友'}</div>
                            ) : (
                                friends.map((item) => (
                                    <div
                                        key={item.friendship_id}
                                        className={`chat-list-item friend-row ${unreadConversationMap.get(item.friend.uid) > 0 ? 'chat-list-item-unread' : ''}`}
                                    >
                                        <div className="chat-list-avatar">
                                            <AvatarIcon type={item.friend.avatar || 'eye'} size={44} />
                                            <span className={`online-dot ${item.friend.is_online ? 'online' : ''}`} />
                                        </div>
                                        <button type="button" className="friend-main" onClick={() => handlePrivateChat(item.friend.uid)}>
                                            <div className="chat-list-copy">
                                                <div className="friend-name-row">
                                                    <div className="chat-list-name">{item.friend.nickname || item.friend.username}</div>
                                                    {unreadConversationMap.get(item.friend.uid) > 0 && (
                                                        <span className="private-unread-dot" title={`未读消息 ${unreadConversationMap.get(item.friend.uid)} 条`} />
                                                    )}
                                                </div>
                                                <div className="chat-list-subtitle">
                                                    {item.friend.is_online ? '在线' : formatLastSeen(item.friend.last_seen_at)}
                                                </div>
                                            </div>
                                        </button>
                                        <div className="friend-action-menu">
                                            <button
                                                type="button"
                                                className={`icon-btn friend-more-btn ${friendMenuOpenId === item.friend.uid ? 'active' : ''}`}
                                                onClick={() => setFriendMenuOpenId((prev) => (prev === item.friend.uid ? null : item.friend.uid))}
                                                title="好友操作"
                                            >
                                                ⋯
                                            </button>
                                            {friendMenuOpenId === item.friend.uid && (
                                                <div className="friend-popover">
                                                    <button
                                                        type="button"
                                                        className="menu-item friend-popover-item"
                                                        onClick={() => handleRemoveFriend(item.friend.uid, item.friend.nickname || item.friend.username)}
                                                    >
                                                        删除好友
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            {joinedGroups.length === 0 ? (
                                <div className="empty-state">{groupInvites.length > 0 ? '暂无已加入的群聊' : '还没有加入群聊'}</div>
                            ) : (
                                joinedGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        type="button"
                                        className={`chat-list-item ${unreadGroupMap.get(group.id) > 0 ? 'chat-list-item-unread' : ''}`}
                                        onClick={() => handleGroupChat(group.id)}
                                    >
                                        <div className="chat-list-avatar group-avatar">
                                            <AvatarIcon type="eye" size={44} />
                                        </div>
                                        <div className="chat-list-copy">
                                            <div className="friend-name-row">
                                                <div className="chat-list-name">{group.name}</div>
                                                {unreadGroupMap.get(group.id) > 0 && (
                                                    <span className="private-unread-dot" title={`未读群消息 ${unreadGroupMap.get(group.id)} 条`} />
                                                )}
                                            </div>
                                            <div className="chat-list-subtitle">{group.member_count} 位成员</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </>
                    )}
                </div>
            </div>

            {panelMode && (
                <div className="overlay" onClick={closePanel}>
                    <div className="dropdown-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown-panel-head">
                            <h2>{panelMode === 'add-friend' ? '添加好友' : '创建群聊'}</h2>
                            <button type="button" className="icon-btn" onClick={closePanel}>
                                X
                            </button>
                        </div>

                        {panelMode === 'add-friend' ? (
                            <div className="panel-body">
                                <div className="search-container">
                                    <input
                                        type="text"
                                        placeholder="搜索用户名或昵称"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="search-input"
                                    />
                                </div>

                                <div className="panel-list">
                                    {searchQuery && isSearching && <div className="search-item static-row">正在搜索...</div>}
                                    {searchQuery && !isSearching && searchResults.length === 0 && (
                                        <div className="search-item static-row">没有找到相关用户</div>
                                    )}
                                    {!isSearching &&
                                        searchResults.map((item) => {
                                            const status = friendStatusMap.get(item.uid);
                                            return (
                                                <div key={item.uid} className="search-item">
                                                    <div className="item-main">
                                                        <AvatarIcon type={item.avatar || 'eye'} size={32} />
                                                        <div className="item-copy">
                                                            <div className="item-title">{item.nickname || item.username}</div>
                                                            <div className="item-subtitle">@{item.username}</div>
                                                        </div>
                                                    </div>
                                                    {status === 'friend' ? (
                                                        <button className="mini-btn" onClick={() => handlePrivateChat(item.uid)}>聊天</button>
                                                    ) : status === 'incoming' ? (
                                                        <span className="status-pill">待处理</span>
                                                    ) : status === 'outgoing' ? (
                                                        <button className="mini-btn" onClick={() => handleSendFriendRequest(item.uid)}>再次申请</button>
                                                    ) : (
                                                        <button className="mini-btn" onClick={() => handleSendFriendRequest(item.uid)}>添加</button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ) : (
                            <form className="panel-body group-form" onSubmit={handleCreateGroup}>
                                <input
                                    className="search-input"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="输入群聊名称"
                                />

                                <div className="friend-picker">
                                    {friends.length === 0 ? (
                                        <div className="empty-state small">先添加好友后再建群</div>
                                    ) : (
                                        friends.map((item) => (
                                            <label key={item.friendship_id} className="checkbox-row">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFriendIds.includes(item.friend.uid)}
                                                    onChange={() => handleToggleFriendSelection(item.friend.uid)}
                                                />
                                                <AvatarIcon type={item.friend.avatar || 'eye'} size={22} />
                                                <span>{item.friend.nickname || item.friend.username}</span>
                                            </label>
                                        ))
                                    )}
                                </div>

                                <button type="submit" className="mini-btn wide">创建群聊</button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesPage;
