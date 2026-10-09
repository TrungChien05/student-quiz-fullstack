import api from './api';
import type { AiQuestionExplanation, AiWeaknessAnalysis } from '../types';

export interface ExplainQuestionPayload {
  questionId?: number;
  question: string;
  options: string[];
  correctAnswer: number;
  selectedAnswer: number | null;
  existingExplanation?: string;
}

export const aiLearningService = {
  explainQuestion: async (payload: ExplainQuestionPayload): Promise<AiQuestionExplanation> => {
    const { data } = await api.post('/ai/explain-question', payload);
    return data;
  },

  analyzeWeakness: async (): Promise<AiWeaknessAnalysis> => {
    const { data } = await api.post('/ai/analyze-weakness');
    return data;
  },
};
