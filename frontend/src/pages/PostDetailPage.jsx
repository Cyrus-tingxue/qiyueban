import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postService } from '../services/postService';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import AvatarIcon from '../components/AvatarIcon';
import EmojiPicker from '../components/EmojiPicker';
import RichContent from '../components/RichContent';
import './PostDetailPage.css';

const categoryKeyMap = {
    '讨论': 'catDiscussion',
    '探灵': 'catExplore',
    '灵异': 'catParanormal',
    '求助': 'catHelp',
    '分享': 'catShare',
    '语c': 'catLive',
};

function PostDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, user } = useAuth();
    const { t } = useLang();
    const [post, setPost] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyContent, setReplyContent] = useState('');
    const [replyTarget, setReplyTarget] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingReplyImage, setUploadingReplyImage] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const textareaRef = useRef(null);
    const replyFileInputRef = useRef(null);

    useEffect(() => {
        loadPost();
        loadReplies();
    }, [id, isLoggedIn]);

    const loadPost = async () => {
        setLoading(true);
        try {
            const data = await postService.getPost(id);
            setPost(data);

            if (isLoggedIn) {
                try {
                    const likeData = await postService.checkLike(id);
                    setIsLiked(likeData.is_liked);
                } catch (e) {
                    console.error(t('likeCheckFailed'), e);
                }
            }
        } catch {
            setPost({
                id,
                category: '讨论',
                title: t('postLoadFailed'),
                author: t('anonymous'),
                author_avatar: 'eye',
                created_at: '--',
                content: t('backendDisconnected'),
                reply_count: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    const loadReplies = async () => {
        try {
            const data = await postService.getReplies(id);
            if (isLoggedIn) {
                try {
                    const likedReplyIds = await postService.getLikedReplies(id);
                    const likedSet = new Set(likedReplyIds);
                    data.forEach(reply => {
                        reply.is_liked = likedSet.has(reply.id);
                    });
                } catch (e) {
                    console.error(t('replyLikeCheckFailed'), e);
                }
            }
            setReplies(data);
        } catch {
            setReplies([]);
        }
    };

    const handleInsertEmoji = (emojiTag) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = replyContent.slice(0, start) + emojiTag + replyContent.slice(end);
            setReplyContent(newContent);
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + emojiTag.length;
            }, 0);
        } else {
            setReplyContent(replyContent + emojiTag);
        }
    };

    const insertReplyText = (textToInsert) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = replyContent.slice(0, start) + textToInsert + replyContent.slice(end);
            setReplyContent(newContent);
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
            }, 0);
        } else {
            setReplyContent(replyContent + textToInsert);
        }
    };

    const handleReplyImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingReplyImage(true);
        try {
            const data = await postService.uploadImage(file);
            insertReplyText(`\n[img:${data.url}]\n`);
        } catch {
            alert(t('uploadFailed') || '上传图片失败');
        } finally {
            setUploadingReplyImage(false);
            e.target.value = '';
        }
    };

    const handleReplyTo = (reply) => {
        setReplyTarget({
            id: reply.id,
            userId: reply.author_id,
            username: reply.author
        });

        const currentContent = replyContent.replace(/^@\S+\s/, '');
        setReplyContent(`@${reply.author} ` + currentContent);

        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        setSubmitting(true);
        try {
            const imgMatch = replyContent.match(/\[img:([^\]]+)\]/);
            const payload = {
                content: replyContent,
                image_url: imgMatch ? imgMatch[1] : null,
            };
            if (replyTarget && replyContent.trim().startsWith(`@${replyTarget.username}`)) {
                payload.reply_to_id = replyTarget.id;
                payload.reply_to_user_id = replyTarget.userId;
                payload.reply_to_username = replyTarget.username;
            }

            await postService.createReply(id, payload);
            setReplyContent('');
            setReplyTarget(null);
            await loadReplies();
            await loadPost();
        } catch {
            alert(t('replyFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('deletePostConfirm'))) return;
        try {
            await postService.deletePost(id);
            navigate('/');
        } catch {
            alert(t('deleteFailed'));
        }
    };

    const handleToggleLike = async () => {
        if (!isLoggedIn) {
            alert(t('loginToLike'));
            return;
        }
        try {
            const likeData = await postService.toggleLike(id);
            setIsLiked(likeData.is_liked);
            setPost(prev => ({ ...prev, like_count: likeData.like_count }));
        } catch {
            alert(t('operationFailed'));
        }
    };

    const handleToggleReplyLike = async (replyId) => {
        if (!isLoggedIn) {
            alert(t('loginToLike'));
            return;
        }
        try {
            const likeData = await postService.toggleReplyLike(replyId);
            setReplies(prevReplies =>
                prevReplies.map(reply =>
                    reply.id === replyId
                        ? { ...reply, like_count: likeData.like_count, is_liked: likeData.is_liked }
                        : reply
                )
            );
        } catch {
            alert(t('operationFailed'));
        }
    };

    const handleDeleteReply = async (replyId) => {
        if (!window.confirm(t('deleteReplyConfirm'))) return;
        try {
            await postService.deleteReply(replyId);
            await loadReplies();
            await loadPost();
        } catch {
            alert(t('deleteFailed'));
        }
    };

    if (loading) {
        return <div className="post-detail-page"><p style={{ color: 'var(--color-accent)', animation: 'pulse 1.5s infinite' }}>{t('loading')}</p></div>;
    }

    if (!post) {
        return <div className="post-detail-page"><p>{t('postNotExist')}</p></div>;
    }

    const categoryLabel = t(categoryKeyMap[post.category] || 'catDiscussion') || post.category;

    return (
        <div className="post-detail-page">
            <button className="post-detail-back" onClick={() => navigate(-1)}>
                {t('back')}
            </button>
            <div className="post-detail-card">
                <div className="post-detail-header">
                    <span className="post-detail-category">「{categoryLabel}」</span>
                    <h1 className="post-detail-title">{post.title}</h1>
                </div>
                <div className="post-detail-meta">
                    <span className="post-detail-author-info">
                        {post.author_avatar && <AvatarIcon type={post.author_avatar} size={32} />}
                        <span>{post.author}</span>
                        {isLoggedIn && user && user?.uid !== post.author_id && (
                            <button
                                className="send-message-btn"
                                onClick={() => navigate(`/chat/${post.author_id}`)}
                                title={t('sendMessage')}
                            >
                                {t('sendMessage')}
                            </button>
                        )}
                    </span>
                    <span>{t('publishedAt')}{post.created_at}</span>
                    <span>{post.reply_count || 0} {t('replyCount')}</span>
                </div>
                <div className="post-detail-body">
                    {post.image_url && (!post.content || !post.content.includes(`[img:${post.image_url}]`)) && (
                        <div className="post-detail-attached-image">
                            <img src={post.image_url} alt="attached" />
                        </div>
                    )}
                    <RichContent text={post.content || t('noContent')} />
                </div>

                <div className="post-detail-actions">
                    <button
                        className={`post-like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={handleToggleLike}
                    >
                        {isLiked ? t('liked') : t('like')} {post.like_count > 0 ? `(${post.like_count})` : ''}
                    </button>
                    {isLoggedIn && user && (user?.uid === post.author_id || user?.is_admin) && (
                        <button className="post-delete-btn" onClick={handleDelete}>{t('deletePost')}</button>
                    )}
                </div>
            </div>

            <div className="reply-section">
                <h3 className="reply-section-title">{t('replySection')} ({replies.length})</h3>
                {replies.length === 0 ? (
                    <p className="reply-empty">{t('noReplies')}</p>
                ) : (
                    <div className="reply-list">
                        {replies.map((reply, index) => (
                            <div className="reply-item" key={reply.id}>
                                <div className="reply-item-header">
                                    <span className="reply-item-floor">#{index + 1}</span>
                                    <span className="reply-item-author">
                                        {reply.author_avatar && <AvatarIcon type={reply.author_avatar} size={28} />}
                                        <span>{reply.author}</span>
                                    </span>
                                    <span className="reply-item-time">{reply.created_at}</span>
                                </div>
                                <div className="reply-item-content">
                                    {reply.reply_to_username && (
                                        <span className="reply-to-badge">{t('replyToBadge')}{reply.reply_to_username}: </span>
                                    )}
                                    {reply.image_url && (!reply.content || !reply.content.includes(`[img:${reply.image_url}]`)) && (
                                        <div className="reply-attached-image">
                                            <img src={reply.image_url} alt="reply attached" />
                                        </div>
                                    )}
                                    <RichContent text={reply.content} />
                                </div>
                                <div className="reply-item-actions">
                                    {isLoggedIn && (
                                        <button className="reply-action-btn" onClick={() => handleReplyTo(reply)}>
                                            {t('comment')}
                                        </button>
                                    )}
                                    <button
                                        className={`reply-like-btn ${reply.is_liked ? 'liked' : ''}`}
                                        onClick={() => handleToggleReplyLike(reply.id)}
                                    >
                                        {reply.is_liked ? '❤️' : '🤍'} {reply.like_count > 0 ? reply.like_count : t('likes')}
                                    </button>
                                    {isLoggedIn && user && (user?.uid === reply.author_id || user?.is_admin) && (
                                        <button className="reply-delete-btn" onClick={() => handleDeleteReply(reply.id)}>{t('deleteReply')}</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isLoggedIn ? (
                    <form className="reply-form" onSubmit={handleSubmitReply}>
                        <div className="reply-form-field">
                            {replyTarget && replyContent.startsWith(`@${replyTarget.username}`) && (
                                <div className="reply-target-hint">
                                    {t('replyingTo')} <span>@{replyTarget.username}</span>
                                    <button type="button" onClick={() => {
                                        setReplyTarget(null);
                                        setReplyContent(replyContent.replace(`@${replyTarget.username} `, ''));
                                    }}>{t('cancelReply')}</button>
                                </div>
                            )}
                            <textarea
                                ref={textareaRef}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={t('replyPlaceholder')}
                                required
                            />
                            <div className="reply-form-toolbar">
                                <EmojiPicker onSelect={handleInsertEmoji} />
                                <button
                                    type="button"
                                    className="reply-image-btn"
                                    onClick={() => replyFileInputRef.current?.click()}
                                    disabled={uploadingReplyImage || submitting}
                                    title={t('imageBtn')}
                                >
                                    {uploadingReplyImage ? t('uploadingImage') : t('imageBtn')}
                                </button>
                                <input
                                    type="file"
                                    ref={replyFileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/png, image/jpeg, image/gif, image/webp"
                                    onChange={handleReplyImageChange}
                                />
                                <button className="reply-submit-btn" type="submit" disabled={submitting}>
                                    {submitting ? t('sending') : t('reply')}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <p className="reply-login-hint">{t('loginToReply')}</p>
                )}
            </div>
        </div>
    );
}

export default PostDetailPage;
