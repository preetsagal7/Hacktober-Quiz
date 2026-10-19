"""
Pydantic v2 schemas for all API request/response models.
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator
import re


# ─── Shared ───

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


# ─── Auth ───

class AdminLoginRequest(BaseModel):
    admin_id: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=128)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool
    admin_id: str
    display_name: Optional[str]


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


# ─── Participant ───

class ParticipantEntryRequest(BaseModel):
    usn: str = Field(..., min_length=3, max_length=20)
    name: Optional[str] = Field(None, max_length=200)
    department: Optional[str] = Field(None, max_length=200)
    college_name: Optional[str] = Field(None, max_length=300)

    @field_validator("usn")
    @classmethod
    def normalize_usn(cls, v: str) -> str:
        return v.strip().upper()


class ParticipantScoreInfo(BaseModel):
    round_id: str
    round_number: int
    round_name: str
    score: float
    status: str
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    submitted_at: Optional[datetime] = None


class ParticipantOut(BaseModel):
    id: str
    usn: str
    name: Optional[str] = None
    department: Optional[str] = None
    college_name: Optional[str] = None
    semester: Optional[str] = None
    is_eligible: bool
    is_verified: bool
    session_token: Optional[str] = None
    scores: List[ParticipantScoreInfo] = []
    total_score: float = 0.0

    model_config = {"from_attributes": True}


class ParticipantEligibilityUpdate(BaseModel):
    is_eligible: bool
    reason: Optional[str] = None


class ParticipantSessionResponse(BaseModel):
    session_token: str
    participant: ParticipantOut
    needs_rules_acceptance: bool
    current_rules_version: Optional[str]


class ParticipantImportRow(BaseModel):
    usn: str
    name: Optional[str] = None
    roll_number: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    college_name: Optional[str] = None
    semester: Optional[str] = None


class ParticipantImportResult(BaseModel):
    imported: int
    updated: int
    errors: List[str]
    total_processed: int


class ParticipantListResponse(BaseModel):
    items: List[ParticipantOut]
    total: int
    page: int
    page_size: int
    pages: int


# ─── Consent ───

class ConsentRequest(BaseModel):
    rules_version_id: str
    accepted: bool = True


class ConsentResponse(BaseModel):
    success: bool
    consented_at: datetime
    rules_version: str


# ─── Rules ───

class RulesVersionOut(BaseModel):
    id: str
    version: str
    rules_html: str
    is_current: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RulesVersionCreate(BaseModel):
    version: str = Field(..., min_length=1, max_length=20)
    rules_html: str = Field(..., min_length=10)
    make_current: bool = True


# ─── Event ───

class EventOut(BaseModel):
    id: str
    name: str
    tagline: Optional[str]
    description: Optional[str]
    college_name: Optional[str]
    department_name: Optional[str]
    event_date: Optional[datetime]
    timezone: str
    venue: Optional[str]
    logo_url: Optional[str]
    college_logo_url: Optional[str]
    registration_open: bool
    competition_mode: str
    is_active: bool

    model_config = {"from_attributes": True}


class EventUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    college_name: Optional[str] = None
    department_name: Optional[str] = None
    event_date: Optional[datetime] = None
    timezone: Optional[str] = None
    venue: Optional[str] = None
    logo_url: Optional[str] = None
    college_logo_url: Optional[str] = None
    registration_open: Optional[bool] = None
    competition_mode: Optional[str] = None


# ─── Round ───

class RoundOut(BaseModel):
    id: str
    round_number: int
    name: str
    description: Optional[str]
    duration_minutes: int
    question_count: int
    points_correct: float
    points_incorrect: float
    points_unanswered: float
    max_score: float
    qualification_count: Optional[int]
    qualification_percentage: Optional[float]
    status: str
    violation_policy: str
    fullscreen_required: bool
    randomize_questions: bool
    randomize_options: bool
    started_at: Optional[datetime]
    closed_at: Optional[datetime]
    results_published_at: Optional[datetime]
    my_attempt_status: Optional[str] = None
    my_score: Optional[float] = None

    model_config = {"from_attributes": True}


class RoundUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    question_count: Optional[int] = None
    points_correct: Optional[float] = None
    points_incorrect: Optional[float] = None
    points_unanswered: Optional[float] = None
    max_score: Optional[float] = None
    qualification_count: Optional[int] = None
    qualification_percentage: Optional[float] = None
    violation_policy: Optional[str] = None
    fullscreen_required: Optional[bool] = None
    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None


# ─── Questions ───

class AnswerOptionIn(BaseModel):
    option_label: str = Field(..., max_length=5)
    option_text: str
    is_correct: bool = False
    display_order: int = 0


class AnswerOptionOut(BaseModel):
    id: str
    option_label: str
    option_text: str
    display_order: int
    # is_correct intentionally NOT included for participant-facing responses

    model_config = {"from_attributes": True}


class AnswerOptionAdminOut(AnswerOptionOut):
    is_correct: bool

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    question_text: str
    topic: Optional[str] = None
    difficulty: str = "medium"
    point_value: float
    explanation: Optional[str] = None
    image_url: Optional[str] = None
    code_snippet: Optional[str] = None
    options: List[AnswerOptionIn] = Field(..., min_length=2, max_length=6)


class QuestionOut(BaseModel):
    id: str
    question_text: str
    topic: Optional[str]
    difficulty: str
    point_value: float
    code_snippet: Optional[str]
    image_url: Optional[str]
    options: List[AnswerOptionOut]
    display_order: Optional[int] = None  # randomized order position

    model_config = {"from_attributes": True}


class QuestionAdminOut(BaseModel):
    id: str
    round_id: Optional[str] = None
    round_number: Optional[int] = None
    round_name: Optional[str] = None
    question_text: str
    topic: Optional[str]
    difficulty: str
    point_value: float
    explanation: Optional[str]
    image_url: Optional[str]
    code_snippet: Optional[str]
    is_active: bool
    version: int
    options: List[AnswerOptionAdminOut]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuestionUpdate(BaseModel):
    round_id: Optional[str] = None
    question_text: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    point_value: Optional[float] = None
    explanation: Optional[str] = None
    image_url: Optional[str] = None
    code_snippet: Optional[str] = None
    options: Optional[List[AnswerOptionIn]] = None
    is_active: Optional[bool] = None


# ─── Attempt / Quiz ───

class StartAttemptResponse(BaseModel):
    attempt_id: str
    round_id: str
    deadline_at: datetime
    questions: List[QuestionOut]
    server_time: datetime


class SaveAnswerRequest(BaseModel):
    question_id: str
    selected_option_id: Optional[str] = None
    client_timestamp: Optional[datetime] = None


class SaveAnswerResponse(BaseModel):
    saved: bool
    question_id: str
    server_timestamp: datetime


class SubmitAttemptResponse(BaseModel):
    attempt_id: str
    status: str
    score: Optional[float] = None
    correct_count: Optional[int] = None
    incorrect_count: Optional[int] = None
    unanswered_count: Optional[int] = None
    submitted_at: datetime
    message: str


class AttemptStatusResponse(BaseModel):
    attempt_id: str
    status: str
    deadline_at: Optional[datetime]
    server_time: datetime
    seconds_remaining: Optional[float]
    answers_saved: int


# ─── Violation ───

class ViolationReport(BaseModel):
    violation_type: str
    detected_at: Optional[datetime] = None
    attempt_id: str


class ViolationResponse(BaseModel):
    recorded: bool
    resulted_in_termination: bool
    message: str


# ─── Leaderboard / Results ───

class LeaderboardEntry(BaseModel):
    rank: int
    participant_id: str
    usn: str
    name: Optional[str]
    score: float
    correct_count: int
    is_qualified: bool


class RoundLeaderboard(BaseModel):
    round_id: str
    round_number: int
    round_name: str
    is_published: bool
    entries: List[LeaderboardEntry]


# ─── Announcements ───

class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    is_pinned: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    body: str = Field(..., min_length=1)
    is_pinned: bool = False
    is_published: bool = True


# ─── Appeals ───

class AppealCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1, max_length=5000)
    attempt_id: Optional[str] = None


class AppealResolve(BaseModel):
    status: str = "resolved"
    admin_response: Optional[str] = None
    response: Optional[str] = None


class AppealOut(BaseModel):
    id: str
    subject: str
    description: str
    status: str
    admin_response: Optional[str] = None
    participant_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Admin Dashboard Stats ───

class DashboardStats(BaseModel):
    total_eligible_participants: int
    total_verified_participants: int
    active_attempts: int
    submitted_attempts: int
    terminated_attempts: int
    round_statuses: List[dict]
    recent_violations: int
    total_consents: int
