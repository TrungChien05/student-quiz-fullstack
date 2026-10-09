import api from './api';
import type { BattleRoom } from '../types';

export const battleService = {
  createRoom: async (quizId: number): Promise<BattleRoom> => {
    const { data } = await api.post('/battles', { quizId });
    return data;
  },

  joinRoom: async (roomCode: string): Promise<BattleRoom> => {
    const { data } = await api.post('/battles/join', { roomCode });
    return data;
  },

  getRoom: async (roomCode: string): Promise<BattleRoom> => {
    const { data } = await api.get(`/battles/${roomCode}`);
    return data;
  },

  startBattle: async (roomCode: string): Promise<BattleRoom> => {
    const { data } = await api.post(`/battles/${roomCode}/start`);
    return data;
  },

  submitAnswer: async (
    roomCode: string,
    questionIndex: number,
    answerIndex: number,
    responseTimeMs: number,
  ): Promise<{ accepted: boolean; questionIndex: number; responseTimeMs: number }> => {
    const { data } = await api.post(`/battles/${roomCode}/answers`, {
      questionIndex,
      answerIndex,
      responseTimeMs,
    });
    return data;
  },
};

export const getBattleSocketUrl = () => {
  const apiBase = String(api.defaults.baseURL || 'http://localhost:8080/api');
  return apiBase.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws-battle';
};
