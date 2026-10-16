"""
FastAPI dependency injection functions for authentication and authorization.
"""
from datetime import datetime, timezone
from typing import Optional, Annotated
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models import AdminUser, Participant

security = HTTPBearer(auto_error=False)


async def get_current_admin(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """Require a valid admin JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access" or payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token.",
        )
    admin_id = payload.get("sub")
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found or inactive.")
    return admin


async def get_current_participant(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> Participant:
    """Require a valid participant JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Participant session required.",
        )
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access" or payload.get("role") != "participant":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired participant token.",
        )
    participant_id = payload.get("sub")
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    participant = result.scalar_one_or_none()
    if not participant or not participant.is_eligible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Participant not found or not eligible.",
        )
    return participant


async def get_current_participant_with_consent(
    participant: Annotated[Participant, Depends(get_current_participant)],
    db: AsyncSession = Depends(get_db),
) -> Participant:
    """Require participant + current rules consent."""
    from app.models import RulesVersion, ParticipantConsent, Event
    from sqlalchemy import and_

    # Get active event
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        return participant  # No event configured, allow through

    # Get current rules version
    rv_result = await db.execute(
        select(RulesVersion).where(
            and_(RulesVersion.event_id == event.id, RulesVersion.is_current == True)
        )
    )
    current_rv = rv_result.scalar_one_or_none()
    if not current_rv:
        return participant  # No rules published yet

    # Check consent
    consent_result = await db.execute(
        select(ParticipantConsent).where(
            and_(
                ParticipantConsent.participant_id == participant.id,
                ParticipantConsent.rules_version_id == current_rv.id,
            )
        )
    )
    consent = consent_result.scalar_one_or_none()
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must accept the current rules before accessing this resource.",
        )
    return participant
