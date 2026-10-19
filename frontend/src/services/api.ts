import axios from 'axios';
import {
  EventInfo,
  Announcement,
  Round,
  Question,
  AdminQuestion,
  Participant,
  ParticipantSessionResponse,
  RulesVersion,
  StartAttemptResponse,
  SaveAnswerResponse,
  SubmitAttemptResponse,
  AttemptStatus,
  ViolationResponse,
  RoundLeaderboard,
  Appeal,
  DashboardStats,
  AdminLoginResponse,
} from '../types';

const apiBase = import.meta.env.VITE_API_BASE_URL
  ? `${(import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '')}/api/v1`
  : '/api/v1';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin_token');
  const participantToken = localStorage.getItem('participant_token');

  // If request is for admin endpoints, use admin token
  if (config.url?.startsWith('/admin') || config.url?.startsWith('/auth/admin/change-password') || config.url?.startsWith('/auth/admin/logout')) {
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else if (participantToken) {
    config.headers.Authorization = `Bearer ${participantToken}`;
  }
  return config;
});

// ─── Public API ───
export const getPublicEvent = async (): Promise<EventInfo> => {
  const res = await api.get<EventInfo>('/public/event');
  return res.data;
};

export const getPublicAnnouncements = async (): Promise<Announcement[]> => {
  const res = await api.get<Announcement[]>('/public/announcements');
  return res.data;
};

export const getPublicRounds = async (): Promise<Round[]> => {
  const res = await api.get<Round[]>('/public/rounds');
  return res.data;
};

export const getPublicLeaderboard = async (roundId: string): Promise<RoundLeaderboard> => {
  const res = await api.get<RoundLeaderboard>(`/public/leaderboard/${roundId}`);
  return res.data;
};

export interface ParticipantEntryPayload {
  usn: string;
  name?: string;
  email?: string;
  department?: string;
  college_name?: string;
}

export const participantEntry = async (
  payload: string | ParticipantEntryPayload
): Promise<ParticipantSessionResponse> => {
  const body = typeof payload === 'string' ? { usn: payload } : payload;
  const res = await api.post<ParticipantSessionResponse>('/participant/entry', body);
  return res.data;
};

export const getParticipantMe = async (): Promise<Participant> => {
  const res = await api.get<Participant>('/participant/me');
  return res.data;
};

export const getCurrentRules = async (): Promise<RulesVersion> => {
  const res = await api.get<RulesVersion>('/participant/rules/current');
  return res.data;
};

export const getPublicRules = async (): Promise<RulesVersion> => {
  const res = await api.get<RulesVersion>('/public/rules');
  return res.data;
};

export const recordConsent = async (rulesVersionId: string): Promise<{ success: boolean; consented_at: string; rules_version: string }> => {
  const res = await api.post('/participant/consent', { rules_version_id: rulesVersionId, accepted: true });
  return res.data;
};

export const submitAppeal = async (subject: string, description: string, attemptId?: string): Promise<Appeal> => {
  const res = await api.post<Appeal>('/participant/appeals', { subject, description, attempt_id: attemptId });
  return res.data;
};

export const getMyAppeals = async (): Promise<Appeal[]> => {
  const res = await api.get<Appeal[]>('/participant/appeals');
  return res.data;
};

// ─── Quiz Engine API ───
export const getParticipantRounds = async (): Promise<Round[]> => {
  const res = await api.get<Round[]>('/quiz/rounds');
  return res.data;
};

export const getParticipantRound = async (roundId: string): Promise<Round> => {
  const res = await api.get<Round>(`/quiz/rounds/${roundId}`);
  return res.data;
};

export const startAttempt = async (roundId: string): Promise<StartAttemptResponse> => {
  const res = await api.post<StartAttemptResponse>(`/quiz/rounds/${roundId}/start`);
  return res.data;
};

export const saveAnswer = async (
  attemptId: string,
  questionId: string,
  selectedOptionId: string | null
): Promise<SaveAnswerResponse> => {
  const res = await api.post<SaveAnswerResponse>(`/quiz/attempts/${attemptId}/save`, {
    question_id: questionId,
    selected_option_id: selectedOptionId,
    client_timestamp: new Date().toISOString(),
  });
  return res.data;
};

export const getAttemptAnswers = async (attemptId: string): Promise<{ attempt_id: string; answers: Record<string, string> }> => {
  const res = await api.get(`/quiz/attempts/${attemptId}/answers`);
  return res.data;
};

export const submitAttempt = async (attemptId: string): Promise<SubmitAttemptResponse> => {
  const res = await api.post<SubmitAttemptResponse>(`/quiz/attempts/${attemptId}/submit`);
  return res.data;
};

export const getAttemptStatus = async (attemptId: string): Promise<AttemptStatus> => {
  const res = await api.get<AttemptStatus>(`/quiz/attempts/${attemptId}/status`);
  return res.data;
};

export const reportViolation = async (
  attemptId: string,
  violationType: 'fullscreen_exit' | 'tab_switch' | 'window_blur' | 'devtools_opened' | 'copy_paste_attempt'
): Promise<ViolationResponse> => {
  const res = await api.post<ViolationResponse>(`/quiz/attempts/${attemptId}/violation`, {
    attempt_id: attemptId,
    violation_type: violationType,
    detected_at: new Date().toISOString(),
  });
  return res.data;
};

// ─── Admin API ───
export const supabaseAdminVerify = async (email: string, accessToken: string): Promise<AdminLoginResponse> => {
  const res = await api.post<AdminLoginResponse>('/auth/admin/supabase-verify', {
    email,
    access_token: accessToken,
  });
  return res.data;
};

export const adminLogin = async (adminId: string, password: string): Promise<AdminLoginResponse> => {
  const res = await api.post<AdminLoginResponse>('/auth/admin/login', { admin_id: adminId, password });
  return res.data;
};

export const adminLogout = async (): Promise<{ message: string }> => {
  const res = await api.post('/auth/admin/logout');
  return res.data;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const res = await api.post('/auth/admin/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return res.data;
};

export const getAdminDashboard = async (): Promise<DashboardStats> => {
  const res = await api.get<DashboardStats>('/admin/dashboard');
  return res.data;
};

export const getAdminEvent = async (): Promise<EventInfo> => {
  const res = await api.get<EventInfo>('/admin/event');
  return res.data;
};

export const updateAdminEvent = async (data: Partial<EventInfo>): Promise<EventInfo> => {
  const res = await api.put<EventInfo>('/admin/event', data);
  return res.data;
};

export const getAdminRounds = async (): Promise<Round[]> => {
  const res = await api.get<Round[]>('/admin/rounds');
  return res.data;
};

export const updateAdminRound = async (id: string, data: Partial<Round>): Promise<Round> => {
  const res = await api.put<Round>(`/admin/rounds/${id}`, data);
  return res.data;
};

export const openRound = async (id: string, resetAttempts = false): Promise<{ message: string }> => {
  const res = await api.post(`/admin/rounds/${id}/open`, null, { params: { reset_attempts: resetAttempts } });
  return res.data;
};

export const relaunchRound = async (id: string, resetAttempts = true): Promise<{ message: string }> => {
  const res = await api.post(`/admin/rounds/${id}/relaunch`, null, { params: { reset_attempts: resetAttempts } });
  return res.data;
};

export const resetRoundAttempts = async (id: string): Promise<{ message: string }> => {
  const res = await api.post(`/admin/rounds/${id}/reset-attempts`);
  return res.data;
};

export const closeRound = async (id: string): Promise<{ message: string }> => {
  const res = await api.post(`/admin/rounds/${id}/close`);
  return res.data;
};

export const pauseRound = async (id: string): Promise<{ message: string }> => {
  const res = await api.post(`/admin/rounds/${id}/pause`);
  return res.data;
};

export const publishRoundResults = async (id: string): Promise<{ message: string }> => {
  const res = await api.post(`/admin/rounds/${id}/publish-results`);
  return res.data;
};

export const getAdminParticipants = async (
  page = 1,
  pageSize = 50,
  search = '',
  isEligible?: boolean
): Promise<{ items: Participant[]; total: number; page: number; page_size: number; pages: number }> => {
  const params: Record<string, any> = { page, page_size: pageSize };
  if (search) params.search = search;
  if (isEligible !== undefined) params.is_eligible = isEligible;
  const res = await api.get('/admin/participants', { params });
  return res.data;
};

export const importParticipantsCSV = async (file: File): Promise<{ imported: number; updated: number; errors: string[]; total_processed: number }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/admin/participants/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateParticipantEligibility = async (
  id: string,
  isEligible: boolean,
  reason?: string
): Promise<{ message: string }> => {
  const res = await api.put(`/admin/participants/${id}/eligibility`, {
    is_eligible: isEligible,
    reason,
  });
  return res.data;
};

export const deleteParticipant = async (id: string): Promise<{ message: string }> => {
  const res = await api.delete(`/admin/participants/${id}`);
  return res.data;
};

export const getAdminQuestions = async (roundId?: string, topic?: string, search?: string): Promise<AdminQuestion[]> => {
  const params: Record<string, any> = {};
  if (roundId) params.round_id = roundId;
  if (topic) params.topic = topic;
  if (search) params.search = search;
  const res = await api.get<AdminQuestion[]>('/admin/questions', { params });
  return res.data;
};

export const createQuestion = async (data: any): Promise<AdminQuestion> => {
  const res = await api.post<AdminQuestion>('/admin/questions', data);
  return res.data;
};

export const updateQuestion = async (id: string, data: any): Promise<AdminQuestion> => {
  const res = await api.put<AdminQuestion>(`/admin/questions/${id}`, data);
  return res.data;
};

export const deleteQuestion = async (id: string): Promise<{ message: string }> => {
  const res = await api.delete(`/admin/questions/${id}`);
  return res.data;
};

export const getAdminViolations = async (): Promise<any> => {
  const res = await api.get('/admin/violations');
  return res.data;
};

export const clearViolations = async (): Promise<{ message: string }> => {
  const res = await api.delete('/admin/violations');
  return res.data;
};

export const resetTestData = async (): Promise<{ message: string }> => {
  const res = await api.post('/admin/reset-test-data');
  return res.data;
};

export const getAdminAuditLogs = async (limit = 100): Promise<any[]> => {
  const res = await api.get('/admin/audit-logs', { params: { limit } });
  return res.data;
};

export const getAdminAppeals = async (): Promise<Appeal[]> => {
  const res = await api.get<Appeal[]>('/admin/appeals');
  return res.data;
};

export const respondAppeal = async (id: string, status: string, adminResponse: string): Promise<Appeal> => {
  const res = await api.put<Appeal>(`/admin/appeals/${id}`, { status, admin_response: adminResponse });
  return res.data;
};

export const createAnnouncement = async (title: string, body: string, isPinned = false): Promise<Announcement> => {
  const res = await api.post<Announcement>('/admin/announcements', { title, body, is_pinned: isPinned, is_published: true });
  return res.data;
};

export default api;
