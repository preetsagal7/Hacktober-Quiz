"""
Public routes — event info, announcements, leaderboard (if published), certificates.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.core.database import get_db
from app.models import Event, Announcement, Round, Qualification, Participant, Certificate, RoundStatus, RulesVersion
from app.schemas.schemas import EventOut, AnnouncementOut, RoundOut, RoundLeaderboard, LeaderboardEntry, RulesVersionOut

router = APIRouter(prefix="/public", tags=["Public"])


@router.get("/rules", response_model=RulesVersionOut)
async def get_public_rules(db: AsyncSession = Depends(get_db)):
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="No active event.")
    rv_result = await db.execute(
        select(RulesVersion).where(
            and_(RulesVersion.event_id == event.id, RulesVersion.is_current == True)
        )
    )
    rv = rv_result.scalar_one_or_none()
    if not rv:
        raise HTTPException(status_code=404, detail="No rules published.")
    return RulesVersionOut.model_validate(rv)


@router.get("/event", response_model=EventOut)
async def get_event(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.is_active == True))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="No active event.")
    return EventOut.model_validate(event)


@router.get("/announcements")
async def get_announcements(db: AsyncSession = Depends(get_db)):
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        return []
    result = await db.execute(
        select(Announcement).where(
            and_(Announcement.event_id == event.id, Announcement.is_published == True)
        ).order_by(desc(Announcement.is_pinned), desc(Announcement.created_at))
    )
    return [AnnouncementOut.model_validate(a) for a in result.scalars().all()]


@router.get("/rounds", response_model=list[RoundOut])
async def get_rounds(db: AsyncSession = Depends(get_db)):
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        return []
    result = await db.execute(
        select(Round).where(Round.event_id == event.id).order_by(Round.round_number)
    )
    return [RoundOut.model_validate(r) for r in result.scalars().all()]


@router.get("/leaderboard/{round_id}", response_model=RoundLeaderboard)
async def get_public_leaderboard(
    round_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")
    if round_.status != RoundStatus.RESULTS_PUBLISHED:
        raise HTTPException(status_code=403, detail="Results have not been published yet.")

    quals_result = await db.execute(
        select(Qualification, Participant).join(
            Participant, Qualification.participant_id == Participant.id
        ).where(Qualification.round_id == round_id).order_by(Qualification.rank)
    )
    rows = quals_result.all()

    entries = [
        LeaderboardEntry(
            rank=q.rank,
            participant_id=p.id,
            usn=p.usn,
            name=p.name,
            score=q.score,
            correct_count=0,
            is_qualified=q.is_qualified,
        )
        for q, p in rows
    ]

    return RoundLeaderboard(
        round_id=round_id,
        round_number=round_.round_number,
        round_name=round_.name,
        is_published=True,
        entries=entries,
    )


@router.get("/certificates/{verification_code}")
async def verify_certificate(
    verification_code: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Certificate, Participant, Event).join(
            Participant, Certificate.participant_id == Participant.id
        ).join(Event, Certificate.event_id == Event.id).where(
            and_(
                Certificate.verification_code == verification_code,
                Certificate.is_released == True,
            )
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found or not yet released.")
    cert, participant, event = row
    return {
        "valid": True,
        "verification_code": verification_code,
        "participant_name": participant.name,
        "usn": participant.usn,
        "event_name": event.name,
        "category": cert.category.value,
        "issued_at": cert.issued_at,
    }


@router.get("/my-result/{round_id}")
async def get_my_result(
    round_id: str,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a participant's result for a published round."""
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_ or round_.status != RoundStatus.RESULTS_PUBLISHED:
        raise HTTPException(status_code=403, detail="Results not published.")

    from app.models import Attempt, AttemptStatus
    attempt_result = await db.execute(
        select(Attempt).where(
            and_(Attempt.participant_id == participant_id, Attempt.round_id == round_id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()
    qual_result = await db.execute(
        select(Qualification).where(
            and_(Qualification.participant_id == participant_id, Qualification.round_id == round_id)
        )
    )
    qual = qual_result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="No attempt found.")

    return {
        "round_number": round_.round_number,
        "round_name": round_.name,
        "score": attempt.score,
        "correct_count": attempt.correct_count,
        "incorrect_count": attempt.incorrect_count,
        "unanswered_count": attempt.unanswered_count,
        "status": attempt.status.value,
        "rank": qual.rank if qual else None,
        "is_qualified": qual.is_qualified if qual else False,
        "submitted_at": attempt.submitted_at,
    }
