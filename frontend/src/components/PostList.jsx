import { useLang } from '../contexts/LanguageContext';
import PostItem from './PostItem';
import './PostList.css';

function PostList({ posts, loading, refreshing = false }) {
    const { t } = useLang();

    if (loading) {
        return <div className="post-list-loading">{t('loading')}</div>;
    }

    if (!posts || posts.length === 0) {
        return <div className="post-list-empty">{t('noPosts')}</div>;
    }

    return (
        <div className={`post-list ${refreshing ? 'is-refreshing' : ''}`}>
            {refreshing && <div className="post-list-refresh-indicator">刷新中...</div>}
            {posts.map((post, index) => (
                <PostItem key={post.id} post={post} index={index} />
            ))}
        </div>
    );
}

export default PostList;
