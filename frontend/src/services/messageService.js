import api from './api';

export const messageService = {
    // 发送消息
    sendMessage: async (receiverId, content) => {
        const response = await api.post('/messages', {
            receiver_id: receiverId,
            content: content
        });
        return response.data;
    },

    // 获取最近的会话列表
    getConversations: async (skip = 0, limit = 20) => {
        const response = await api.get('/messages/conversations', {
            params: { skip, limit }
        });
        return response.data;
    },

    // 获取与某个用户的聊天记录
    getMessages: async (otherUserId, skip = 0, limit = 50) => {
        const response = await api.get(`/messages/${otherUserId}`, {
            params: { skip, limit }
        });
        return response.data;
    },

    // 将某个会话标为已读
    markAsRead: async (otherUserId) => {
        const response = await api.post(`/messages/${otherUserId}/read`);
        return response.data;
    },

    // 获取总未读数（用于导航栏小红点）
    getUnreadCount: async () => {
        const response = await api.get('/messages/unread/count');
        return response.data;
    },

    // 删除与某个用户之间的所有聊天记录
    deleteConversation: async (otherUserId) => {
        const response = await api.delete(`/messages/${otherUserId}`);
        return response.data;
    }
};
