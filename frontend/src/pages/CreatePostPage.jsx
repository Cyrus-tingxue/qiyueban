import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import { postService } from '../services/postService';
import EmojiPicker from '../components/EmojiPicker';
import './CreatePostPage.css';

const POST_DRAFT_KEY = 'create_post_draft';

function CreatePostPage() {
    const navigate = useNavigate();
    const { t } = useLang();

    const categoryKeys = [
        'catDiscussion', 'catExplore', 'catParanormal',
        'catHelp', 'catShare', 'catLive', 'catOC'
    ];
    // Backend categories are always Chinese
    const categoryValues = ['讨论', '探灵', '灵异', '求助', '分享', '语c', 'OC投稿'];

    const [title, setTitle] = useState('');
    const [categoryIdx, setCategoryIdx] = useState(0);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        try {
            const rawDraft = sessionStorage.getItem(POST_DRAFT_KEY);
            if (!rawDraft) return;

            const draft = JSON.parse(rawDraft);
            if (typeof draft.title === 'string') setTitle(draft.title);
            if (typeof draft.content === 'string') setContent(draft.content);
            if (Number.isInteger(draft.categoryIdx) && draft.categoryIdx >= 0 && draft.categoryIdx < categoryValues.length) {
                setCategoryIdx(draft.categoryIdx);
            }
        } catch (error) {
            console.error('Failed to restore post draft', error);
            sessionStorage.removeItem(POST_DRAFT_KEY);
        }
    }, []);

    useEffect(() => {
        const hasDraftContent = Boolean(title.trim() || content.trim());
        if (!hasDraftContent) {
            sessionStorage.removeItem(POST_DRAFT_KEY);
            return;
        }

        const draft = JSON.stringify({
            title,
            content,
            categoryIdx,
            updatedAt: Date.now(),
        });
        sessionStorage.setItem(POST_DRAFT_KEY, draft);
    }, [title, content, categoryIdx]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!title.trim() && !content.trim()) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [title, content]);

    const clearDraft = () => {
        sessionStorage.removeItem(POST_DRAFT_KEY);
    };

    const handleLeave = () => {
        if (!title.trim() && !content.trim()) {
            navigate(-1);
            return;
        }

        if (window.confirm(t('leaveEditorConfirm'))) {
            navigate(-1);
        }
    };

    const handleInsertEmoji = (emojiTag) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.slice(0, start) + emojiTag + content.slice(end);
            setContent(newContent);
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + emojiTag.length;
            }, 0);
        } else {
            setContent(content + emojiTag);
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const data = await postService.uploadImage(file);
            const imgTag = `\n[img:${data.url}]\n`;

            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newContent = content.slice(0, start) + imgTag + content.slice(end);
                setContent(newContent);
                setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = start + imgTag.length;
                }, 0);
            } else {
                setContent(content + imgTag);
            }
        } catch (err) {
            alert(t('uploadFailed') || '上传图片失败');
        } finally {
            setUploadingImage(false);
            e.target.value = ''; // 重置 file input
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const imgMatch = content.match(/\[img:([^\]]+)\]/);
            const resolvedImageUrl = imgMatch ? imgMatch[1] : null;

            await postService.createPost({
                title,
                category: categoryValues[categoryIdx],
                content,
                image_url: resolvedImageUrl
            });
            clearDraft();
            navigate('/');
        } catch {
            alert(t('postFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-post-page">
            <div className="create-post-card">
                <h2>{t('createPost')}</h2>
                <form className="create-post-form" onSubmit={handleSubmit}>
                    <div className="create-post-field">
                        <label>{t('category')}</label>
                        <select value={categoryIdx} onChange={(e) => setCategoryIdx(parseInt(e.target.value))}>
                            {categoryKeys.map((key, idx) => (
                                <option key={key} value={idx}>{t(key)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="create-post-field">
                        <label>{t('title')}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('titlePlaceholder')}
                            required
                        />
                    </div>
                    <div className="create-post-field">
                        <label>{t('content')}</label>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t('contentPlaceholder')}
                            required
                        />
                        <div className="create-post-emoji-bar">
                            <EmojiPicker onSelect={handleInsertEmoji} />
                            <button
                                type="button"
                                className="emoji-picker-trigger"
                                style={{ marginLeft: '10px' }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                title={t('uploadImage') || '上传附图'}
                            >
                                {t('imageBtn') || '图片'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                onChange={handleImageChange}
                            />
                        </div>
                        {uploadingImage && <div className="create-post-uploading-hint">图片上传中...</div>}
                    </div>
                    <div className="create-post-actions">
                        <button className="create-post-submit" type="submit" disabled={loading}>
                            {loading ? t('publishing') : t('publish')}
                        </button>
                        <button className="create-post-cancel" type="button" onClick={handleLeave}>
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreatePostPage;
