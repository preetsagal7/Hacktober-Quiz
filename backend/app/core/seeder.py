"""
Database seeder — called on application startup.
Creates the initial event, rounds, admin user, and default rules from environment variables.
"""
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.core.security import hash_password
from app.models import AdminUser, Event, Round, RulesVersion, RoundStatus

logger = logging.getLogger(__name__)

DEFAULT_RULES_HTML = """
<h2>Hacktober 2026 — Official Rules</h2>
<h3>Eligibility</h3>
<ul>
  <li>Participation is individual unless team mode is explicitly enabled.</li>
  <li>Impersonation of another student is strictly prohibited and will result in permanent disqualification.</li>
</ul>
<h3>Scoring & Qualification</h3>
<ul>
  <li><strong>Round 1 (Cyber Awareness):</strong> 25 questions × 4 pts = 100 pts max. Top 20 qualify.</li>
  <li><strong>Round 2 (Cyber Tech Challenge):</strong> 15 questions × 10 pts = 150 pts max. Top 5–8 qualify.</li>
  <li><strong>Round 3 (Cyber Masters Finale):</strong> 10 questions × 20 pts = 200 pts max. Finalist with highest score wins.</li>
  <li>Incorrect and unanswered answers score 0 (no negative marking).</li>
  <li>In case of a tie, submission time breaks the tie; if still tied, a tie-break question may be used at organizer discretion.</li>
</ul>
<h3>Timer Policy</h3>
<ul>
  <li>Each round timer is server-controlled. Refreshing the browser does NOT reset the timer.</li>
  <li>When time expires, your last saved answers are automatically submitted.</li>
  <li>Network issues do not extend the timer. Save your answers frequently.</li>
</ul>
<h3>Full-Screen & Tab Policy</h3>
<ul>
  <li>Rounds must be attempted in full-screen mode on a supported desktop/laptop browser.</li>
  <li>Exiting full-screen during an active round will terminate your attempt in strict mode.</li>
  <li>Switching tabs or losing document focus during an active round will terminate your attempt in strict mode.</li>
  <li>These browser-based checks have known limitations; do not attempt to exploit them.</li>
</ul>
<h3>Fair Play</h3>
<ul>
  <li>External assistance, screen sharing, collaboration, or use of AI tools is prohibited during closed-book rounds.</li>
  <li>Sharing live questions or answers is prohibited.</li>
  <li>Attempting to access other participants' data or manipulate API requests will result in disqualification and may be reported.</li>
  <li>Attacking the event website or infrastructure is strictly prohibited.</li>
</ul>
<h3>Consequences of Violations</h3>
<ul>
  <li>Violations may result in attempt termination, disqualification, and reporting to college authorities.</li>
  <li>All violations are logged with timestamps. Do not assume that concealed actions go unrecorded.</li>
</ul>
<h3>Technical Issues & Appeals</h3>
<ul>
  <li>If you experience a genuine technical issue, report it immediately using the Appeals button.</li>
  <li>Disputed violations will be reviewed by the organizing committee. Decisions are final.</li>
  <li>Unsent answers due to network failure cannot be recovered. Save answers promptly.</li>
</ul>
<h3>Privacy</h3>
<ul>
  <li>Your USN, name, scores, and attempt data are stored for the purpose of running this competition.</li>
  <li>Data will not be shared publicly beyond what is required for result publication.</li>
</ul>
<p><em>By participating, you agree to abide by these rules. Violations may result in disqualification without appeal.</em></p>
"""


async def seed_database(db: AsyncSession):
    """Idempotent seed — safe to run on every startup."""

    # ─── Admin User ───
    if not settings.INITIAL_ADMIN_ID or not settings.INITIAL_ADMIN_PASSWORD:
        logger.warning(
            "INITIAL_ADMIN_ID or INITIAL_ADMIN_PASSWORD not set. "
            "Skipping admin bootstrap. Set them in .env to create the first admin."
        )
    else:
        existing = await db.execute(
            select(AdminUser).where(AdminUser.admin_id == settings.INITIAL_ADMIN_ID)
        )
        if not existing.scalar_one_or_none():
            admin = AdminUser(
                admin_id=settings.INITIAL_ADMIN_ID,
                hashed_password=hash_password(settings.INITIAL_ADMIN_PASSWORD),
                display_name="Event Administrator",
                must_change_password=True,  # Require password change on first login
                is_active=True,
            )
            db.add(admin)
            await db.flush()
            logger.info(
                "Bootstrap admin created. Admin ID: %s. "
                "IMPORTANT: Change the password immediately after first login.",
                settings.INITIAL_ADMIN_ID,
            )
        else:
            logger.info("Admin user already exists. Skipping bootstrap.")

    # ─── Event ───
    existing_event = await db.execute(select(Event).where(Event.is_active == True))
    event = existing_event.scalar_one_or_none()

    if not event:
        event = Event(
            name="Hacktober 2026",
            tagline="Cybersecurity Quiz Challenge",
            description=(
                "Hacktober 2026 is the annual cybersecurity quiz competition organized by the "
                "Cyber Samurai Association of the Department of CSE – IoT and Cybersecurity "
                "including Blockchain Technology at Guru Nanak Dev Engineering College, Bidar."
            ),
            college_name="Guru Nanak Dev Engineering College, Bidar, Karnataka, India",
            department_name="Department of CSE – IoT and Cybersecurity including Blockchain Technology",
            timezone="Asia/Kolkata",
            competition_mode="individual",
            registration_open=True,
            is_active=True,
        )
        db.add(event)
        await db.flush()
        logger.info("Default event created: Hacktober 2026")

    # ─── Rounds ───
    existing_rounds = await db.execute(select(Round).where(Round.event_id == event.id))
    if not existing_rounds.scalars().all():
        rounds_data = [
            {
                "round_number": 1,
                "name": "Round 1 — Cyber Awareness",
                "description": "25 multiple-choice questions covering cybersecurity fundamentals, networking, and digital safety.",
                "duration_minutes": 20,
                "question_count": 25,
                "points_correct": 4.0,
                "points_incorrect": 0.0,
                "points_unanswered": 0.0,
                "max_score": 100.0,
                "qualification_count": 20,
                "violation_policy": "strict",
                "fullscreen_required": True,
                "randomize_questions": True,
                "randomize_options": True,
            },
            {
                "round_number": 2,
                "name": "Round 2 — Cyber Tech Challenge",
                "description": "15 technical questions on network security, cryptography, OWASP, ethical hacking, and Linux security.",
                "duration_minutes": 20,
                "question_count": 15,
                "points_correct": 10.0,
                "points_incorrect": 0.0,
                "points_unanswered": 0.0,
                "max_score": 150.0,
                "qualification_count": 8,
                "violation_policy": "strict",
                "fullscreen_required": True,
                "randomize_questions": True,
                "randomize_options": True,
            },
            {
                "round_number": 3,
                "name": "Round 3 — Cyber Masters Finale",
                "description": "10 advanced scenario-based questions for finalists. Tests deep knowledge of cybersecurity, incident response, and blockchain security.",
                "duration_minutes": 30,
                "question_count": 10,
                "points_correct": 20.0,
                "points_incorrect": 0.0,
                "points_unanswered": 0.0,
                "max_score": 200.0,
                "qualification_count": None,
                "violation_policy": "strict",
                "fullscreen_required": True,
                "randomize_questions": True,
                "randomize_options": True,
            },
        ]
        for rd in rounds_data:
            r = Round(event_id=event.id, **rd)
            db.add(r)
        logger.info("Default rounds created (R1, R2, R3).")

    # ─── Default Rules ───
    existing_rv = await db.execute(
        select(RulesVersion).where(
            and_(RulesVersion.event_id == event.id, RulesVersion.is_current == True)
        )
    )
    if not existing_rv.scalar_one_or_none():
        rv = RulesVersion(
            event_id=event.id,
            version="1.0",
            rules_html=DEFAULT_RULES_HTML,
            is_current=True,
        )
        db.add(rv)
        logger.info("Default rules v1.0 created.")

    await db.commit()
    logger.info("Database seeding complete.")
