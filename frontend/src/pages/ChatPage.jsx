import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { messageService } from '../services/messageService';
import AvatarIcon from '../components/AvatarIcon';
import './ChatPage.css';

const ChatPage = () => {
    const { userId: otherUserIdParam } = useParams();
    const otherUserId = parseInt(otherUserIdParam, 10);
    const { user } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [otherUser, setOtherUser] = useState(null);

    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (isNaN(otherUserId) || otherUserId === user?.uid) {
            navigate('/messages');
            return;
        }

        fetchMessages();

        const intervalId = setInterval(() => {
            fetchMessages(false);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [otherUserId, user, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async (showLoading = true) => {
        try {
            if (showLoading && messages.length === 0) setLoading(true);

            const data = await messageService.getMessages(otherUserId);
            setMessages(data);

            if (!otherUser && data.length > 0) {
                const firstMsg = data[0];
                setOtherUser(firstMsg.sender_id === otherUserId ? firstMsg.sender : firstMsg.receiver);
            }

            await messageService.markAsRead(otherUserId);

        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || sending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            const sentMsg = await messageService.sendMessage(otherUserId, content);
            setMessages(prev => [...prev, sentMsg]);
        } catch (err) {
            console.error('Failed to send message:', err);
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
        if (!window.confirm(t('clearConfirm'))) {
            return;
        }

        try {
            await messageService.deleteConversation(otherUserId);
            navigate('/messages');
        } catch (err) {
            console.error("清空聊天记录失败", err);
            alert(t('clearFailed'));
        }
    };

    const formatMessageTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && messages.length === 0) {
        return <div className="loading-state">{t('loadingChat')}</div>;
    }

    return (
        <div className="chat-page">
            <div className="chat-header">
                <button className="back-btn" onClick={() => navigate('/messages')}>
                    {t('backToMessages')}
                </button>
                <div className="chat-target">
                    {otherUser ? (
                        <>
                            <AvatarIcon type={otherUser.avatar || 'eye'} size={32} />
                            <span>{otherUser.nickname || otherUser.username}</span>
                        </>
                    ) : (
                        <span>{t('chattingWith').replace('{id}', otherUserId)}</span>
                    )}
                </div>
                <div className="header-actions">
                    <button className="clear-history-btn" onClick={handleClearHistory} title={t('clearHistory')}>
                        {t('clearHistory')}
                    </button>
                </div>
            </div>

            <div className="messages-container" ref={chatContainerRef}>
                {messages.length === 0 ? (
                    <div className="empty-chat">{t('sayHello')}</div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender_id === user?.uid;

                        const showDateLabel = index === 0 ||
                            new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

                        return (
                            <React.Fragment key={msg.id}>
                                {showDateLabel && (
                                    <div className="date-divider">
                                        <span>{new Date(msg.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                                    </div>
                                )}
                                <div className={`message-wrapper ${isMe ? 'sent' : 'received'}`}>
                                    {!isMe && (
                                        <div className="message-avatar">
                                            <AvatarIcon type={msg.sender?.avatar || 'eye'} size={40} />
                                        </div>
                                    )}

                                    <div className="message-content">
                                        <div className="bubble">
                                            {msg.content}
                                        </div>
                                        <div className="time">
                                            {formatMessageTime(msg.created_at)}
                                        </div>
                                    </div>

                                    {isMe && (
                                        <div className="message-avatar">
                                            <AvatarIcon type={user.avatar || 'eye'} size={40} />
                                        </div>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chatPlaceholder')}
                    rows={1}
                    disabled={sending}
                />
                <button type="submit" disabled={!newMessage.trim() || sending} className="send-btn">
                    {t('send')}
                </button>
            </form>
        </div>
    );
};

export default ChatPage;
