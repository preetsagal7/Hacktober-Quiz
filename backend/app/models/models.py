"""
All SQLAlchemy ORM models for Hacktober 2026 CyberQuiz Platform.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, UniqueConstraint, Index, JSON
)
from sqlalchemy.orm import relationship, mapped_column, Mapped
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


# ─────────────────────────── Enums ───────────────────────────

class RoundStatus(str, PyEnum):
    PENDING = "pending"
    OPEN = "open"
    PAUSED = "paused"
    CLOSED = "closed"
    RESULTS_PUBLISHED = "results_published"


class AttemptStatus(str, PyEnum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    TERMINATED = "terminated"
    TIMED_OUT = "timed_out"


class ViolationType(str, PyEnum):
    FULLSCREEN_EXIT = "fullscreen_exit"
    TAB_VISIBILITY_LOSS = "tab_visibility_loss"
    WINDOW_BLUR = "window_blur"


class ViolationPolicy(str, PyEnum):
    STRICT = "strict"
    WARNING = "warning"
    REVIEW = "review"


class CertificateCategory(str, PyEnum):
    WINNER = "winner"
    RUNNER_UP = "runner_up"
    SECOND_RUNNER_UP = "second_runner_up"
    FINALIST = "finalist"
    PARTICIPATION = "participation"


class AppealStatus(str, PyEnum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"


# ─────────────────────────── Admin Users ───────────────────────────

class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    admin_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="admin")


# ─────────────────────────── Events ───────────────────────────

class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    tagline: Mapped[Optional[str]] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text)
    college_name: Mapped[Optional[str]] = mapped_column(String(300))
    department_name: Mapped[Optional[str]] = mapped_column(String(300))
    event_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
    venue: Mapped[Optional[str]] = mapped_column(String(300))
    logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    college_logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    registration_open: Mapped[bool] = mapped_column(Boolean, default=True)
    competition_mode: Mapped[str] = mapped_column(String(20), default="individual")  # individual | team
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    rounds: Mapped[List["Round"]] = relationship("Round", back_populates="event", order_by="Round.round_number")
    announcements: Mapped[List["Announcement"]] = relationship("Announcement", back_populates="event")
    rules_versions: Mapped[List["RulesVersion"]] = relationship("RulesVersion", back_populates="event")


# ─────────────────────────── Rules Versions ───────────────────────────

class RulesVersion(Base):
    __tablename__ = "rules_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    rules_html: Mapped[str] = mapped_column(Text, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    event: Mapped["Event"] = relationship("Event", back_populates="rules_versions")
    consents: Mapped[List["ParticipantConsent"]] = relationship("ParticipantConsent", back_populates="rules_version")


# ─────────────────────────── Participants ───────────────────────────

class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    usn: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    roll_number: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    name: Mapped[Optional[str]] = mapped_column(String(200))
    email: Mapped[Optional[str]] = mapped_column(String(200))
    department: Mapped[Optional[str]] = mapped_column(String(200))
    semester: Mapped[Optional[str]] = mapped_column(String(10))
    is_eligible: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    session_token: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    ineligibility_reason: Mapped[Optional[str]] = mapped_column(String(500))

    __table_args__ = (
        UniqueConstraint("usn", name="uq_participant_usn"),
        Index("ix_participant_usn_lower", "usn"),
    )

    consents: Mapped[List["ParticipantConsent"]] = relationship("ParticipantConsent", back_populates="participant")
    attempts: Mapped[List["Attempt"]] = relationship("Attempt", back_populates="participant")
    violations: Mapped[List["Violation"]] = relationship("Violation", back_populates="participant")
    certificates: Mapped[List["Certificate"]] = relationship("Certificate", back_populates="participant")
    appeals: Mapped[List["Appeal"]] = relationship("Appeal", back_populates="participant")


class ParticipantConsent(Base):
    __tablename__ = "participant_consents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    participant_id: Mapped[str] = mapped_column(String(36), ForeignKey("participants.id"), nullable=False)
    rules_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("rules_versions.id"), nullable=False)
    consented_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))

    __table_args__ = (
        UniqueConstraint("participant_id", "rules_version_id", name="uq_consent_participant_version"),
    )

    participant: Mapped["Participant"] = relationship("Participant", back_populates="consents")
    rules_version: Mapped["RulesVersion"] = relationship("RulesVersion", back_populates="consents")


# ─────────────────────────── Rounds ───────────────────────────

class Round(Base):
    __tablename__ = "rounds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    points_correct: Mapped[float] = mapped_column(Float, nullable=False, default=4.0)
    points_incorrect: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    points_unanswered: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
    qualification_count: Mapped[Optional[int]] = mapped_column(Integer)
    qualification_percentage: Mapped[Optional[float]] = mapped_column(Float)
    status: Mapped[RoundStatus] = mapped_column(Enum(RoundStatus), default=RoundStatus.PENDING)
    violation_policy: Mapped[ViolationPolicy] = mapped_column(Enum(ViolationPolicy), default=ViolationPolicy.STRICT)
    fullscreen_required: Mapped[bool] = mapped_column(Boolean, default=True)
    randomize_questions: Mapped[bool] = mapped_column(Boolean, default=True)
    randomize_options: Mapped[bool] = mapped_column(Boolean, default=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    results_published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        UniqueConstraint("event_id", "round_number", name="uq_round_event_number"),
    )

    event: Mapped["Event"] = relationship("Event", back_populates="rounds")
    questions: Mapped[List["Question"]] = relationship("Question", back_populates="round")
    attempts: Mapped[List["Attempt"]] = relationship("Attempt", back_populates="round")
    qualifications: Mapped[List["Qualification"]] = relationship("Qualification", back_populates="round")


# ─────────────────────────── Questions ───────────────────────────

class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    round_id: Mapped[str] = mapped_column(String(36), ForeignKey("rounds.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[Optional[str]] = mapped_column(String(100))
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")  # easy | medium | hard
    point_value: Mapped[float] = mapped_column(Float, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    code_snippet: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    round: Mapped["Round"] = relationship("Round", back_populates="questions")
    options: Mapped[List["AnswerOption"]] = relationship(
        "AnswerOption", back_populates="question", cascade="all, delete-orphan"
    )
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="question")


class AnswerOption(Base):
    __tablename__ = "answer_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    option_label: Mapped[str] = mapped_column(String(5), nullable=False)  # A, B, C, D
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["Question"] = relationship("Question", back_populates="options")


# ─────────────────────────── Attempts ───────────────────────────

class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    participant_id: Mapped[str] = mapped_column(String(36), ForeignKey("participants.id"), nullable=False)
    round_id: Mapped[str] = mapped_column(String(36), ForeignKey("rounds.id"), nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(Enum(AttemptStatus), default=AttemptStatus.IN_PROGRESS)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    deadline_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    score: Mapped[Optional[float]] = mapped_column(Float)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    incorrect_count: Mapped[int] = mapped_column(Integer, default=0)
    unanswered_count: Mapped[int] = mapped_column(Integer, default=0)
    termination_reason: Mapped[Optional[str]] = mapped_column(String(200))
    question_order: Mapped[Optional[str]] = mapped_column(Text)  # JSON: ordered question IDs
    option_order_map: Mapped[Optional[str]] = mapped_column(Text)  # JSON: {q_id: [opt_id_order]}
    is_exception_restart: Mapped[bool] = mapped_column(Boolean, default=False)
    exception_reason: Mapped[Optional[str]] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint("participant_id", "round_id", name="uq_attempt_participant_round"),
        Index("ix_attempt_participant", "participant_id"),
        Index("ix_attempt_round", "round_id"),
        Index("ix_attempt_status", "status"),
    )

    participant: Mapped["Participant"] = relationship("Participant", back_populates="attempts")
    round: Mapped["Round"] = relationship("Round", back_populates="attempts")
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="attempt", cascade="all, delete-orphan")
    violations: Mapped[List["Violation"]] = relationship("Violation", back_populates="attempt")


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id"), nullable=False)
    selected_option_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("answer_options.id"))
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean)
    points_awarded: Mapped[Optional[float]] = mapped_column(Float)
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    client_saved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),
        Index("ix_answer_attempt", "attempt_id"),
    )

    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="answers")
    question: Mapped["Question"] = relationship("Question", back_populates="answers")


# ─────────────────────────── Violations ───────────────────────────

class Violation(Base):
    __tablename__ = "violations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("attempts.id"), nullable=False)
    participant_id: Mapped[str] = mapped_column(String(36), ForeignKey("participants.id"), nullable=False)
    violation_type: Mapped[ViolationType] = mapped_column(Enum(ViolationType), nullable=False)
    detected_at_client: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    received_at_server: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    policy_applied: Mapped[ViolationPolicy] = mapped_column(Enum(ViolationPolicy))
    resulted_in_termination: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="violations")
    participant: Mapped["Participant"] = relationship("Participant", back_populates="violations")


# ─────────────────────────── Qualifications ───────────────────────────

class Qualification(Base):
    __tablename__ = "qualifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    participant_id: Mapped[str] = mapped_column(String(36), ForeignKey("participants.id"), nullable=False)
    round_id: Mapped[str] = mapped_column(String(36), ForeignKey("rounds.id"), nullable=False)
    rank: Mapped[Optional[int]] = mapped_column(Integer)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    is_qualified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_disqualified: Mapped[bool] = mapped_column(Boolean, default=False)
    disqualification_reason: Mapped[Optional[str]] = mapped_column(Text)
    qualified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        UniqueConstraint("participant_id", "round_id", name="uq_qualification_participant_round"),
        Index("ix_qualification_round", "round_id"),
    )

    participant: Mapped["Participant"] = relationship("Participant")
    round: Mapped["Round"] = relationship("Round", back_populates="qualifications")


# ─────────────────────────── Announcements ───────────────────────────

class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    event: Mapped["Event"] = relationship("Event", back_populates="announcements")


# ─────────────────────────── Appeals ───────────────────────────

class Appeal(Base):
    __tablename__ = "appeals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    participant_id: Mapped[str] = mapped_column(String(36), ForeignKey("participants.id"), nullable=False)
    attempt_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("attempts.id"))
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AppealStatus] = mapped_column(Enum(AppealStatus), default=AppealStatus.PENDING)
    admin_response: Mapped[Optional[str]] = mapped_column(Text)
    resolved_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("admin_users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    participant: Mapped["Participant"] = relationship("Participant", back_populates="appeals")


# ─────────────────────────── Certificates ───────────────────────────

class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    participant_id: Mapped[str] = mapped_column(String(36), ForeignKey("participants.id"), nullable=False)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"), nullable=False)
    category: Mapped[CertificateCategory] = mapped_column(Enum(CertificateCategory))
    verification_code: Mapped[str] = mapped_column(String(36), unique=True, default=new_uuid)
    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_released: Mapped[bool] = mapped_column(Boolean, default=False)

    participant: Mapped["Participant"] = relationship("Participant", back_populates="certificates")


# ─────────────────────────── Audit Logs ───────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    admin_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("admin_users.id"))
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(100))
    resource_id: Mapped[Optional[str]] = mapped_column(String(36))
    details: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_audit_log_action", "action"),
        Index("ix_audit_log_created_at", "created_at"),
    )

    admin: Mapped[Optional["AdminUser"]] = relationship("AdminUser", back_populates="audit_logs")
