import api from './api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const postService = {
  async getPosts(page = 1, pageSize = 10, category: string | null = null, sort = 'newest', search: string | null = null, authorId: number | null = null) {
    const params: any = { page, page_size: pageSize, sort };
    if (category) params.category = category;
    if (search) params.search = search;
    if (authorId) params.author_id = authorId;
    const cacheKey = `posts_cache_${page}_${pageSize}_${category}_${sort}_${search}_${authorId}`;
    
    // First try memory cache
    if ((postService as any)._cache && (postService as any)._cache[cacheKey]) {
      api.get('/posts', { params }).then(response => {
        (postService as any)._cache[cacheKey] = response.data;
        AsyncStorage.setItem(cacheKey, JSON.stringify(response.data)).catch(() => {});
      }).catch(() => {});
      return (postService as any)._cache[cacheKey];
    }

    // Then try async storage cache
    let cachedData = null;
    try {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (stored) {
        cachedData = JSON.parse(stored);
        if (!(postService as any)._cache) (postService as any)._cache = {};
        (postService as any)._cache[cacheKey] = cachedData;
      }
    } catch(e) {}

    // Fetch from network
    try {
      const response = await api.get('/posts', { params });
      if (!(postService as any)._cache) (postService as any)._cache = {};
      (postService as any)._cache[cacheKey] = response.data;
      AsyncStorage.setItem(cacheKey, JSON.stringify(response.data)).catch(() => {});
      return response.data;
    } catch(e) {
      if (cachedData) return cachedData;
      throw e;
    }
  },

  async getPost(id: number) {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  async createPost(data: { title: string; content: string; category: string; image_url?: string }) {
    const response = await api.post('/posts', data);
    return response.data;
  },

  async uploadImage(uri: string) {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type,
    } as any);

    const response = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updatePost(id: number, data: any) {
    const response = await api.put(`/posts/${id}`, data);
    return response.data;
  },

  async deletePost(id: number) {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },

  async getCategories() {
    const response = await api.get('/categories');
    return response.data;
  },

  async getReplies(postId: number) {
    const response = await api.get(`/posts/${postId}/replies`);
    return response.data;
  },

  async createReply(postId: number, data: { content: string; image_url?: string; reply_to_id?: number; reply_to_user_id?: number; reply_to_username?: string }) {
    const response = await api.post(`/posts/${postId}/replies`, data);
    return response.data;
  },

  async requestGravePost(postId: number, reason: string = '') {
    const response = await api.post(`/posts/${postId}/grave-requests`, { reason });
    return response.data;
  },

  async getGraveRequests(status: string = 'pending') {
    const response = await api.get('/grave-requests', { params: { status } });
    return response.data;
  },

  async approveGraveRequest(requestId: number) {
    const response = await api.post(`/grave-requests/${requestId}/approve`);
    return response.data;
  },

  async rejectGraveRequest(requestId: number) {
    const response = await api.post(`/grave-requests/${requestId}/reject`);
    return response.data;
  },

  async markPostGrave(postId: number) {
    const response = await api.post(`/posts/${postId}/grave`);
    return response.data;
  },

  async checkLike(postId: number) {
    const response = await api.get(`/posts/${postId}/like`);
    return response.data;
  },

  async toggleLike(postId: number) {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },

  async deleteReply(replyId: number) {
    const response = await api.delete(`/posts/replies/${replyId}`);
    return response.data;
  },

  async toggleReplyLike(replyId: number) {
    const response = await api.post(`/posts/replies/${replyId}/like`);
    return response.data;
  },

  async getLikedReplies(postId: number) {
    const response = await api.get(`/posts/${postId}/replies/liked`);
    return response.data;
  },

  // Notifications
  async getNotifications(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const response = await api.get('/notifications', { params: { skip, limit: pageSize } });
    return response.data;
  },

  async getUnreadNotificationsCount() {
    const response = await api.get('/notifications/unread/count');
    return response.data;
  },

  async readNotification(notifId: number) {
    const response = await api.post(`/notifications/${notifId}/read`);
    return response.data;
  },

  async readAllNotifications() {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  async clearAllNotifications() {
    const response = await api.delete('/notifications/clear-all');
    return response.data;
  },

  async clearReadNotifications() {
    const response = await api.delete('/notifications/clear-read');
    return response.data;
  },
};
