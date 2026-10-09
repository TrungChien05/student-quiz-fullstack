import api from './api';
import type { AchievementBadge } from '../types';

export const achievementService = {
  getMyBadges: async (): Promise<AchievementBadge[]> => {
    const response = await api.get('/badges/me');
    return response.data;
  },

  getUserBadges: async (userId: number): Promise<AchievementBadge[]> => {
    const response = await api.get(`/badges/users/${userId}`);
    return response.data;
  },

  getUnseenBadges: async (): Promise<AchievementBadge[]> => {
    const response = await api.get('/badges/me/unseen');
    return response.data;
  },

  acknowledge: async (userBadgeId: number): Promise<void> => {
    await api.post(`/badges/me/unseen/${userBadgeId}/acknowledge`);
  },
};
