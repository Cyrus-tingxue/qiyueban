import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AvatarIcon from '../components/AvatarIcon';
import EmojiPicker from '../components/EmojiPicker';
import RichContent from '../components/RichContent';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { messageService } from '../services/messageService';
import { postService } from '../services/postService';
import { isGroupMuted, setGroupMuted } from '../utils/groupMute';
import './ChatPage.css';

const PRIVATE_POLL_INTERVAL_MS = 1500;
const GROUP_POLL_INTERVAL_MS = 800;

const ChatPage = () => {
    const { userId: privateUserIdParam, groupId: groupIdParam } = useParams();
    const isGroupChat = Boolean(groupIdParam);
    const privateUserId = privateUserIdParam ? parseInt(privateUserIdParam, 10) : null;
    const groupId = groupIdParam ? parseInt(groupIdParam, 10) : null;

    const { user } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const composerRef = useRef(null);
    const imageInputRef = useRef(null);
    const previousMessageSignatureRef = useRef('');

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [otherUser, setOtherUser] = useState(null);
    const [groupDetail, setGroupDetail] = useState(null);
    const [inviteQuery, setInviteQuery] = useState('');
    const [inviteResults, setInviteResults] = useState([]);
    const [inviteUserId, setInviteUserId] = useState('');
    const [groupPanelOpen, setGroupPanelOpen] = useState(false);
    const [memberPanelOpen, setMemberPanelOpen] = useState(false);
    const [groupMuted, setGroupMutedState] = useState(() => (groupId ? isGroupMuted(groupId) : false));

    const buildMessageSignature = (items) =>
        items.map((item) => `${item.id}:${item.created_at}:${item.content}`).join('|');

    const replaceMessagesIfChanged = (nextMessages) => {
        const nextSignature = buildMessageSignature(nextMessages);
        if (nextSignature === previousMessageSignatureRef.current) {
            return false;
        }
        previousMessageSignatureRef.current = nextSignature;
        setMessages(nextMessages);
        return true;
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!isGroupChat && (!privateUserId || privateUserId === user.uid)) {
            navigate('/messages');
            return;
        }

        if (isGroupChat && !groupId) {
            navigate('/messages');
            return;
        }

        let mounted = true;
        let pollTimeoutId = null;

        const load = async ({ initial = false, refreshMeta = false } = {}) => {
            if (!mounted) return;
            if (initial) setLoading(true);

            try {
                if (isGroupChat) {
                    const requests = [messageService.getGroupMessages(groupId)];
                    if (initial || refreshMeta) {
                        requests.push(messageService.getGroupDetail(groupId));
                    }
                    const [groupMessages, detail] = await Promise.all(requests);
                    if (!mounted) return;
                    if (detail) {
                        setGroupDetail(detail);
                    }
                    const didChange = replaceMessagesIfChanged(groupMessages);
                    if (initial || didChange) {
                        window.dispatchEvent(new CustomEvent('messageUnreadStateChanged', { detail: { type: 'group-read' } }));
                    }
                } else {
                    const friendList = await messageService.getFriends();
                    if (!mounted) return;

                    const matchedFriend = friendList.find((item) => item.friend.uid === privateUserId);
                    if (!matchedFriend) {
                        alert('请先加好友再私信');
                        navigate('/messages');
                        return;
                    }

                    const privateMessages = await messageService.getMessages(privateUserId);
                    if (!mounted) return;

                    replaceMessagesIfChanged(privateMessages);
                    setOtherUser(
                        privateMessages.length > 0
                            ? (privateMessages[0].sender_id === privateUserId ? privateMessages[0].sender : privateMessages[0].receiver)
                            : matchedFriend.friend
                    );
                    await messageService.markAsRead(privateUserId);
                }
            } catch (err) {
                console.error('Failed to load chat:', err);
                alert(err.response?.data?.detail || t('loadConvFailed'));
                navigate('/messages');
            } finally {
                if (mounted && initial) setLoading(false);
            }
        };

        const scheduleNextPoll = () => {
            if (!mounted) return;
            pollTimeoutId = window.setTimeout(async () => {
                await load({ initial: false, refreshMeta: false });
                scheduleNextPoll();
            }, isGroupChat ? GROUP_POLL_INTERVAL_MS : PRIVATE_POLL_INTERVAL_MS);
        };

        const handleMessageDataChanged = async () => {
            await load({ initial: false, refreshMeta: isGroupChat });
        };

        const handleAppFocus = async () => {
            if (document.visibilityState === 'visible') {
                await load({ initial: false, refreshMeta: true });
            }
        };

        load({ initial: true, refreshMeta: true }).finally(scheduleNextPoll);
        window.addEventListener('messageDataChanged', handleMessageDataChanged);
        window.addEventListener('focus', handleAppFocus);
        document.addEventListener('visibilitychange', handleAppFocus);

        return () => {
            mounted = false;
            if (pollTimeoutId) {
                window.clearTimeout(pollTimeoutId);
            }
            window.removeEventListener('messageDataChanged', handleMessageDataChanged);
            window.removeEventListener('focus', handleAppFocus);
            document.removeEventListener('visibilitychange', handleAppFocus);
        };
    }, [user, privateUserId, groupId, isGroupChat, navigate, t]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        if (!isGroupChat || !groupId) {
            setGroupMutedState(false);
            return undefined;
        }

        const syncMutedState = () => {
            setGroupMutedState(isGroupMuted(groupId));
        };

        syncMutedState();
        window.addEventListener('groupMuteChanged', syncMutedState);
        return () => {
            window.removeEventListener('groupMuteChanged', syncMutedState);
        };
    }, [groupId, isGroupChat]);

    useEffect(() => {
        if (!isGroupChat || !groupPanelOpen || !inviteQuery.trim()) {
            setInviteResults([]);
            return undefined;
        }

        const timer = setTimeout(async () => {
            try {
                const results = await authService.searchUsers(inviteQuery.trim());
                const memberIds = new Set((groupDetail?.members || []).map((item) => item.uid));
                setInviteResults(results.filter((item) => item.uid !== user?.uid && !memberIds.has(item.uid)));
            } catch (error) {
                console.error('Failed to search inviteable users:', error);
                setInviteResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [groupDetail?.members, groupPanelOpen, inviteQuery, isGroupChat, user?.uid]);

    const insertToken = (token) => {
        const textarea = composerRef.current;
        if (!textarea) {
            setNewMessage((prev) => `${prev}${token}`);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const nextValue = `${newMessage.slice(0, start)}${token}${newMessage.slice(end)}`;
        setNewMessage(nextValue);

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + token.length;
        });
    };

    const handleUploadImage = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const data = await postService.uploadImage(file);
            insertToken(`\n[img:${data.url}]\n`);
        } catch (err) {
            alert(err.response?.data?.detail || t('uploadFailed'));
        } finally {
            setUploadingImage(false);
            event.target.value = '';
        }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || sending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setSending(true);
        try {
            const sent = isGroupChat
                ? await messageService.sendGroupMessage(groupId, content)
                : await messageService.sendMessage(privateUserId, content);

            setMessages((prev) => {
                const next = [...prev, sent];
                previousMessageSignatureRef.current = buildMessageSignature(next);
                return next;
            });
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
            setNewMessage(content);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearHistory = async () => {
        if (isGroupChat) return;
        if (!window.confirm(t('clearConfirm'))) return;
        try {
            await messageService.deleteConversation(privateUserId);
            navigate('/messages');
        } catch (err) {
            alert(err.response?.data?.detail || t('clearFailed'));
        }
    };

    const handleJoinGroup = async () => {
        try {
            const detail = await messageService.joinGroup(groupId);
            setGroupDetail(detail);
            const groupMessages = await messageService.getGroupMessages(groupId);
            replaceMessagesIfChanged(groupMessages);
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleInviteUser = async () => {
        if (!inviteUserId) return;
        try {
            await messageService.addGroupMember(groupId, parseInt(inviteUserId, 10));
            setInviteQuery('');
            setInviteResults([]);
            setInviteUserId('');
            alert('邀请已发送，等待对方同意');
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm('确定要退出这个群聊吗？')) return;
        try {
            await messageService.leaveGroup(groupId);
            navigate('/messages');
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
        }
    };

    const handleToggleGroupMute = () => {
        if (!groupId) return;
        const nextMuted = !groupMuted;
        setGroupMuted(groupId, nextMuted);
        setGroupMutedState(nextMuted);
    };

    const handleToggleMemberPanel = () => {
        if (!isGroupChat) return;
        setMemberPanelOpen((prev) => !prev);
    };

    const formatMessageTime = (dateString) =>
        new Date(dateString).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

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

    if (loading) {
        return <div className="loading-state">聊天记录加载中...</div>;
    }

    if (isGroupChat && groupDetail && !groupDetail.is_member) {
        return (
            <div className="chat-page">
                <div className="chat-join-card">
                    <h2>{groupDetail.name}</h2>
                    <p>{groupDetail.member_count} 位成员</p>
                    <button className="send-btn" onClick={handleJoinGroup}>加入群聊</button>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-page">
            <div className="qq-chat-shell">
                <header className="qq-chat-header">
                    <div className="chat-header-side">
                        {isGroupChat ? (
                            <button
                                type="button"
                                className={`header-icon-btn ${groupPanelOpen ? 'active' : ''}`}
                                onClick={() => setGroupPanelOpen((prev) => !prev)}
                                title="群聊管理"
                            >
                                ⋯
                            </button>
                        ) : (
                            <button type="button" className="header-btn" onClick={handleClearHistory}>清空</button>
                        )}
                    </div>

                    <div className="qq-chat-target">
                        {isGroupChat ? (
                            <button
                                type="button"
                                className={`group-members-trigger ${memberPanelOpen ? 'active' : ''}`}
                                onClick={handleToggleMemberPanel}
                                title="查看群成员"
                            >
                                <div className="target-avatar">
                                    <AvatarIcon type="eye" size={40} />
                                </div>
                                <div className="target-copy">
                                    <div className="target-name">{groupDetail?.name}</div>
                                    <div className="target-meta">{groupDetail?.member_count} 位成员</div>
                                </div>
                            </button>
                        ) : otherUser ? (
                            <>
                                <div className="target-avatar">
                                    <AvatarIcon type={otherUser.avatar || 'eye'} size={40} />
                                    <span className={`online-dot ${otherUser.is_online ? 'online' : ''}`} />
                                </div>
                                <div className="target-copy">
                                    <div className="target-name">{otherUser.nickname || otherUser.username}</div>
                                    <div className="target-meta">
                                        {otherUser.is_online ? '在线' : formatLastSeen(otherUser.last_seen_at)}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="target-copy">
                                <div className="target-name">私聊</div>
                            </div>
                        )}
                    </div>

                    <div className="chat-header-side chat-header-side-right">
                        <button type="button" className="header-btn" onClick={() => navigate('/messages')}>返回</button>
                    </div>
                </header>

                {isGroupChat && memberPanelOpen && (
                    <div className="group-members-overlay" onClick={() => setMemberPanelOpen(false)}>
                        <div className="group-members-panel" onClick={(e) => e.stopPropagation()}>
                            <div className="group-members-header">
                                <div>
                                    <div className="group-members-title">{groupDetail?.name}</div>
                                    <div className="group-members-subtitle">{groupDetail?.member_count} 位成员</div>
                                </div>
                                <button type="button" className="header-icon-btn" onClick={() => setMemberPanelOpen(false)} title="关闭">
                                    ×
                                </button>
                            </div>
                            <div className="group-members-list">
                                {(groupDetail?.members || []).map((member) => (
                                    <div key={member.uid} className="group-member-item">
                                        <div className="target-avatar">
                                            <AvatarIcon type={member.avatar || 'eye'} size={36} />
                                            <span className={`online-dot ${member.is_online ? 'online' : ''}`} />
                                        </div>
                                        <div className="group-member-copy">
                                            <div className="group-member-name">
                                                {member.nickname || member.username}
                                                {member.uid === user?.uid ? '（你）' : ''}
                                                {groupDetail?.creator?.uid === member.uid ? <span className="group-member-role">群主</span> : null}
                                            </div>
                                            <div className="group-member-meta">@{member.username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {isGroupChat && groupPanelOpen && (
                    <div className="qq-group-panel">
                        <div className="qq-group-panel-actions qq-group-panel-actions-top">
                            <button type="button" className={`header-btn ${groupMuted ? 'active-toggle-btn' : ''}`} onClick={handleToggleGroupMute}>
                                {groupMuted ? '已开启免打扰' : '消息免打扰'}
                            </button>
                        </div>
                        <div className="qq-group-panel-row">
                            <input
                                type="text"
                                value={inviteQuery}
                                onChange={(e) => {
                                    setInviteQuery(e.target.value);
                                    setInviteUserId('');
                                }}
                                placeholder="搜索任意用户邀请入群"
                            />
                            <button type="button" className="header-btn" onClick={handleInviteUser} disabled={!inviteUserId}>
                                发送邀请
                            </button>
                        </div>
                        {inviteQuery.trim() && (
                            <div className="group-invite-search-results">
                                {inviteResults.length === 0 ? (
                                    <div className="group-invite-search-empty">没有可邀请的用户</div>
                                ) : (
                                    inviteResults.map((candidate) => (
                                        <button
                                            key={candidate.uid}
                                            type="button"
                                            className={`group-invite-search-item ${inviteUserId === String(candidate.uid) ? 'active' : ''}`}
                                            onClick={() => setInviteUserId(String(candidate.uid))}
                                        >
                                            <AvatarIcon type={candidate.avatar || 'eye'} size={28} />
                                            <span>{candidate.nickname || candidate.username}</span>
                                            <span className="group-invite-search-username">@{candidate.username}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        <div className="qq-group-panel-actions">
                            <button type="button" className="header-btn danger-btn" onClick={handleLeaveGroup}>退出群聊</button>
                        </div>
                    </div>
                )}

                <main className="qq-chat-body">
                    {messages.length === 0 ? (
                        <div className="empty-chat">还没有聊天记录，发条消息开始吧。</div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.sender_id === user?.uid;
                            const showDateLabel =
                                index === 0 ||
                                new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

                            return (
                                <React.Fragment key={`${isGroupChat ? 'g' : 'p'}-${msg.id}`}>
                                    {showDateLabel && (
                                        <div className="date-divider">
                                            <span>
                                                {new Date(msg.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`qq-message-row ${isMe ? 'self' : 'other'}`}>
                                        {!isMe && (
                                            <div className="message-avatar">
                                                <AvatarIcon type={msg.sender?.avatar || 'eye'} size={36} />
                                            </div>
                                        )}

                                        <div className="message-stack">
                                            {isGroupChat && !isMe && (
                                                <div className="message-sender">{msg.sender?.nickname || msg.sender?.username}</div>
                                            )}
                                            <div className="message-bubble">
                                                <RichContent text={msg.content} />
                                            </div>
                                            <div className="message-time">{formatMessageTime(msg.created_at)}</div>
                                        </div>

                                        {isMe && (
                                            <div className="message-avatar">
                                                <AvatarIcon type={user.avatar || 'eye'} size={36} />
                                            </div>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <form className="qq-chat-composer" onSubmit={handleSend}>
                    <textarea
                        ref={composerRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入消息，按 Enter 发送，Shift+Enter 换行"
                        rows={4}
                        disabled={sending || uploadingImage}
                    />
                    <div className="composer-toolbar">
                        <div className="composer-tools">
                            <EmojiPicker onSelect={insertToken} />
                            <button
                                type="button"
                                className="emoji-picker-trigger composer-image-btn"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={uploadingImage || sending}
                                title="发送图片"
                            >
                                图片
                            </button>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                onChange={handleUploadImage}
                                hidden
                            />
                        </div>
                        <div className="composer-actions">
                            <span>{uploadingImage ? '图片上传中...' : sending ? '发送中...' : 'Enter 发送，Shift + Enter 换行'}</span>
                            <button type="submit" className="send-btn" disabled={!newMessage.trim() || sending || uploadingImage}>
                                发送
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatPage;
