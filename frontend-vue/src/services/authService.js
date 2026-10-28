import api from './api';

export const authService = {
    async login(username, password) {
        const response = await api.post('/auth/login', { username, password });
        return response.data;
    },

    async register(username, password, nickname, avatar = 'eye', email = '') {
        const response = await api.post('/auth/register', { username, password, nickname, avatar, email: email || null });
        return response.data;
    },

    async getProfile() {
        const response = await api.get('/auth/profile');
        return response.data;
    },

    async searchUsers(keyword) {
        const response = await api.get('/auth/search', { params: { q: keyword } });
        return response.data;
    },

    async sendBindEmailCode(email, password) {
        const response = await api.post('/auth/email/send-code', { email, password });
        return response.data;
    },

    async confirmEmail(email, code) {
        const response = await api.post('/auth/email/confirm', { email, code });
        return response.data;
    },

    async forgotPassword(email) {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    async resetPassword(email, code, newPassword) {
        const response = await api.post('/auth/reset-password', { email, code, new_password: newPassword });
        return response.data;
    },

    async banUser(userId, reason = '') {
        const response = await api.post(`/auth/admin/users/${userId}/ban`, { reason });
        return response.data;
    },

    async banUserByUsername(username, reason = '') {
        const response = await api.post('/auth/admin/users/ban-by-username', { username, reason });
        return response.data;
    },

    async unbanUser(userId) {
        const response = await api.post(`/auth/admin/users/${userId}/unban`);
        return response.data;
    },

    async getIpBans() {
        const response = await api.get('/auth/admin/ip-bans');
        return response.data;
    },

    async banIp(ipAddress, reason = '') {
        const response = await api.post('/auth/admin/ip-bans', { ip_address: ipAddress, reason });
        return response.data;
    },

    async unbanIp(banId) {
        const response = await api.delete(`/auth/admin/ip-bans/${banId}`);
        return response.data;
    }
};
