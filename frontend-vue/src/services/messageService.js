import api from './api';

const emitMessageDataChanged = (type) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('messageDataChanged', { detail: { type } }));
};

export const messageService = {
    sendMessage: async (receiverId, content) => {
        const response = await api.post('/messages', { receiver_id: receiverId, content });
        emitMessageDataChanged('private-message-sent');
        return response.data;
    },

    getConversations: async (skip = 0, limit = 20) => {
        const response = await api.get('/messages/conversations', { params: { skip, limit } });
        return response.data;
    },

    getMessages: async (otherUserId, skip = 0, limit = 50) => {
        const response = await api.get(`/messages/${otherUserId}`, { params: { skip, limit } });
        return response.data;
    },

    markAsRead: async (otherUserId) => {
        const response = await api.post(`/messages/${otherUserId}/read`);
        emitMessageDataChanged('messages-read');
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await api.get('/messages/unread/count');
        return response.data;
    },

    deleteConversation: async (otherUserId) => {
        const response = await api.delete(`/messages/${otherUserId}`);
        emitMessageDataChanged('conversation-deleted');
        return response.data;
    },

    getFriends: async () => {
        const response = await api.get('/messages/friends');
        return response.data;
    },

    removeFriend: async (friendUserId) => {
        const response = await api.delete(`/messages/friends/${friendUserId}`);
        emitMessageDataChanged('friend-removed');
        return response.data;
    },

    getFriendRequests: async () => {
        const response = await api.get('/messages/friend-requests');
        return response.data;
    },

    getGroupInvites: async () => {
        const response = await api.get('/messages/group-invites');
        return response.data;
    },

    sendFriendRequest: async (userId) => {
        const response = await api.post('/messages/friend-requests', { user_id: userId });
        emitMessageDataChanged('friend-request-sent');
        return response.data;
    },

    acceptFriendRequest: async (requestId) => {
        const response = await api.post(`/messages/friend-requests/${requestId}/accept`);
        emitMessageDataChanged('friend-request-accepted');
        return response.data;
    },

    rejectFriendRequest: async (requestId) => {
        const response = await api.post(`/messages/friend-requests/${requestId}/reject`);
        emitMessageDataChanged('friend-request-rejected');
        return response.data;
    },

    acceptGroupInvite: async (inviteId) => {
        const response = await api.post(`/messages/group-invites/${inviteId}/accept`);
        emitMessageDataChanged('group-invite-accepted');
        return response.data;
    },

    rejectGroupInvite: async (inviteId) => {
        const response = await api.post(`/messages/group-invites/${inviteId}/reject`);
        emitMessageDataChanged('group-invite-rejected');
        return response.data;
    },

    getGroups: async () => {
        const response = await api.get('/messages/groups');
        return response.data;
    },

    getUnreadOverview: async () => {
        const [privateConversations, groups, total] = await Promise.all([
            messageService.getConversations(),
            messageService.getGroups(),
            messageService.getUnreadCount(),
        ]);

        return {
            total_unread_count: total.unread_count || 0,
            private_unread_count: privateConversations.reduce((sum, item) => sum + (item.unread_count || 0), 0),
            group_unread_count: groups.reduce((sum, item) => sum + (item.unread_count || 0), 0),
            conversations: privateConversations,
            groups,
        };
    },

    createGroup: async (name, memberIds = [], isPublic = true) => {
        const response = await api.post('/messages/groups', {
            name,
            member_ids: memberIds,
            is_public: isPublic,
        });
        emitMessageDataChanged('group-created');
        return response.data;
    },

    getGroupDetail: async (groupId) => {
        const response = await api.get(`/messages/groups/${groupId}`);
        return response.data;
    },

    joinGroup: async (groupId) => {
        const response = await api.post(`/messages/groups/${groupId}/join`);
        emitMessageDataChanged('group-joined');
        return response.data;
    },

    leaveGroup: async (groupId) => {
        const response = await api.post(`/messages/groups/${groupId}/leave`);
        emitMessageDataChanged('group-left');
        return response.data;
    },

    addGroupMember: async (groupId, userId) => {
        const response = await api.post(`/messages/groups/${groupId}/members`, { user_id: userId });
        emitMessageDataChanged('group-member-invited');
        return response.data;
    },

    getGroupMessages: async (groupId, skip = 0, limit = 100) => {
        const response = await api.get(`/messages/groups/${groupId}/messages`, { params: { skip, limit } });
        return response.data;
    },

    sendGroupMessage: async (groupId, content) => {
        const response = await api.post(`/messages/groups/${groupId}/messages`, { content });
        emitMessageDataChanged('group-message-sent');
        return response.data;
    },
};
