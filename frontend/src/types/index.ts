export interface Quiz {
  id: number;
  title: string;
  category: string;
  description?: string;
  questionCount: number;
  playCount: number;
  status?: string;
  rejectReason?: string;
  appealMessage?: string;
  author: {
    id?: number;
    name: string;
    avatar?: string;
  };
  questions?: Question[];
}

export interface Question {
  id: number;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface AiOptionAnalysis {
  optionIndex: number;
  optionText: string;
  correct: boolean;
  selected: boolean;
  explanation: string;
}

export interface AiQuestionExplanation {
  overview: string;
  steps: string[];
  optionAnalyses: AiOptionAnalysis[];
  studyTip: string;
}

export interface AiWeaknessInsight {
  topic: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AiWeaknessAnalysis {
  strengths: string[];
  weaknesses: AiWeaknessInsight[];
  recommendations: string[];
  reviewQuestions: Question[];
  analyzedAttempts: number;
  analyzedWrongAnswers: number;
  insufficientData: boolean;
  generatedAt: string;
}

export interface ForumPost {
  id: number;
  title: string;
  content: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
  };
  likeCount: number;
  commentCount: number;
  createdAt: string;
  status?: string;
  rejectReason?: string;
  liked?: boolean;
  tags?: string[];
  appealMessage?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachments?: ForumAttachment[];
  linkUrl?: string;
}

export interface ForumAttachment {
  id?: number;
  url: string;
  name: string;
  type: string;
}

export interface ForumComment {
  id: number;
  content: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  likeCount: number;
  parentId?: number;
  replyToAuthorName?: string;
  replies?: ForumComment[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  interests?: string;
  bio?: string;
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: string;
}

export interface AchievementBadge {
  userBadgeId: number;
  badgeId: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  seen: boolean;
}

export type BattleStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface BattleParticipant {
  id: number;
  userId: number;
  name: string;
  avatar?: string;
  score: number;
  isHost: boolean;
}

export interface BattleQuestion {
  index: number;
  totalQuestions: number;
  content: string;
  options: string[];
  startedAt: string;
  deadline: string;
}

export interface BattleRoom {
  id: number;
  roomCode: string;
  quizId: number;
  quizTitle: string;
  hostUserId: number;
  status: BattleStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  createdAt: string;
  currentQuestion?: BattleQuestion;
  participants: BattleParticipant[];
}

export interface BattleLeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatar?: string;
  score: number;
  isHost: boolean;
}

export type BattleEventType = 'ROOM_UPDATED' | 'QUESTION' | 'LEADERBOARD' | 'FINISHED';

export interface BattleEvent {
  type: BattleEventType;
  room: BattleRoom;
  correctAnswer?: number;
  explanation?: string;
  leaderboard?: BattleLeaderboardEntry[];
  nextQuestionAt?: string;
}

export type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type GroupMemberStatus = 'PENDING' | 'APPROVED';

export interface StudyGroupSummary {
  id: number;
  name: string;
  description?: string;
  inviteCode?: string;
  owner: { id: number; name: string; avatar?: string };
  currentUserRole: GroupRole;
  membershipStatus: GroupMemberStatus;
  canManage: boolean;
  memberCount: number;
  quizCount: number;
  createdAt: string;
}

export interface StudyGroupMember {
  membershipId: number;
  userId: number;
  name: string;
  avatar?: string;
  role: GroupRole;
  status: GroupMemberStatus;
  joinedAt: string;
}

export interface StudyGroupQuiz {
  assignmentId: number;
  quizId: number;
  title: string;
  category: string;
  questionCount: number;
  authorName: string;
  assignedAt: string;
  assignedByName: string;
  completed: boolean;
  bestScore?: number;
  totalQuestions: number;
}

export interface StudyGroupLeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatar?: string;
  role: GroupRole;
  completedQuizzes: number;
  totalScore: number;
}

export interface StudyGroupDetail {
  group: StudyGroupSummary;
  quizzes: StudyGroupQuiz[];
  leaderboard: StudyGroupLeaderboardEntry[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateQuizRequest {
  title: string;
  category: string;
  description?: string;
  questionCount: number;
  questions?: {
    content: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
}

export interface QuizComment {
  id: number;
  content: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  parentId?: number;
  replyToAuthorName?: string;
  replies?: QuizComment[];
}

export interface Notification {
  id: number;
  type: 'LIKE' | 'COMMENT' | 'REPLY' | 'QUIZ_COMMENT' | 'QUIZ_REPLY' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'BADGE_UNLOCKED';
  postId?: number;
  quizId?: number;
  message: string;
  isRead: boolean; // Map to the backend name (mapped from Boolean isRead / @Column name="is_read")
  createdAt: string;
  actor: {
    id: number;
    name: string;
    avatar?: string;
  };
}

export interface FriendshipStatus {
  status: 'SELF' | 'NONE' | 'ACCEPTED' | 'PENDING_SENT' | 'PENDING_RECEIVED';
}

export interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  friend: {
    id: number;
    name: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageSenderId: number;
  lastMessageTime: string;
  unreadCount: number;
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  quizTitle: string;
  quizCategory: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}
