import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import PostList from '../components/PostList';
import Pagination from '../components/Pagination';
import CreatePostButton from '../components/CreatePostButton';
import { postService } from '../services/postService';

function HomePage() {
    const location = useLocation();
    const { t } = useLang();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const getInitialPage = () => {
        const savedPage = sessionStorage.getItem(`home_page_${location.pathname}`);
        return savedPage ? parseInt(savedPage, 10) : 1;
    };
    const [currentPage, setCurrentPage] = useState(getInitialPage);

    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('search');

    const prevPathnameRef = React.useRef(location.pathname);
    const prevSearchQueryRef = React.useRef(searchQuery);

    useEffect(() => {
        const isPathChanged = prevPathnameRef.current !== location.pathname;
        const isSearchChanged = prevSearchQueryRef.current !== searchQuery;

        if (isPathChanged || isSearchChanged) {
            sessionStorage.removeItem(`home_scroll_${location.pathname}`);
            setCurrentPage(1);
        }

        prevPathnameRef.current = location.pathname;
        prevSearchQueryRef.current = searchQuery;
    }, [location.pathname, searchQuery]);

    useEffect(() => {
        sessionStorage.setItem(`home_page_${location.pathname}`, currentPage);
    }, [currentPage, location.pathname]);

    useEffect(() => {
        const handleScroll = () => {
            sessionStorage.setItem(`home_scroll_${location.pathname}`, window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [location.pathname]);

    useEffect(() => {
        loadPosts(currentPage, searchQuery);
    }, [currentPage, location.pathname, searchQuery]);

    const loadPosts = async (page, search) => {
        setLoading(true);
        const isFeatured = location.pathname === '/featured';
        let categoryArg = null;

        if (location.pathname === '/live') {
            categoryArg = '语c';
        } else if (location.pathname === '/oc') {
            categoryArg = 'OC投稿';
        }

        try {
            const data = await postService.getPosts(page, pageSize, categoryArg, isFeatured ? 'likes' : 'newest', search);
            setPosts(data.items || []);
            setTotalPages(data.total_pages || 1);
        } catch {
            setPosts([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
            setTimeout(() => {
                const savedScroll = sessionStorage.getItem(`home_scroll_${location.pathname}`);
                if (savedScroll !== null) {
                    window.scrollTo({
                        top: parseInt(savedScroll, 10),
                        behavior: 'instant'
                    });
                }
            }, 100);
        }
    };

    return (
        <>
            {searchQuery && (
                <div style={{ padding: '10px 20px', color: '#ccc', fontSize: '1.2em' }}>
                    {t('searchResults')}"{searchQuery}"
                </div>
            )}
            <PostList posts={posts} loading={loading} />
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}
            <CreatePostButton />
        </>
    );
}

export default HomePage;
