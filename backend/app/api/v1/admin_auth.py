"""
Admin authentication routes — login, logout, password change.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import httpx
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.core.deps import get_current_admin
from app.models import AdminUser, AuditLog
from app.schemas.schemas import (
    AdminLoginRequest, AdminLoginResponse, ChangePasswordRequest, MessageResponse,
    SupabaseAdminVerifyRequest
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
    submitted_id = body.admin_id.strip()

    from sqlalchemy import or_
    matching_conditions = [AdminUser.admin_id.ilike(submitted_id)]
    if submitted_id.lower() == settings.ADMIN_GMAIL.lower():
        matching_conditions.append(AdminUser.admin_id.ilike(settings.INITIAL_ADMIN_ID))

    result = await db.execute(select(AdminUser).where(or_(*matching_conditions)))
    admin = result.scalars().first()

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
    if submitted_id.lower() == settings.ADMIN_GMAIL.lower():
        admin.admin_id = settings.ADMIN_GMAIL
        admin.must_change_password = False
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


@router.post("/supabase-verify", response_model=AdminLoginResponse)
async def admin_supabase_verify(
    request: Request,
    body: SupabaseAdminVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify Supabase Auth session token and grant admin session
    exclusively to settings.ADMIN_GMAIL (preetsagal7@gmail.com).
    """
    token = body.access_token.strip()
    submitted_email = body.email.strip().lower()

    # Pre-check email
    if submitted_email != settings.ADMIN_GMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Only the authorized administrator email ({settings.ADMIN_GMAIL}) may sign in.",
        )

    # Cryptographically verify the session token with Supabase Auth API
    supabase_user_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.SUPABASE_ANON_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(supabase_user_url, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Supabase authentication session. Please request a new code.",
                )
            user_data = resp.json()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to authentication server: {str(exc)}",
        )

    verified_email = (user_data.get("email") or "").strip().lower()
    if verified_email != settings.ADMIN_GMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Verified email ({verified_email}) is not the authorized administrator.",
        )

    # Locate or create the AdminUser
    result = await db.execute(select(AdminUser).where(AdminUser.admin_id == settings.ADMIN_GMAIL))
    admin = result.scalar_one_or_none()

    if not admin:
        # Check if an existing bootstrap admin exists and update
        any_admin = (await db.execute(select(AdminUser))).scalars().first()
        if any_admin:
            admin = any_admin
            admin.admin_id = settings.ADMIN_GMAIL
            admin.display_name = "Tournament Administrator"
            admin.must_change_password = False
            admin.is_active = True
        else:
            admin = AdminUser(
                admin_id=settings.ADMIN_GMAIL,
                hashed_password="",
                display_name="Tournament Administrator",
                must_change_password=False,
                is_active=True,
            )
            db.add(admin)

    admin.last_login_at = datetime.now(timezone.utc)
    admin.failed_login_attempts = 0
    admin.locked_until = None
    await db.commit()
    await db.refresh(admin)

    app_token = create_access_token({"sub": admin.id, "role": "admin"})

    # Audit log
    log = AuditLog(
        admin_id=admin.id,
        action="admin_supabase_login",
        ip_address=request.client.host if request.client else None,
        details=f'{{"email": "{verified_email}", "method": "supabase_otp"}}',
    )
    db.add(log)
    await db.commit()

    return AdminLoginResponse(
        access_token=app_token,
        must_change_password=False,
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
