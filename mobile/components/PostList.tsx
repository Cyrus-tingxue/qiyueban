import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, RefreshControl } from 'react-native';
import { postService } from '../services/postService';
import { useLang } from '../contexts/LanguageContext';
import PostItem from './PostItem';
import { Colors } from '../constants/Colors';
import { useRouter } from 'expo-router';

interface PostListProps {
  category: string | null;
  sort: string;
  search: string;
}

export default function PostList({ category, sort, search }: PostListProps) {
  const { t } = useLang();
  const router = useRouter();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = useCallback(async (isRefresh = false, explicitPage: number | null = null) => {
    try {
      const targetPage = explicitPage !== null ? explicitPage : (isRefresh ? 1 : page);
      if (isRefresh) setLoading(true);
      
      const response = await postService.getPosts(
        targetPage,
        10,
        category,
        sort,
        search || null
      );
      
      if (targetPage === 1) {
        setPosts(response.items || []);
      } else {
        setPosts(prev => [...prev, ...(response.items || [])]);
      }
      setTotalPages(response.total_pages || 1);
      if (isRefresh) setPage(1);
    } catch (e) {
      console.warn('Failed to fetch posts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, category, sort, search]);

  // When search or category changes, refresh from page 1
  useEffect(() => {
    fetchPosts(true);
  }, [category, sort, search]);

  const handleLoadMore = () => {
    if (!loading && !refreshing && page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(false, nextPage);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(true);
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={(item: any) => item.id.toString()}
      renderItem={({ item }) => (
        <PostItem post={item} onPress={() => router.push({ pathname: `/post/${item.id}`, params: { initialPost: JSON.stringify(item) } })} />
      )}
      ListFooterComponent={
        <View style={styles.emptyContainer}>
          {loading && !refreshing && <Text style={styles.emptyText}>{t('loading')}</Text>}
          {!loading && posts.length === 0 && <Text style={styles.emptyText}>{t('noPosts')}</Text>}
          {!loading && posts.length > 0 && page >= totalPages && <Text style={styles.emptyText}>没有更多帖子了</Text>}
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      contentContainerStyle={styles.listContent}
      removeClippedSubviews={true}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={3}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
