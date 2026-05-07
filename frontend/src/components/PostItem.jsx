import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import AvatarIcon from './AvatarIcon';
import './PostItem.css';

const categoryEmojis = {
    '讨论': '',
    '探灵': '',
    '灵异': '',
    '求助': '',
    '分享': '',
};

// Map Chinese category names to i18n keys
const categoryKeyMap = {
    '讨论': 'catDiscussion',
    '探灵': 'catExplore',
    '灵异': 'catParanormal',
    '求助': 'catHelp',
    '分享': 'catShare',
    '语c': 'catLive',
    'OC投稿': 'catOC',
};

function PostItem({ post, index = 0 }) {
    const navigate = useNavigate();
    const { t } = useLang();
    const emoji = categoryEmojis[post.category] || '📝';
    const categoryLabel = t(categoryKeyMap[post.category] || 'catDiscussion') || post.category;

    return (
        <div
            className="post-item"
            style={{ animationDelay: `${index * 0.08}s` }}
            onClick={() => navigate(`/post/${post.id}`)}
        >
            <div className="post-item-icon">
                {post.author_avatar ? (
                    <AvatarIcon type={post.author_avatar} size={56} />
                ) : (
                    <span className="post-item-icon-placeholder">{emoji}</span>
                )}
            </div>
            <div className="post-item-content">
                <div className="post-item-title">
                    <span className="post-item-category">「{categoryLabel}」</span>
                    <span className="post-item-text">{post.title}</span>
                </div>
                {post.image_url && (
                    <div className="post-item-thumbnail">
                        <img src={post.image_url} alt="post thumbnail" />
                    </div>
                )}
                {post.author && (
                    <div className="post-item-meta">
                        <span>{post.author}</span>
                        <span>{post.created_at}</span>
                        <span>{post.reply_count || 0} {t('replies')}</span>
                        <span>{post.like_count || 0} {t('likes')}</span>
                    </div>
                )}
            </div>
        </div >
    );
}

export default PostItem;
