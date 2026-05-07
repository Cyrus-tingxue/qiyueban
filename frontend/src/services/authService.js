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
    }
};
