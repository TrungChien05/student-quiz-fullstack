import api from './api';
import type {
  GroupRole,
  StudyGroupDetail,
  StudyGroupLeaderboardEntry,
  StudyGroupMember,
  StudyGroupQuiz,
  StudyGroupSummary,
} from '../types';

export const groupService = {
  getMyGroups: async (): Promise<StudyGroupSummary[]> => {
    const { data } = await api.get('/groups');
    return data;
  },

  createGroup: async (name: string, description: string): Promise<StudyGroupSummary> => {
    const { data } = await api.post('/groups', { name, description });
    return data;
  },

  joinGroup: async (inviteCode: string): Promise<StudyGroupSummary> => {
    const { data } = await api.post('/groups/join', { inviteCode });
    return data;
  },

  getGroup: async (groupId: number): Promise<StudyGroupDetail> => {
    const { data } = await api.get(`/groups/${groupId}`);
    return data;
  },

  getMembers: async (groupId: number): Promise<StudyGroupMember[]> => {
    const { data } = await api.get(`/groups/${groupId}/members`);
    return data;
  },

  approveMember: async (groupId: number, membershipId: number): Promise<StudyGroupMember> => {
    const { data } = await api.patch(`/groups/${groupId}/members/${membershipId}/approve`);
    return data;
  },

  removeMember: async (groupId: number, membershipId: number): Promise<void> => {
    await api.delete(`/groups/${groupId}/members/${membershipId}`);
  },

  updateMemberRole: async (
    groupId: number,
    membershipId: number,
    role: Exclude<GroupRole, 'OWNER'>,
  ): Promise<StudyGroupMember> => {
    const { data } = await api.patch(`/groups/${groupId}/members/${membershipId}/role`, { role });
    return data;
  },

  regenerateInviteCode: async (groupId: number): Promise<string> => {
    const { data } = await api.post(`/groups/${groupId}/invite-code/regenerate`);
    return data.inviteCode;
  },

  shareQuiz: async (groupId: number, quizId: number): Promise<StudyGroupQuiz> => {
    const { data } = await api.post(`/groups/${groupId}/quizzes`, { quizId });
    return data;
  },

  removeQuiz: async (groupId: number, assignmentId: number): Promise<void> => {
    await api.delete(`/groups/${groupId}/quizzes/${assignmentId}`);
  },

  getLeaderboard: async (groupId: number): Promise<StudyGroupLeaderboardEntry[]> => {
    const { data } = await api.get(`/groups/${groupId}/leaderboard`);
    return data;
  },
};
