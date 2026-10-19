export interface EventInfo {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  college_name?: string;
  department_name?: string;
  event_date?: string;
  timezone: string;
  venue?: string;
  logo_url?: string;
  college_logo_url?: string;
  registration_open: boolean;
  competition_mode: string;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_published?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Round {
  id: string;
  round_number: number;
  name: string;
  description?: string;
  duration_minutes: number;
  question_count: number;
  points_correct: number;
  points_incorrect: number;
  points_unanswered: number;
  max_score: number;
  qualification_count?: number;
  qualification_percentage?: number;
  status: 'pending' | 'draft' | 'open' | 'paused' | 'closed' | 'results_published';
  violation_policy: 'strict' | 'warning' | 'review';
  fullscreen_required: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  started_at?: string;
  closed_at?: string;
  results_published_at?: string;
  my_attempt_status?: string;
  my_score?: number;
}

export interface AnswerOption {
  id: string;
  option_label: string;
  option_text: string;
  display_order: number;
  is_correct?: boolean; // Only present in admin views
}

export interface Question {
  id: string;
  question_text: string;
  topic?: string;
  difficulty: string;
  point_value: number;
  code_snippet?: string;
  image_url?: string;
  options: AnswerOption[];
  display_order?: number;
}

export interface AdminQuestion extends Question {
  round_id?: string;
  round_number?: number;
  round_name?: string;
  explanation?: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ParticipantScoreInfo {
  round_id: string;
  round_number: number;
  round_name: string;
  score: number;
  status: string;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  submitted_at?: string;
}

export interface Participant {
  id: string;
  usn: string;
  name?: string;
  email?: string;
  department?: string;
  college_name?: string;
  semester?: string;
  is_eligible: boolean;
  is_verified: boolean;
  session_token?: string;
  scores?: ParticipantScoreInfo[];
  total_score?: number;
}

export interface ParticipantSessionResponse {
  session_token: string;
  participant: Participant;
  needs_rules_acceptance: boolean;
  current_rules_version?: string;
}

export interface RulesVersion {
  id: string;
  version: string;
  rules_html: string;
  is_current: boolean;
  created_at: string;
}

export interface StartAttemptResponse {
  attempt_id: string;
  round_id: string;
  deadline_at: string;
  questions: Question[];
  server_time: string;
  saved_answers?: Record<string, string>;
}

export interface SaveAnswerResponse {
  saved: boolean;
  question_id: string;
  server_timestamp: string;
}

export interface SubmitAttemptResponse {
  attempt_id: string;
  status: string;
  score?: number;
  correct_count?: number;
  incorrect_count?: number;
  unanswered_count?: number;
  submitted_at: string;
  message: string;
}

export interface AttemptStatus {
  attempt_id: string;
  status: 'in_progress' | 'submitted' | 'timed_out' | 'terminated' | 'disqualified';
  deadline_at?: string;
  server_time: string;
  seconds_remaining?: number;
  answers_saved: number;
}

export interface ViolationResponse {
  recorded: boolean;
  resulted_in_termination: boolean;
  message: string;
}

export interface LeaderboardEntry {
  rank: number;
  participant_id: string;
  usn: string;
  name?: string;
  score: number;
  correct_count: number;
  is_qualified: boolean;
}

export interface RoundLeaderboard {
  round_id: string;
  round_number: number;
  round_name: string;
  is_published: boolean;
  entries: LeaderboardEntry[];
}

export interface Appeal {
  id: string;
  participant_id?: string;
  usn?: string;
  name?: string;
  subject: string;
  description: string;
  status: string;
  admin_response?: string;
  created_at: string;
}

export interface DashboardStats {
  total_eligible_participants: number;
  total_verified_participants: number;
  active_attempts: number;
  submitted_attempts: number;
  terminated_attempts: number;
  round_statuses: Array<{ id: string; number: number; name: string; status: string }>;
  recent_violations: number;
  total_consents: number;
}

export interface AdminUser {
  admin_id: string;
  display_name?: string;
  must_change_password: boolean;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  must_change_password: boolean;
  admin_id: string;
  display_name?: string;
}
