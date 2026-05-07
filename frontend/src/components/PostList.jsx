import { useLang } from '../contexts/LanguageContext';
import PostItem from './PostItem';
import './PostList.css';

function PostList({ posts, loading }) {
    const { t } = useLang();

    if (loading) {
        return <div className="post-list-loading">{t('loading')}</div>;
    }

    if (!posts || posts.length === 0) {
        return <div className="post-list-empty">{t('noPosts')}</div>;
    }

    return (
        <div className="post-list">
            {posts.map((post, index) => (
                <PostItem key={post.id} post={post} index={index} />
            ))}
        </div>
    );
}

export default PostList;
