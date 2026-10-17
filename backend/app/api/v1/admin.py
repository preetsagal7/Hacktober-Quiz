"""
Admin dashboard — participant management, round control, question bank,
results publication, audit logs, appeals, certificates.
"""
import csv
import io
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, update, delete

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models import (
    AdminUser, Event, RulesVersion, Participant, ParticipantConsent,
    Round, Question, AnswerOption, Attempt, Answer, Violation,
    Qualification, Announcement, Appeal, Certificate, AuditLog,
    RoundStatus, AttemptStatus, AppealStatus, CertificateCategory
)
from app.schemas.schemas import (
    DashboardStats, EventOut, EventUpdate, RoundOut, RoundUpdate,
    QuestionCreate, QuestionUpdate, QuestionAdminOut, AnswerOptionAdminOut,
    ParticipantOut, ParticipantListResponse, ParticipantImportResult,
    RulesVersionOut, RulesVersionCreate, AnnouncementOut, AnnouncementCreate,
    MessageResponse, LeaderboardEntry, RoundLeaderboard,
    ParticipantScoreInfo, ParticipantEligibilityUpdate
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Dashboard Overview ───

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_p = await db.scalar(select(func.count(Participant.id)))
    eligible_p = await db.scalar(
        select(func.count(Participant.id)).where(Participant.is_eligible == True)
    )
    verified_p = await db.scalar(
        select(func.count(Participant.id)).where(Participant.is_verified == True)
    )
    active_a = await db.scalar(
        select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.IN_PROGRESS)
    )
    submitted_a = await db.scalar(
        select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.SUBMITTED)
    )
    terminated_a = await db.scalar(
        select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.TERMINATED)
    )
    recent_violations = await db.scalar(
        select(func.count(Violation.id)).where(
            Violation.received_at_server > datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        )
    )
    total_consents = await db.scalar(select(func.count(ParticipantConsent.id)))

    rounds_result = await db.execute(
        select(Round).order_by(Round.round_number)
    )
    rounds = rounds_result.scalars().all()
    round_statuses = [
        {"id": r.id, "number": r.round_number, "name": r.name, "status": r.status.value}
        for r in rounds
    ]

    return DashboardStats(
        total_eligible_participants=eligible_p or 0,
        total_verified_participants=verified_p or 0,
        active_attempts=active_a or 0,
        submitted_attempts=submitted_a or 0,
        terminated_attempts=terminated_a or 0,
        round_statuses=round_statuses,
        recent_violations=recent_violations or 0,
        total_consents=total_consents or 0,
    )


# ─── Event Management ───

@router.get("/event", response_model=EventOut)
async def get_event(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.is_active == True))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="No active event configured.")
    return EventOut.model_validate(event)


@router.put("/event", response_model=EventOut)
async def update_event(
    body: EventUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.is_active == True))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="No active event.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(event, field, value)
    await _audit(admin.id, "event_updated", "event", event.id, db)
    await db.commit()
    await db.refresh(event)
    return EventOut.model_validate(event)


# ─── Participant Management ───

@router.get("/participants", response_model=ParticipantListResponse)
async def list_participants(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    eligible_only: bool = Query(False),
):
    query = select(Participant)
    count_query = select(func.count(Participant.id))

    if search:
        like = f"%{search.upper()}%"
        from sqlalchemy import or_
        query = query.where(or_(Participant.usn.like(like), Participant.name.ilike(f"%{search}%")))
        count_query = count_query.where(or_(Participant.usn.like(like), Participant.name.ilike(f"%{search}%")))

    if eligible_only:
        query = query.where(Participant.is_eligible == True)
        count_query = count_query.where(Participant.is_eligible == True)

    total = await db.scalar(count_query) or 0
    pages = (total + page_size - 1) // page_size

    query = query.order_by(Participant.usn).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    participants = result.scalars().all()

    p_ids = [p.id for p in participants]
    attempts_map = {}
    if p_ids:
        att_res = await db.execute(
            select(Attempt, Round)
            .join(Round, Attempt.round_id == Round.id)
            .where(Attempt.participant_id.in_(p_ids))
            .order_by(Round.round_number)
        )
        for att, rnd in att_res.all():
            if att.participant_id not in attempts_map:
                attempts_map[att.participant_id] = []
            attempts_map[att.participant_id].append(
                ParticipantScoreInfo(
                    round_id=rnd.id,
                    round_number=rnd.round_number,
                    round_name=rnd.name,
                    score=att.score or 0.0,
                    status=att.status.value,
                    correct_count=att.correct_count or 0,
                    incorrect_count=att.incorrect_count or 0,
                    unanswered_count=att.unanswered_count or 0,
                    submitted_at=att.submitted_at,
                )
            )

    items = []
    for p in participants:
        p_scores = attempts_map.get(p.id, [])
        total_score = sum(s.score for s in p_scores)
        out = ParticipantOut.model_validate(p)
        out.scores = p_scores
        out.total_score = total_score
        items.append(out)

    return ParticipantListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.put("/participants/{participant_id}/eligibility", response_model=MessageResponse)
async def update_participant_eligibility(
    participant_id: str,
    body: ParticipantEligibilityUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle or update participant eligibility (revoking or restoring access)."""
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")

    participant.is_eligible = body.is_eligible
    participant.ineligibility_reason = body.reason if not body.is_eligible else None
    if not body.is_eligible:
        participant.session_token = None

    await _audit(admin.id, "participant_eligibility_updated", "participant", participant_id, db,
                 details=json.dumps({"is_eligible": body.is_eligible, "reason": body.reason}))
    await db.commit()
    return MessageResponse(
        message=f"Participant {participant.usn} eligibility updated to {'eligible' if body.is_eligible else 'revoked'}."
    )


@router.delete("/participants/{participant_id}", response_model=MessageResponse)
async def delete_participant(
    participant_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a participant and all their associated exam records."""
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")

    usn = participant.usn
    # Delete dependent records
    att_res = await db.execute(select(Attempt.id).where(Attempt.participant_id == participant_id))
    att_ids = att_res.scalars().all()
    if att_ids:
        await db.execute(delete(Answer).where(Answer.attempt_id.in_(att_ids)))
    await db.execute(delete(Violation).where(Violation.participant_id == participant_id))
    await db.execute(delete(Qualification).where(Qualification.participant_id == participant_id))
    await db.execute(delete(Appeal).where(Appeal.participant_id == participant_id))
    await db.execute(delete(Certificate).where(Certificate.participant_id == participant_id))
    await db.execute(delete(ParticipantConsent).where(ParticipantConsent.participant_id == participant_id))
    await db.execute(delete(Attempt).where(Attempt.participant_id == participant_id))
    await db.delete(participant)

    await _audit(admin.id, "participant_deleted", "participant", participant_id, db, details=json.dumps({"usn": usn}))
    await db.commit()
    return MessageResponse(message=f"Participant {usn} and all associated records deleted successfully.")


@router.post("/participants/import", response_model=ParticipantImportResult)
async def import_participants(
    file: UploadFile = File(...),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bulk import participants from CSV. No hard cap — processes all rows."""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    updated = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        usn = (row.get("usn") or row.get("USN") or "").strip().upper()
        if not usn:
            errors.append(f"Row {i}: missing USN")
            continue

        name = (row.get("name") or row.get("Name") or "").strip() or None
        roll = (row.get("roll_number") or row.get("Roll") or "").strip() or None
        email = (row.get("email") or row.get("Email") or "").strip() or None
        dept = (row.get("department") or row.get("Department") or "").strip() or None
        college = (row.get("college_name") or row.get("college") or row.get("College") or "").strip() or None
        sem = (row.get("semester") or row.get("Semester") or "").strip() or None

        try:
            existing_result = await db.execute(select(Participant).where(Participant.usn == usn))
            existing = existing_result.scalar_one_or_none()

            if existing:
                if name:
                    existing.name = name
                if roll:
                    existing.roll_number = roll
                if email:
                    existing.email = email
                if dept:
                    existing.department = dept
                if college:
                    existing.college_name = college
                if sem:
                    existing.semester = sem
                existing.is_eligible = True
                updated += 1
            else:
                p = Participant(
                    usn=usn, name=name, roll_number=roll, email=email,
                    department=dept, college_name=college, semester=sem, is_eligible=True,
                )
                db.add(p)
                imported += 1
        except Exception as e:
            errors.append(f"Row {i} ({usn}): {str(e)}")

    await _audit(admin.id, "participants_imported", "participant", None, db,
                 details=json.dumps({"imported": imported, "updated": updated}))
    await db.commit()

    return ParticipantImportResult(
        imported=imported,
        updated=updated,
        errors=errors,
        total_processed=imported + updated + len(errors),
    )


@router.patch("/participants/{participant_id}/eligibility")
async def set_eligibility(
    participant_id: str,
    eligible: bool,
    reason: Optional[str] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")
    participant.is_eligible = eligible
    if not eligible and reason:
        participant.ineligibility_reason = reason
    await _audit(admin.id, "eligibility_changed", "participant", participant_id, db,
                 details=json.dumps({"eligible": eligible, "reason": reason}))
    await db.commit()
    return {"success": True, "usn": participant.usn, "is_eligible": eligible}


@router.get("/participants/export")
async def export_participants(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Participant).order_by(Participant.usn))
    participants = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["usn", "name", "roll_number", "email", "department", "semester", "is_eligible"])
    for p in participants:
        writer.writerow([p.usn, p.name, p.roll_number, p.email, p.department, p.semester, p.is_eligible])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=participants.csv"},
    )


# ─── Round Management ───

@router.get("/rounds", response_model=List[RoundOut])
async def admin_list_rounds(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).order_by(Round.round_number))
    return [RoundOut.model_validate(r) for r in result.scalars().all()]


@router.put("/rounds/{round_id}", response_model=RoundOut)
async def update_round(
    round_id: str,
    body: RoundUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")
    if round_.status not in (RoundStatus.PENDING, RoundStatus.PAUSED):
        raise HTTPException(status_code=400, detail="Can only update rounds in PENDING or PAUSED state.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(round_, field, value)
    await _audit(admin.id, "round_updated", "round", round_id, db)
    await db.commit()
    await db.refresh(round_)
    return RoundOut.model_validate(round_)


@router.post("/rounds/{round_id}/open", response_model=RoundOut)
async def open_round(
    round_id: str,
    reset_attempts: bool = Query(False),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")

    # Verify enough questions
    q_count = await db.scalar(
        select(func.count(Question.id)).where(
            and_(Question.round_id == round_id, Question.is_active == True)
        )
    )
    if (q_count or 0) < round_.question_count:
        raise HTTPException(
            status_code=400,
            detail=f"Need {round_.question_count} active questions, only {q_count} available.",
        )

    # If resetting attempts on relaunch
    if reset_attempts:
        att_res = await db.execute(select(Attempt).where(Attempt.round_id == round_id))
        attempts = att_res.scalars().all()
        for att in attempts:
            await db.execute(delete(Answer).where(Answer.attempt_id == att.id))
            await db.delete(att)
        await db.execute(delete(Qualification).where(Qualification.round_id == round_id))

    round_.status = RoundStatus.OPEN
    round_.started_at = datetime.now(timezone.utc)
    round_.closed_at = None
    round_.results_published_at = None
    await _audit(admin.id, "round_opened_or_relaunched", "round", round_id, db)
    await db.commit()
    await db.refresh(round_)
    return RoundOut.model_validate(round_)


@router.post("/rounds/{round_id}/relaunch", response_model=RoundOut)
async def relaunch_round(
    round_id: str,
    reset_attempts: bool = Query(True),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Relaunch a round anytime from any status, with attempts reset by default so participants can retake."""
    return await open_round(round_id=round_id, reset_attempts=reset_attempts, admin=admin, db=db)


@router.post("/rounds/{round_id}/reset-attempts", response_model=MessageResponse)
async def reset_round_attempts(
    round_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset all participant attempts and answers for a specific round."""
    att_res = await db.execute(select(Attempt).where(Attempt.round_id == round_id))
    attempts = att_res.scalars().all()
    count = len(attempts)
    for att in attempts:
        await db.execute(delete(Answer).where(Answer.attempt_id == att.id))
        await db.delete(att)
    await db.execute(delete(Qualification).where(Qualification.round_id == round_id))
    await _audit(admin.id, "round_attempts_reset", "round", round_id, db)
    await db.commit()
    return MessageResponse(message=f"Successfully reset {count} attempts for Round.")


@router.post("/rounds/{round_id}/close", response_model=RoundOut)
async def close_round(
    round_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")

    round_.status = RoundStatus.CLOSED
    round_.closed_at = datetime.now(timezone.utc)

    # Finalize all still-in-progress attempts
    in_progress_result = await db.execute(
        select(Attempt).where(
            and_(Attempt.round_id == round_id, Attempt.status == AttemptStatus.IN_PROGRESS)
        )
    )
    from app.api.v1.quiz import _finalize_attempt
    for attempt in in_progress_result.scalars().all():
        attempt.status = AttemptStatus.TIMED_OUT
        await _finalize_attempt(attempt, round_, db)

    await _audit(admin.id, "round_closed", "round", round_id, db)
    await db.commit()
    await db.refresh(round_)
    return RoundOut.model_validate(round_)


@router.post("/rounds/{round_id}/pause", response_model=RoundOut)
async def pause_round(
    round_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_ or round_.status != RoundStatus.OPEN:
        raise HTTPException(status_code=400, detail="Round is not open.")
    round_.status = RoundStatus.PAUSED
    await _audit(admin.id, "round_paused", "round", round_id, db)
    await db.commit()
    await db.refresh(round_)
    return RoundOut.model_validate(round_)


@router.post("/rounds/{round_id}/publish-results", response_model=MessageResponse)
@router.post("/rounds/{round_id}/qualify", response_model=MessageResponse)
async def compute_qualification(
    round_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Compute and store qualifications and publish official results."""
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")

    if round_.status == RoundStatus.OPEN:
        round_.status = RoundStatus.CLOSED
        round_.closed_at = datetime.now(timezone.utc)
        # Finalize any in-progress attempts
        in_progress_result = await db.execute(
            select(Attempt).where(
                and_(Attempt.round_id == round_id, Attempt.status == AttemptStatus.IN_PROGRESS)
            )
        )
        from app.api.v1.quiz import _finalize_attempt
        for attempt in in_progress_result.scalars().all():
            attempt.status = AttemptStatus.SUBMITTED
            attempt.submitted_at = datetime.now(timezone.utc)
            await _finalize_attempt(attempt, round_, db)
    elif round_.status not in (RoundStatus.CLOSED, RoundStatus.RESULTS_PUBLISHED):
        raise HTTPException(status_code=400, detail=f"Cannot publish results for round in '{round_.status.value}' state. Open or close the round first.")

    # Get all submitted/timed-out attempts ordered by score desc
    attempts_result = await db.execute(
        select(Attempt).where(
            and_(
                Attempt.round_id == round_id,
                Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT]),
            )
        ).order_by(desc(Attempt.score), Attempt.submitted_at)
    )
    attempts = attempts_result.scalars().all()

    # Determine qualification count
    if round_.qualification_count:
        qual_count = round_.qualification_count
    elif round_.qualification_percentage and len(attempts) > 0:
        qual_count = max(1, int(len(attempts) * round_.qualification_percentage / 100))
    else:
        qual_count = len(attempts)

    # Clear existing qualifications
    existing_quals = await db.execute(select(Qualification).where(Qualification.round_id == round_id))
    for q in existing_quals.scalars().all():
        await db.delete(q)

    for rank, attempt in enumerate(attempts, start=1):
        qual = Qualification(
            participant_id=attempt.participant_id,
            round_id=round_id,
            rank=rank,
            score=attempt.score or 0,
            is_qualified=rank <= qual_count,
        )
        db.add(qual)

    round_.status = RoundStatus.RESULTS_PUBLISHED
    round_.results_published_at = datetime.now(timezone.utc)

    await _audit(admin.id, "qualification_computed", "round", round_id, db,
                 details=json.dumps({"total": len(attempts), "qualified": min(qual_count, len(attempts))}))
    await db.commit()
    return MessageResponse(
        message=f"Qualifications computed. {min(qual_count, len(attempts))} participants qualified out of {len(attempts)}."
    )


@router.get("/rounds/{round_id}/leaderboard", response_model=RoundLeaderboard)
async def get_leaderboard(
    round_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")

    quals_result = await db.execute(
        select(Qualification, Participant).join(
            Participant, Qualification.participant_id == Participant.id
        ).where(Qualification.round_id == round_id).order_by(Qualification.rank)
    )
    rows = quals_result.all()

    entries = []
    if not rows:
        # Fallback to attempts directly if qualifications haven't been computed yet
        att_res = await db.execute(
            select(Attempt, Participant)
            .join(Participant, Attempt.participant_id == Participant.id)
            .where(Attempt.round_id == round_id)
            .order_by(desc(Attempt.score), Attempt.submitted_at)
        )
        for rank, (att, p) in enumerate(att_res.all(), start=1):
            entries.append(LeaderboardEntry(
                rank=rank,
                participant_id=p.id,
                usn=p.usn,
                name=p.name,
                score=att.score or 0.0,
                correct_count=att.correct_count or 0,
                is_qualified=False,
            ))
    else:
        for qual, participant in rows:
            # Get correct count
            attempt_result = await db.execute(
                select(Attempt).where(
                    and_(Attempt.participant_id == participant.id, Attempt.round_id == round_id)
                )
            )
            attempt = attempt_result.scalar_one_or_none()
            entries.append(LeaderboardEntry(
                rank=qual.rank,
                participant_id=participant.id,
                usn=participant.usn,
                name=participant.name,
                score=qual.score,
                correct_count=attempt.correct_count if attempt else 0,
                is_qualified=qual.is_qualified,
            ))

    return RoundLeaderboard(
        round_id=round_id,
        round_number=round_.round_number,
        round_name=round_.name,
        is_published=round_.status == RoundStatus.RESULTS_PUBLISHED,
        entries=entries,
    )


@router.get("/rounds/{round_id}/leaderboard/export")
async def export_leaderboard(
    round_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    lb = await get_leaderboard(round_id, admin, db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["rank", "usn", "name", "score", "correct_count", "is_qualified"])
    for e in lb.entries:
        writer.writerow([e.rank, e.usn, e.name, e.score, e.correct_count, e.is_qualified])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=leaderboard_round_{lb.round_number}.csv"},
    )


# ─── Question Management ───

@router.get("/questions", response_model=List[QuestionAdminOut])
async def list_all_questions(
    round_id: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
):
    """List questions across all rounds (or filtered by round_id/topic/search)."""
    query = select(Question, Round).outerjoin(Round, Question.round_id == Round.id).where(Question.is_active == True)
    if round_id:
        query = query.where(Question.round_id == round_id)
    if topic:
        query = query.where(Question.topic.ilike(f"%{topic}%"))
    if search:
        query = query.where(Question.question_text.ilike(f"%{search}%"))

    query = query.order_by(Round.round_number, Question.created_at).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    out = []
    for q, r in rows:
        opt_result = await db.execute(select(AnswerOption).where(AnswerOption.question_id == q.id).order_by(AnswerOption.display_order))
        opts = opt_result.scalars().all()
        out.append(QuestionAdminOut(
            id=q.id,
            round_id=q.round_id,
            round_number=r.round_number if r else None,
            round_name=r.name if r else None,
            question_text=q.question_text,
            topic=q.topic,
            difficulty=q.difficulty,
            point_value=q.point_value,
            explanation=q.explanation,
            image_url=q.image_url,
            code_snippet=q.code_snippet,
            is_active=q.is_active,
            version=q.version,
            options=[AnswerOptionAdminOut(
                id=o.id, option_label=o.option_label, option_text=o.option_text,
                display_order=o.display_order, is_correct=o.is_correct
            ) for o in opts],
            created_at=q.created_at,
            updated_at=q.updated_at,
        ))
    return out


@router.get("/rounds/{round_id}/questions", response_model=List[QuestionAdminOut])
async def list_questions(
    round_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    return await list_all_questions(round_id=round_id, admin=admin, db=db, page=page, page_size=page_size)


@router.post("/rounds/{round_id}/questions", response_model=QuestionAdminOut)
async def create_question(
    round_id: str,
    body: QuestionCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")

    correct_count = sum(1 for o in body.options if o.is_correct)
    if correct_count != 1:
        raise HTTPException(status_code=400, detail="Each question must have exactly 1 correct option.")

    q = Question(
        round_id=round_id,
        question_text=body.question_text,
        topic=body.topic,
        difficulty=body.difficulty,
        point_value=body.point_value,
        explanation=body.explanation,
        image_url=body.image_url,
        code_snippet=body.code_snippet,
    )
    db.add(q)
    await db.flush()

    opts = []
    for opt_in in body.options:
        o = AnswerOption(
            question_id=q.id,
            option_label=opt_in.option_label,
            option_text=opt_in.option_text,
            is_correct=opt_in.is_correct,
            display_order=opt_in.display_order,
        )
        db.add(o)
        opts.append(o)

    await _audit(admin.id, "question_created", "question", q.id, db)
    await db.commit()
    await db.refresh(q)

    return QuestionAdminOut(
        id=q.id,
        round_id=q.round_id,
        question_text=q.question_text,
        topic=q.topic,
        difficulty=q.difficulty,
        point_value=q.point_value,
        explanation=q.explanation,
        image_url=q.image_url,
        code_snippet=q.code_snippet,
        is_active=q.is_active,
        version=q.version,
        options=[AnswerOptionAdminOut(
            id=o.id, option_label=o.option_label, option_text=o.option_text,
            display_order=o.display_order, is_correct=o.is_correct
        ) for o in opts],
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


@router.put("/questions/{question_id}", response_model=QuestionAdminOut)
async def update_question(
    question_id: str,
    body: QuestionUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    if body.question_text is not None:
        q.question_text = body.question_text
    if body.topic is not None:
        q.topic = body.topic
    if body.difficulty is not None:
        q.difficulty = body.difficulty
    if body.point_value is not None:
        q.point_value = body.point_value
    if body.explanation is not None:
        q.explanation = body.explanation
    if body.image_url is not None:
        q.image_url = body.image_url
    if body.code_snippet is not None:
        q.code_snippet = body.code_snippet
    if body.is_active is not None:
        q.is_active = body.is_active
    if body.round_id is not None:
        q.round_id = body.round_id

    q.version += 1
    q.updated_at = datetime.now(timezone.utc)

    if body.options is not None:
        correct_count = sum(1 for o in body.options if o.is_correct)
        if correct_count != 1:
            raise HTTPException(status_code=400, detail="Each question must have exactly 1 correct option.")

        old_opts = await db.execute(select(AnswerOption).where(AnswerOption.question_id == q.id))
        for old_opt in old_opts.scalars().all():
            await db.delete(old_opt)

        for opt_in in body.options:
            db.add(AnswerOption(
                question_id=q.id,
                option_label=opt_in.option_label,
                option_text=opt_in.option_text,
                is_correct=opt_in.is_correct,
                display_order=opt_in.display_order,
            ))

    await _audit(admin.id, "question_updated", "question", q.id, db)
    await db.commit()
    await db.refresh(q)

    r_result = await db.execute(select(Round).where(Round.id == q.round_id))
    r = r_result.scalar_one_or_none()
    opt_result = await db.execute(select(AnswerOption).where(AnswerOption.question_id == q.id).order_by(AnswerOption.display_order))
    opts = opt_result.scalars().all()

    return QuestionAdminOut(
        id=q.id,
        round_id=q.round_id,
        round_number=r.round_number if r else None,
        round_name=r.name if r else None,
        question_text=q.question_text,
        topic=q.topic,
        difficulty=q.difficulty,
        point_value=q.point_value,
        explanation=q.explanation,
        image_url=q.image_url,
        code_snippet=q.code_snippet,
        is_active=q.is_active,
        version=q.version,
        options=[AnswerOptionAdminOut(
            id=o.id, option_label=o.option_label, option_text=o.option_text,
            display_order=o.display_order, is_correct=o.is_correct
        ) for o in opts],
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


@router.delete("/questions/{question_id}", response_model=MessageResponse)
async def deactivate_question(
    question_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    q.is_active = False
    await _audit(admin.id, "question_deactivated", "question", question_id, db)
    await db.commit()
    return MessageResponse(message="Question deactivated.")


@router.post("/rounds/{round_id}/questions/import", response_model=MessageResponse)
async def import_questions(
    round_id: str,
    file: UploadFile = File(...),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Import questions from CSV. Columns: question_text,topic,difficulty,point_value,option_a,option_b,option_c,option_d,correct_option,explanation"""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    count = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            q_text = (row.get("question_text") or "").strip()
            if not q_text:
                errors.append(f"Row {i}: empty question_text")
                continue

            correct = (row.get("correct_option") or "").strip().upper()
            opts = []
            for label in ["A", "B", "C", "D"]:
                text_val = (row.get(f"option_{label.lower()}") or "").strip()
                if text_val:
                    opts.append(AnswerOption(
                        option_label=label,
                        option_text=text_val,
                        is_correct=(label == correct),
                        display_order=ord(label) - ord("A"),
                    ))

            if not any(o.is_correct for o in opts):
                errors.append(f"Row {i}: no correct option marked")
                continue

            q = Question(
                round_id=round_id,
                question_text=q_text,
                topic=(row.get("topic") or "").strip() or None,
                difficulty=(row.get("difficulty") or "medium").strip(),
                point_value=float(row.get("point_value") or 4),
                explanation=(row.get("explanation") or "").strip() or None,
            )
            db.add(q)
            await db.flush()
            for o in opts:
                o.question_id = q.id
                db.add(o)
            count += 1
        except Exception as e:
            errors.append(f"Row {i}: {e}")

    await _audit(admin.id, "questions_imported", "question", None, db,
                 details=json.dumps({"imported": count, "round_id": round_id}))
    await db.commit()
    return MessageResponse(
        message=f"Imported {count} questions.",
        detail="; ".join(errors) if errors else None,
    )


# ─── Rules Management ───

@router.get("/rules", response_model=List[RulesVersionOut])
async def list_rules(admin: AdminUser = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        return []
    result = await db.execute(
        select(RulesVersion).where(RulesVersion.event_id == event.id).order_by(RulesVersion.created_at.desc())
    )
    return [RulesVersionOut.model_validate(r) for r in result.scalars().all()]


@router.post("/rules", response_model=RulesVersionOut)
async def create_rules_version(
    body: RulesVersionCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="No active event.")

    if body.make_current:
        # Unset existing current
        existing = await db.execute(
            select(RulesVersion).where(and_(RulesVersion.event_id == event.id, RulesVersion.is_current == True))
        )
        for rv in existing.scalars().all():
            rv.is_current = False

    rv = RulesVersion(
        event_id=event.id,
        version=body.version,
        rules_html=body.rules_html,
        is_current=body.make_current,
    )
    db.add(rv)
    await _audit(admin.id, "rules_version_created", "rules_version", None, db)
    await db.commit()
    await db.refresh(rv)
    return RulesVersionOut.model_validate(rv)


# ─── Announcements ───

@router.get("/announcements", response_model=List[AnnouncementOut])
async def list_announcements(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        return []
    result = await db.execute(
        select(Announcement).where(Announcement.event_id == event.id)
        .order_by(desc(Announcement.is_pinned), desc(Announcement.created_at))
    )
    return [AnnouncementOut.model_validate(a) for a in result.scalars().all()]


@router.post("/announcements", response_model=AnnouncementOut)
async def create_announcement(
    body: AnnouncementCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="No active event.")
    a = Announcement(
        event_id=event.id,
        title=body.title,
        body=body.body,
        is_pinned=body.is_pinned,
        is_published=body.is_published,
    )
    db.add(a)
    await _audit(admin.id, "announcement_created", "announcement", None, db)
    await db.commit()
    await db.refresh(a)
    return AnnouncementOut.model_validate(a)


# ─── Appeals ───

@router.get("/appeals")
async def list_appeals(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appeal, Participant)
        .outerjoin(Participant, Appeal.participant_id == Participant.id)
        .order_by(desc(Appeal.created_at))
    )
    rows = result.all()
    return [
        {
            "id": a.id,
            "participant_id": a.participant_id,
            "usn": p.usn if p else "UNKNOWN",
            "name": p.name if p else "Student",
            "subject": a.subject,
            "description": a.description,
            "status": a.status.value,
            "admin_response": a.admin_response,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a, p in rows
    ]


@router.patch("/appeals/{appeal_id}")
async def resolve_appeal(
    appeal_id: str,
    status: str,
    response: Optional[str] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appeal).where(Appeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found.")
    try:
        appeal.status = AppealStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    appeal.admin_response = response
    appeal.resolved_by_id = admin.id
    appeal.resolved_at = datetime.now(timezone.utc)
    await _audit(admin.id, "appeal_resolved", "appeal", appeal_id, db)
    await db.commit()
    return {"success": True}


# ─── Violations Review ───

@router.get("/violations")
async def list_violations(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Violation, Participant).join(
            Participant, Violation.participant_id == Participant.id
        ).order_by(desc(Violation.received_at_server)).offset(offset).limit(page_size)
    )
    rows = result.all()
    total = await db.scalar(select(func.count(Violation.id))) or 0

    return {
        "total": total,
        "items": [
            {
                "id": v.id,
                "usn": p.usn,
                "participant_usn": p.usn,
                "name": p.name,
                "participant_name": p.name,
                "violation_type": v.violation_type.value,
                "received_at": v.received_at_server.isoformat() if v.received_at_server else None,
                "received_at_server": v.received_at_server.isoformat() if v.received_at_server else None,
                "terminated": v.resulted_in_termination,
                "resulted_in_termination": v.resulted_in_termination,
            }
            for v, p in rows
        ],
    }


@router.delete("/violations", response_model=MessageResponse)
async def clear_violations(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Clear all proctoring violation logs."""
    await db.execute(delete(Violation))
    await db.commit()
    return MessageResponse(message="Violation logs cleared.")


@router.post("/reset-test-data", response_model=MessageResponse)
async def reset_test_data(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Clean all participants, attempts, answers, violations, appeals, and reset rounds to PENDING."""
    await db.execute(delete(Answer))
    await db.execute(delete(Violation))
    await db.execute(delete(Qualification))
    await db.execute(delete(Appeal))
    await db.execute(delete(Certificate))
    await db.execute(delete(ParticipantConsent))
    await db.execute(delete(Attempt))
    await db.execute(delete(Participant))
    # Reset all rounds to PENDING
    rounds_res = await db.execute(select(Round))
    for r in rounds_res.scalars().all():
        r.status = RoundStatus.PENDING
        r.started_at = None
        r.closed_at = None
        r.results_published_at = None
    await db.commit()
    return MessageResponse(message="Tournament reset complete: all participants and attempts removed, all rounds set to PENDING.")


# ─── Audit Logs ───

@router.get("/audit-logs")
async def get_audit_logs(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    offset = (page - 1) * page_size
    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)
    )
    logs = result.scalars().all()
    total = await db.scalar(select(func.count(AuditLog.id))) or 0
    return {
        "total": total,
        "items": [
            {
                "id": l.id,
                "action": l.action,
                "resource_type": l.resource_type,
                "resource_id": l.resource_id,
                "created_at": l.created_at,
            }
            for l in logs
        ],
    }


# ─── Attempt Grant Exception ───

@router.post("/attempts/{attempt_id}/exception", response_model=MessageResponse)
async def grant_attempt_exception(
    attempt_id: str,
    reason: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Grant an exception to allow a terminated/completed attempt to be reset."""
    result = await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    attempt.status = AttemptStatus.IN_PROGRESS
    attempt.is_exception_restart = True
    attempt.exception_reason = reason
    attempt.score = None
    attempt.correct_count = 0
    attempt.incorrect_count = 0
    attempt.unanswered_count = 0
    attempt.submitted_at = None
    attempt.finalized_at = None
    attempt.termination_reason = None

    # Extend deadline from now
    round_result = await db.execute(select(Round).where(Round.id == attempt.round_id))
    round_ = round_result.scalar_one_or_none()
    if round_:
        attempt.deadline_at = datetime.now(timezone.utc) + timedelta(minutes=round_.duration_minutes)

    # Clear previous answers
    ans_result = await db.execute(select(Answer).where(Answer.attempt_id == attempt_id))
    for ans in ans_result.scalars().all():
        await db.delete(ans)

    await _audit(admin.id, "exception_granted", "attempt", attempt_id, db,
                 details=json.dumps({"reason": reason}))
    await db.commit()
    return MessageResponse(message=f"Exception granted. Attempt reset. Reason: {reason}")


# ─── Helper ───

async def _audit(
    admin_id: str,
    action: str,
    resource_type: Optional[str],
    resource_id: Optional[str],
    db: AsyncSession,
    details: Optional[str] = None,
):
    log = AuditLog(
        admin_id=admin_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
    )
    db.add(log)
