"""
Hacktober 2026 — Automated Test Suite
Testing:
- Phase 1 & 3: Public Event Info & Announcements
- Phase 4: Participant Entry (USN normalization)
- Phase 5: Admin Login with Bootstrap Credentials (Quiz@Cyber26)
- Phase 6: Mandatory Rules Acceptance
- Phase 7 & 8: Round & Question Management
- Phase 9 & 10: Examination Mode, Autosave, Strict Violation Termination
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

@pytest.fixture
async def client():
    from app.core.database import init_db, AsyncSessionLocal
    from app.core.seeder import seed_database
    from app.core.question_bank import seed_questions

    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_database(session)
        await seed_questions(session)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.anyio
async def test_health_and_public_event(client: AsyncClient):
    # Health check
    res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Public event
    res = await client.get("/api/v1/public/event")
    assert res.status_code == 200
    data = res.json()
    assert "Hacktober 2026" in data["name"]
    assert "Guru Nanak Dev" in data["college_name"]

@pytest.mark.anyio
async def test_admin_bootstrap_login(client: AsyncClient):
    # Admin login with bootstrap credentials
    res = await client.post(
        "/api/v1/auth/admin/login",
        json={
            "admin_id": settings.INITIAL_ADMIN_ID or "Quiz@Cyber26",
            "password": settings.INITIAL_ADMIN_PASSWORD or "hello123@123",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Test dashboard stats access with admin token
    token = data["access_token"]
    res = await client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    stats = res.json()
    assert "total_eligible_participants" in stats

@pytest.mark.anyio
async def test_participant_workflow(client: AsyncClient):
    # 1. Entry with USN
    import uuid
    test_usn = f"3GN22CS{uuid.uuid4().hex[:4].upper()}"
    res = await client.post(
        "/api/v1/participant/entry",
        json={"usn": test_usn.lower()},  # Should normalize to uppercase
    )
    assert res.status_code == 200
    entry_data = res.json()
    assert entry_data["participant"]["usn"] == test_usn
    token = entry_data["session_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch current rules
    res = await client.get("/api/v1/participant/rules/current", headers=headers)
    assert res.status_code == 200
    rules = res.json()
    rules_id = rules["id"]

    # 3. Explicit rules acceptance
    res = await client.post(
        "/api/v1/participant/consent",
        headers=headers,
        json={"rules_version_id": rules_id, "accepted": True},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 4. Access rounds
    res = await client.get("/api/v1/quiz/rounds", headers=headers)
    assert res.status_code == 200
    rounds = res.json()
    assert len(rounds) >= 3

@pytest.mark.anyio
async def test_quiz_attempt_autosave_and_violation(client: AsyncClient):
    # Create fresh participant
    import uuid
    test_usn = f"3GN22CS{uuid.uuid4().hex[:4].upper()}"
    entry_res = await client.post("/api/v1/participant/entry", json={"usn": test_usn})
    token = entry_res.json()["session_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Accept rules
    rules_res = await client.get("/api/v1/participant/rules/current", headers=headers)
    await client.post(
        "/api/v1/participant/consent",
        headers=headers,
        json={"rules_version_id": rules_res.json()["id"], "accepted": True},
    )

    # Get Round 1
    rounds_res = await client.get("/api/v1/quiz/rounds", headers=headers)
    r1 = rounds_res.json()[0]

    # Ensure Round 1 is open (via admin if needed)
    admin_login = await client.post(
        "/api/v1/auth/admin/login",
        json={"admin_id": settings.INITIAL_ADMIN_ID, "password": settings.INITIAL_ADMIN_PASSWORD},
    )
    admin_token = admin_login.json()["access_token"]
    await client.post(
        f"/api/v1/admin/rounds/{r1['id']}/open",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Start Attempt
    start_res = await client.post(f"/api/v1/quiz/rounds/{r1['id']}/start", headers=headers)
    assert start_res.status_code == 200
    attempt_data = start_res.json()
    attempt_id = attempt_data["attempt_id"]
    questions = attempt_data["questions"]
    assert len(questions) > 0

    # Autosave Answer for Question 1
    q1 = questions[0]
    opt1 = q1["options"][0]
    save_res = await client.post(
        f"/api/v1/quiz/attempts/{attempt_id}/save",
        headers=headers,
        json={"question_id": q1["id"], "selected_option_id": opt1["id"]},
    )
    assert save_res.status_code == 200
    assert save_res.json()["saved"] is True

    # Test Strict Proctoring Violation Termination
    violation_res = await client.post(
        f"/api/v1/quiz/attempts/{attempt_id}/violation",
        headers=headers,
        json={"violation_type": "fullscreen_exit", "attempt_id": attempt_id},
    )
    assert violation_res.status_code == 200
    v_data = violation_res.json()
    assert v_data["recorded"] is True
    assert v_data["resulted_in_termination"] is True
