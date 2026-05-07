import api from './api';

export const postService = {
    async getPosts(page = 1, pageSize = 10, category = null, sort = "newest", search = null, authorId = null) {
        const params = { page, page_size: pageSize, sort };
        if (category) params.category = category;
        if (search) params.search = search;
        if (authorId) params.author_id = authorId;
        const response = await api.get('/posts', { params });
        return response.data;
    },

    async getPost(id) {
        const response = await api.get(`/posts/${id}`);
        return response.data;
    },

    async createPost(data) {
        const response = await api.post('/posts', data);
        return response.data;
    },

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    async updatePost(id, data) {
        const response = await api.put(`/posts/${id}`, data);
        return response.data;
    },

    async deletePost(id) {
        const response = await api.delete(`/posts/${id}`);
        return response.data;
    },

    async getCategories() {
        const response = await api.get('/categories');
        return response.data;
    },

    async getReplies(postId) {
        const response = await api.get(`/posts/${postId}/replies`);
        return response.data;
    },

    async createReply(postId, data) {
        const response = await api.post(`/posts/${postId}/replies`, data);
        return response.data;
    },

    async checkLike(postId) {
        const response = await api.get(`/posts/${postId}/like`);
        return response.data;
    },

    async toggleLike(postId) {
        const response = await api.post(`/posts/${postId}/like`);
        return response.data;
    },

    async deleteReply(replyId) {
        const response = await api.delete(`/posts/replies/${replyId}`);
        return response.data;
    },

    async toggleReplyLike(replyId) {
        const response = await api.post(`/posts/replies/${replyId}/like`);
        return response.data;
    },

    async getLikedReplies(postId) {
        const response = await api.get(`/posts/${postId}/replies/liked`);
        return response.data; // 返回的是一个 list[int]
    },

    // ===== 通知相关 =====
    async getNotifications(page = 1, pageSize = 20) {
        // 后端是用 skip, limit
        const skip = (page - 1) * pageSize;
        const response = await api.get('/notifications', { params: { skip, limit: pageSize } });
        return response.data;
    },

    async readNotification(notifId) {
        const response = await api.post(`/notifications/${notifId}/read`);
        return response.data;
    },

    async readAllNotifications() {
        const response = await api.post('/notifications/read-all');
        return response.data;
    }
};
