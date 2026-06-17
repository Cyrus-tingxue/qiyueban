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

const PRIVATE_POLL_INTERVAL_MS = 5000;
const GROUP_POLL_INTERVAL_MS = 5000;
const PRIVATE_INITIAL_BATCH = 30;
const GROUP_INITIAL_BATCH = 40;
const PRIVATE_HISTORY_BATCH = 30;
const GROUP_HISTORY_BATCH = 40;
const PRIVATE_SYNC_BATCH = 40;
const GROUP_SYNC_BATCH = 60;
const AUTO_SCROLL_THRESHOLD_PX = 120;
const HISTORY_LOAD_THRESHOLD_PX = 80;

const ChatPage = () => {
    const { userId: privateUserIdParam, groupId: groupIdParam } = useParams();
    const isGroupChat = Boolean(groupIdParam);
    const privateUserId = privateUserIdParam ? parseInt(privateUserIdParam, 10) : null;
    const groupId = groupIdParam ? parseInt(groupIdParam, 10) : null;

    const { user } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();
    const messageListRef = useRef(null);
    const messagesEndRef = useRef(null);
    const composerRef = useRef(null);
    const imageInputRef = useRef(null);
    const previousMessageSignatureRef = useRef('');
    const shouldAutoScrollRef = useRef(true);
    const otherUserRef = useRef(null);
    const messagesRef = useRef([]);
    const loadingHistoryRef = useRef(false);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [otherUser, setOtherUser] = useState(null);
    const [groupDetail, setGroupDetail] = useState(null);
    const [inviteQuery, setInviteQuery] = useState('');
    const [inviteResults, setInviteResults] = useState([]);
    const [inviteUserId, setInviteUserId] = useState('');
    const [groupPanelOpen, setGroupPanelOpen] = useState(false);
    const [memberPanelOpen, setMemberPanelOpen] = useState(false);
    const [groupMuted, setGroupMutedState] = useState(() => (groupId ? isGroupMuted(groupId) : false));

    const initialBatchSize = isGroupChat ? GROUP_INITIAL_BATCH : PRIVATE_INITIAL_BATCH;
    const historyBatchSize = isGroupChat ? GROUP_HISTORY_BATCH : PRIVATE_HISTORY_BATCH;
    const syncBatchSize = isGroupChat ? GROUP_SYNC_BATCH : PRIVATE_SYNC_BATCH;

    useEffect(() => {
        otherUserRef.current = otherUser;
    }, [otherUser]);

    const buildMessageSignature = (items) =>
        items.map((item) => `${item.id}:${item.created_at}:${item.content}`).join('|');

    const commitMessages = (nextMessages) => {
        previousMessageSignatureRef.current = buildMessageSignature(nextMessages);
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
    };

    const replaceMessagesIfChanged = (nextMessages) => {
        const nextSignature = buildMessageSignature(nextMessages);
        if (nextSignature === previousMessageSignatureRef.current) {
            return false;
        }

        commitMessages(nextMessages);
        return true;
    };

    const mergeRecentMessagesIfChanged = (incomingMessages) => {
        const mergedMap = new Map(messagesRef.current.map((item) => [item.id, item]));
        incomingMessages.forEach((item) => {
            mergedMap.set(item.id, item);
        });

        const mergedMessages = Array.from(mergedMap.values()).sort((a, b) => a.id - b.id);
        return replaceMessagesIfChanged(mergedMessages);
    };

    const isNearBottom = () => {
        const container = messageListRef.current;
        if (!container) {
            return true;
        }

        const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceToBottom <= AUTO_SCROLL_THRESHOLD_PX;
    };

    const loadRecentMessages = async ({ initial = false, refreshMeta = false } = {}) => {
        shouldAutoScrollRef.current = initial || isNearBottom();

        if (isGroupChat) {
            const requests = [messageService.getGroupMessages(groupId, 0, initial ? initialBatchSize : syncBatchSize)];
            if (initial || refreshMeta) {
                requests.push(messageService.getGroupDetail(groupId));
            }

            const [groupMessages, detail] = await Promise.all(requests);
            if (detail) {
                setGroupDetail(detail);
            }

            if (initial) {
                replaceMessagesIfChanged(groupMessages);
                setHasMoreHistory(groupMessages.length >= initialBatchSize);
                window.dispatchEvent(new CustomEvent('messageUnreadStateChanged', { detail: { type: 'group-read' } }));
                return;
            }

            const didChange = mergeRecentMessagesIfChanged(groupMessages);
            if (didChange) {
                window.dispatchEvent(new CustomEvent('messageUnreadStateChanged', { detail: { type: 'group-read' } }));
            }
            return;
        }

        const requests = [messageService.getMessages(privateUserId, 0, initial ? initialBatchSize : syncBatchSize)];
        if (initial || refreshMeta || !otherUserRef.current) {
            requests.push(messageService.getFriends());
        }

        const [privateMessages, friendList] = await Promise.all(requests);
        const matchedFriend = friendList?.find((item) => item.friend.uid === privateUserId);
        if ((initial || refreshMeta || !otherUserRef.current) && !matchedFriend) {
            alert('请先加好友再私信');
            navigate('/messages');
            return;
        }

        if (initial) {
            replaceMessagesIfChanged(privateMessages);
            setHasMoreHistory(privateMessages.length >= initialBatchSize);
        } else {
            mergeRecentMessagesIfChanged(privateMessages);
        }

        if (matchedFriend || privateMessages.length > 0) {
            const latestMessage = privateMessages[privateMessages.length - 1];
            setOtherUser(
                latestMessage
                    ? (latestMessage.sender_id === privateUserId ? latestMessage.sender : latestMessage.receiver)
                    : matchedFriend.friend
            );
        }
    };

    const loadOlderMessages = async () => {
        if (loadingHistoryRef.current || !hasMoreHistory) {
            return;
        }

        const container = messageListRef.current;
        const previousHeight = container?.scrollHeight || 0;
        const previousTop = container?.scrollTop || 0;
        const currentCount = messagesRef.current.length;

        loadingHistoryRef.current = true;
        setLoadingMoreHistory(true);

        try {
            const olderMessages = isGroupChat
                ? await messageService.getGroupMessages(groupId, currentCount, historyBatchSize)
                : await messageService.getMessages(privateUserId, currentCount, historyBatchSize);

            if (olderMessages.length === 0) {
                setHasMoreHistory(false);
                return;
            }

            const nextMessages = [...olderMessages, ...messagesRef.current];
            replaceMessagesIfChanged(nextMessages);
            setHasMoreHistory(olderMessages.length >= historyBatchSize);

            requestAnimationFrame(() => {
                const nextHeight = container?.scrollHeight || 0;
                if (container) {
                    container.scrollTop = previousTop + (nextHeight - previousHeight);
                }
            });
        } catch (err) {
            console.error('Failed to load older messages:', err);
        } finally {
            loadingHistoryRef.current = false;
            setLoadingMoreHistory(false);
        }
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

        const runLoad = async ({ initial = false, refreshMeta = false } = {}) => {
            if (!mounted) return;
            if (initial) {
                setLoading(true);
                setHasMoreHistory(true);
                loadingHistoryRef.current = false;
                setLoadingMoreHistory(false);
                commitMessages([]);
            }

            try {
                await loadRecentMessages({ initial, refreshMeta });
            } catch (err) {
                console.error('Failed to load chat:', err);
                if (initial) {
                    alert(err.response?.data?.detail || t('loadConvFailed'));
                    navigate('/messages');
                }
            } finally {
                if (mounted && initial) {
                    setLoading(false);
                }
            }
        };

        const scheduleNextPoll = () => {
            if (!mounted) return;
            pollTimeoutId = window.setTimeout(async () => {
                if (document.visibilityState !== 'visible') {
                    scheduleNextPoll();
                    return;
                }

                await runLoad({ initial: false, refreshMeta: false });
                scheduleNextPoll();
            }, isGroupChat ? GROUP_POLL_INTERVAL_MS : PRIVATE_POLL_INTERVAL_MS);
        };

        const handleMessageDataChanged = async () => {
            await runLoad({ initial: false, refreshMeta: isGroupChat });
        };

        const handleAppFocus = async () => {
            if (document.visibilityState === 'visible') {
                await runLoad({ initial: false, refreshMeta: true });
            }
        };

        runLoad({ initial: true, refreshMeta: true }).finally(scheduleNextPoll);
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
    }, [groupId, historyBatchSize, initialBatchSize, isGroupChat, navigate, privateUserId, syncBatchSize, t, user]);

    useEffect(() => {
        if (!shouldAutoScrollRef.current) {
            return;
        }

        messagesEndRef.current?.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'auto' });
    }, [messages]);

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

    const focusComposerAtEnd = () => {
        const textarea = composerRef.current;
        if (!textarea) {
            return;
        }

        requestAnimationFrame(() => {
            textarea.focus();
            const cursor = textarea.value.length;
            textarea.selectionStart = cursor;
            textarea.selectionEnd = cursor;
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
        shouldAutoScrollRef.current = true;

        try {
            const sent = isGroupChat
                ? await messageService.sendGroupMessage(groupId, content)
                : await messageService.sendMessage(privateUserId, content);

            const nextMessages = [...messagesRef.current, sent];
            replaceMessagesIfChanged(nextMessages);
        } catch (err) {
            alert(err.response?.data?.detail || t('operationFailed'));
            setNewMessage(content);
        } finally {
            setSending(false);
            focusComposerAtEnd();
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
            const groupMessages = await messageService.getGroupMessages(groupId, 0, initialBatchSize);
            replaceMessagesIfChanged(groupMessages);
            setHasMoreHistory(groupMessages.length >= initialBatchSize);
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

    const handleMessageListScroll = () => {
        shouldAutoScrollRef.current = isNearBottom();
        const container = messageListRef.current;
        if (!container || loadingHistoryRef.current || !hasMoreHistory) {
            return;
        }

        if (container.scrollTop <= HISTORY_LOAD_THRESHOLD_PX) {
            loadOlderMessages();
        }
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

    const renderedMessages = useMemo(
        () => messages.map((msg, index) => {
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
        }),
        [isGroupChat, messages, user?.avatar, user?.uid]
    );

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
                                ⊕
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

                <main className="qq-chat-body" ref={messageListRef} onScroll={handleMessageListScroll}>
                    {(loadingMoreHistory || hasMoreHistory) && (
                        <div className="history-loader">
                            {loadingMoreHistory ? '正在加载更早消息...' : '上滑可加载更早消息'}
                        </div>
                    )}
                    {messages.length === 0 ? (
                        <div className="empty-chat">还没有聊天记录，发条消息开始吧。</div>
                    ) : (
                        renderedMessages
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <form className="qq-chat-composer" onSubmit={handleSend}>
                    <textarea
                        ref={composerRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chatPlaceholder')}
                        rows={3}
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
                                title={t('imageBtn')}
                            >
                                {t('imageBtn')}
                            </button>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                onChange={handleUploadImage}
                                hidden
                            />
                            <button
                                type="submit"
                                className="send-btn"
                                disabled={!newMessage.trim() || sending || uploadingImage}
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {sending ? t('sending') : t('send')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatPage;
