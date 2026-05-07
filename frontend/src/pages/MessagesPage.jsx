import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { messageService } from '../services/messageService';
import { authService } from '../services/authService';
import AvatarIcon from '../components/AvatarIcon';
import './MessagesPage.css';

const MessagesPage = () => {
    const { user } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchConversations();
    }, [user, navigate]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await authService.searchUsers(searchQuery);
                setSearchResults(results.filter(u => u.uid !== user?.uid));
            } catch (err) {
                console.error("搜索失败", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, user?.uid]);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const data = await messageService.getConversations();
            setConversations(data);
        } catch (err) {
            console.error('Failed to load conversations:', err);
            setError(t('loadConvFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleConversationClick = (otherUserId) => {
        navigate(`/chat/${otherUserId}`);
    };

    const handleDeleteConversation = async (e, otherUserId) => {
        e.stopPropagation();
        if (!window.confirm(t('deleteConvConfirm'))) {
            return;
        }

        try {
            await messageService.deleteConversation(otherUserId);
            setConversations(prev => prev.filter(c => c.with_user.uid !== otherUserId));
        } catch (err) {
            console.error("删除聊天记录失败", err);
            alert(t('deleteConvFailed'));
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }

        if (date.getFullYear() === now.getFullYear()) {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }

        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    if (loading) return <div className="loading-state">{t('loading')}</div>;

    return (
        <div className="messages-page">
            <div className="messages-header">
                <h2>{t('messageList')}</h2>
                <div className="header-actions">
                    <button className="refresh-btn" onClick={fetchConversations}>{t('refresh')}</button>
                </div>
            </div>

            <div className="search-container">
                <input
                    type="text"
                    placeholder={t('searchUserPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
                {searchQuery && (
                    <div className="search-results">
                        {isSearching ? (
                            <div className="search-item">{t('searching')}</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map(u => (
                                <div key={u.uid} className="search-item" onClick={() => handleConversationClick(u.uid)}>
                                    <AvatarIcon type={u.avatar || 'eye'} size={24} />
                                    <span>{u.nickname || u.username}</span>
                                </div>
                            ))
                        ) : (
                            <div className="search-item">{t('noUserFound')}</div>
                        )}
                    </div>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="conversations-list">
                {conversations.length === 0 ? (
                    <div className="empty-state">{t('noConversations')}</div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.with_user.uid}
                            className={`conversation-item ${conv.unread_count > 0 ? 'unread' : ''}`}
                            onClick={() => handleConversationClick(conv.with_user.uid)}
                        >
                            <div className="conversation-avatar">
                                <AvatarIcon type={conv.with_user.avatar || 'eye'} size={40} />
                                {conv.unread_count > 0 && (
                                    <span className="unread-badge">{conv.unread_count}</span>
                                )}
                            </div>
                            <div className="conversation-content">
                                <div className="conversation-top">
                                    <span className="username">{conv.with_user.nickname || conv.with_user.username}</span>
                                    <span className="time">{formatTime(conv.last_message.created_at)}</span>
                                </div>
                                <div className="conversation-bottom">
                                    <span className="last-message">
                                        {conv.last_message.sender_id === user?.uid ? t('me') : ''}
                                        {conv.last_message.content.length > 30
                                            ? conv.last_message.content.substring(0, 30) + '...'
                                            : conv.last_message.content}
                                    </span>
                                </div>
                            </div>
                            <button
                                className="delete-conv-btn"
                                onClick={(e) => handleDeleteConversation(e, conv.with_user.uid)}
                                title={t('clearHistory')}
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
