"""
Participant entry, session management, and consent routes.
"""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import create_access_token
from app.core.deps import get_current_participant
from app.models import (
    Participant, ParticipantConsent, RulesVersion, Event, AuditLog
)
from app.schemas.schemas import (
    ParticipantEntryRequest, ParticipantSessionResponse, ParticipantOut,
    ConsentRequest, ConsentResponse, RulesVersionOut, MessageResponse,
    AppealCreate, AppealOut
)

router = APIRouter(prefix="/participant", tags=["Participant"])


@router.post("/entry", response_model=ParticipantSessionResponse)
async def participant_entry(
    request: Request,
    body: ParticipantEntryRequest,
    db: AsyncSession = Depends(get_db),
):
    """Entry point: USN → validate → session token."""
    usn = body.usn

    # Find participant
    result = await db.execute(select(Participant).where(Participant.usn == usn))
    participant = result.scalar_one_or_none()

    name_clean = body.name.strip() if body.name and body.name.strip() else None
    email_clean = body.email.strip().lower() if body.email and body.email.strip() else None
    dept_clean = body.department.strip() if body.department and body.department.strip() else None
    college_clean = body.college_name.strip() if body.college_name and body.college_name.strip() else None

    if not participant:
        # Auto-create with basic info
        participant = Participant(
            usn=usn,
            name=name_clean,
            email=email_clean,
            department=dept_clean,
            college_name=college_clean,
            is_eligible=True,
            is_verified=False,
        )
        db.add(participant)
        await db.flush()
    else:
        # Update details if provided
        if name_clean:
            participant.name = name_clean
        if email_clean:
            participant.email = email_clean
        if dept_clean:
            participant.department = dept_clean
        if college_clean:
            participant.college_name = college_clean

    if not participant.is_eligible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This USN is not eligible to participate. {participant.ineligibility_reason or ''}".strip(),
        )

    # Generate JWT
    token = create_access_token({"sub": participant.id, "role": "participant", "usn": participant.usn})
    participant.last_login_at = datetime.now(timezone.utc)

    # Check if current rules need consent
    needs_consent = False
    current_rv_id = None
    current_rv_version = None

    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()

    if event:
        rv_result = await db.execute(
            select(RulesVersion).where(
                and_(RulesVersion.event_id == event.id, RulesVersion.is_current == True)
            )
        )
        current_rv = rv_result.scalar_one_or_none()
        if current_rv:
            consent_result = await db.execute(
                select(ParticipantConsent).where(
                    and_(
                        ParticipantConsent.participant_id == participant.id,
                        ParticipantConsent.rules_version_id == current_rv.id,
                    )
                )
            )
            consent = consent_result.scalar_one_or_none()
            needs_consent = consent is None
            current_rv_id = current_rv.id
            current_rv_version = current_rv.version

    await db.commit()
    await db.refresh(participant)

    return ParticipantSessionResponse(
        session_token=token,
        participant=ParticipantOut.model_validate(participant),
        needs_rules_acceptance=needs_consent,
        current_rules_version=current_rv_version,
    )


@router.post("/consent", response_model=ConsentResponse)
async def record_consent(
    request: Request,
    body: ConsentRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    """Record participant's explicit consent to current rules."""
    if not body.accepted:
        raise HTTPException(status_code=400, detail="You must accept the rules to participate.")

    # Verify the rules version exists
    rv_result = await db.execute(
        select(RulesVersion).where(RulesVersion.id == body.rules_version_id)
    )
    rv = rv_result.scalar_one_or_none()
    if not rv:
        raise HTTPException(status_code=404, detail="Rules version not found.")

    # Check for existing consent
    existing_result = await db.execute(
        select(ParticipantConsent).where(
            and_(
                ParticipantConsent.participant_id == participant.id,
                ParticipantConsent.rules_version_id == rv.id,
            )
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return ConsentResponse(
            success=True,
            consented_at=existing.consented_at,
            rules_version=rv.version,
        )

    consent = ParticipantConsent(
        participant_id=participant.id,
        rules_version_id=rv.id,
        ip_address=request.client.host if request.client else None,
    )
    db.add(consent)
    await db.commit()
    await db.refresh(consent)

    return ConsentResponse(
        success=True,
        consented_at=consent.consented_at,
        rules_version=rv.version,
    )


@router.get("/me", response_model=ParticipantOut)
async def get_me(participant: Participant = Depends(get_current_participant)):
    return ParticipantOut.model_validate(participant)


@router.get("/rules/current", response_model=RulesVersionOut)
async def get_current_rules(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    """Get the current rules version to display to participant."""
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="No active event found.")

    rv_result = await db.execute(
        select(RulesVersion).where(
            and_(RulesVersion.event_id == event.id, RulesVersion.is_current == True)
        )
    )
    rv = rv_result.scalar_one_or_none()
    if not rv:
        raise HTTPException(status_code=404, detail="No rules published yet.")

    return RulesVersionOut.model_validate(rv)


@router.post("/appeals", response_model=AppealOut)
async def submit_appeal(
    body: AppealCreate,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    from app.models import Appeal
    appeal = Appeal(
        participant_id=participant.id,
        attempt_id=body.attempt_id,
        subject=body.subject.strip(),
        description=body.description.strip(),
    )
    db.add(appeal)
    await db.commit()
    await db.refresh(appeal)
    return AppealOut.model_validate(appeal)


@router.get("/appeals", response_model=list[AppealOut])
async def get_my_appeals(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    from app.models import Appeal
    result = await db.execute(
        select(Appeal).where(Appeal.participant_id == participant.id)
        .order_by(Appeal.created_at.desc())
    )
    appeals = result.scalars().all()
    return [AppealOut.model_validate(a) for a in appeals]
