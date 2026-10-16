"""
Admin authentication routes — login, logout, password change.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.core.deps import get_current_admin
from app.models import AdminUser, AuditLog
from app.schemas.schemas import (
    AdminLoginRequest, AdminLoginResponse, ChangePasswordRequest, MessageResponse
)

router = APIRouter(prefix="/auth/admin", tags=["Admin Auth"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    request: Request,
    body: AdminLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AdminUser).where(AdminUser.admin_id == body.admin_id)
    )
    admin = result.scalar_one_or_none()

    # Generic error to prevent enumeration
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials.",
    )

    if not admin or not admin.is_active:
        raise invalid_exc

    # Check lockout
    locked = admin.locked_until
    if locked:
        if locked.tzinfo is None:
            locked = locked.replace(tzinfo=timezone.utc)
        if locked > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked. Try again after {admin.locked_until.isoformat()}",
            )

    if not verify_password(body.password, admin.hashed_password):
        admin.failed_login_attempts = (admin.failed_login_attempts or 0) + 1
        if admin.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            from datetime import timedelta
            admin.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        await db.commit()
        raise invalid_exc

    # Success
    admin.failed_login_attempts = 0
    admin.locked_until = None
    admin.last_login_at = datetime.now(timezone.utc)

    token = create_access_token({"sub": admin.id, "role": "admin"})

    # Audit log
    log = AuditLog(
        admin_id=admin.id,
        action="admin_login",
        ip_address=request.client.host if request.client else None,
        details='{"success": true}',
    )
    db.add(log)
    await db.commit()

    return AdminLoginResponse(
        access_token=token,
        must_change_password=admin.must_change_password,
        admin_id=admin.admin_id,
        display_name=admin.display_name,
    )


@router.post("/logout", response_model=MessageResponse)
async def admin_logout(
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    log = AuditLog(
        admin_id=admin.id,
        action="admin_logout",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    await db.commit()
    return MessageResponse(message="Logged out successfully.")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    admin.hashed_password = hash_password(body.new_password)
    admin.must_change_password = False

    log = AuditLog(
        admin_id=admin.id,
        action="password_changed",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    await db.commit()
    return MessageResponse(message="Password changed successfully.")


@router.get("/me")
async def get_admin_me(admin: AdminUser = Depends(get_current_admin)):
    return {
        "id": admin.id,
        "admin_id": admin.admin_id,
        "display_name": admin.display_name,
        "must_change_password": admin.must_change_password,
        "last_login_at": admin.last_login_at,
    }
