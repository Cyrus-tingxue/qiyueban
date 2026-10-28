import api from './api';

export const announcementService = {
    async getAnnouncement() {
        const response = await api.get('/announcement');
        return response.data;
    },

    async updateAnnouncement(content) {
        const response = await api.put('/announcement', { content });
        return response.data;
    },
};
