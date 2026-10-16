"""
Quiz engine — round info, start attempt, save answers, submit, violations, timer.
"""
import json
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.core.deps import get_current_participant_with_consent
from app.models import (
    Participant, Round, Attempt, Answer, Question, AnswerOption,
    Violation, RoundStatus, AttemptStatus, ViolationType
)
from app.schemas.schemas import (
    RoundOut, StartAttemptResponse, SaveAnswerRequest, SaveAnswerResponse,
    SubmitAttemptResponse, AttemptStatusResponse, ViolationReport,
    ViolationResponse, QuestionOut, AnswerOptionOut
)

router = APIRouter(prefix="/quiz", tags=["Quiz"])


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _shuffle_questions(questions: list, seed: str) -> list:
    rng = random.Random(seed)
    questions_copy = list(questions)
    rng.shuffle(questions_copy)
    return questions_copy


def _shuffle_options(options: list, seed: str) -> list:
    rng = random.Random(seed)
    options_copy = list(options)
    rng.shuffle(options_copy)
    return options_copy


@router.get("/rounds", response_model=List[RoundOut])
async def get_rounds(
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    """Get all rounds and their current status."""
    from app.models import Event
    event_result = await db.execute(select(Event).where(Event.is_active == True))
    event = event_result.scalar_one_or_none()
    if not event:
        return []

    result = await db.execute(
        select(Round).where(Round.event_id == event.id).order_by(Round.round_number)
    )
    rounds = result.scalars().all()
    return [RoundOut.model_validate(r) for r in rounds]


@router.get("/rounds/{round_id}", response_model=RoundOut)
async def get_round(
    round_id: str,
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")
    return RoundOut.model_validate(round_)


@router.post("/rounds/{round_id}/start", response_model=StartAttemptResponse)
async def start_attempt(
    round_id: str,
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    """Start or resume a quiz attempt."""
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found.")

    if round_.status != RoundStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Round is not open. Current status: {round_.status.value}",
        )

    # Check existing attempt
    existing_result = await db.execute(
        select(Attempt).where(
            and_(
                Attempt.participant_id == participant.id,
                Attempt.round_id == round_id,
            )
        )
    )
    existing = existing_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if existing:
        if existing.status == AttemptStatus.IN_PROGRESS:
            # Resume existing attempt — check deadline
            if existing.deadline_at and _ensure_utc(existing.deadline_at) < now:
                # Timed out — finalize
                existing.status = AttemptStatus.TIMED_OUT
                await _finalize_attempt(existing, round_, db)
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your attempt has timed out and has been finalized.",
                )
            # Return existing attempt data
            questions = await _get_attempt_questions(existing, round_, db)
            return StartAttemptResponse(
                attempt_id=existing.id,
                round_id=round_id,
                deadline_at=existing.deadline_at,
                questions=questions,
                server_time=now,
            )
        elif existing.status in (AttemptStatus.SUBMITTED, AttemptStatus.TERMINATED, AttemptStatus.TIMED_OUT):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You have already completed this round. Status: {existing.status.value}",
            )

    # Create new attempt
    deadline = now + timedelta(minutes=round_.duration_minutes)

    # Get active questions for round
    q_result = await db.execute(
        select(Question).where(
            and_(Question.round_id == round_id, Question.is_active == True)
        )
    )
    all_questions = q_result.scalars().all()

    if len(all_questions) < round_.question_count:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Not enough active questions. Need {round_.question_count}, found {len(all_questions)}.",
        )

    # Shuffle and select questions
    seed = f"{participant.id}-{round_id}"
    if round_.randomize_questions:
        selected = _shuffle_questions(all_questions, seed)[: round_.question_count]
    else:
        selected = all_questions[: round_.question_count]

    q_order = [q.id for q in selected]
    opt_order_map = {}

    if round_.randomize_options:
        for q in selected:
            opt_result = await db.execute(
                select(AnswerOption).where(AnswerOption.question_id == q.id)
            )
            opts = opt_result.scalars().all()
            shuffled_opts = _shuffle_options(opts, f"{seed}-{q.id}")
            opt_order_map[q.id] = [o.id for o in shuffled_opts]

    attempt = Attempt(
        participant_id=participant.id,
        round_id=round_id,
        status=AttemptStatus.IN_PROGRESS,
        deadline_at=deadline,
        question_order=json.dumps(q_order),
        option_order_map=json.dumps(opt_order_map),
    )
    db.add(attempt)
    await db.flush()

    # Pre-create answer rows (unanswered)
    for q in selected:
        answer = Answer(
            attempt_id=attempt.id,
            question_id=q.id,
            selected_option_id=None,
        )
        db.add(answer)

    await db.commit()
    await db.refresh(attempt)

    questions = await _get_attempt_questions(attempt, round_, db)

    return StartAttemptResponse(
        attempt_id=attempt.id,
        round_id=round_id,
        deadline_at=deadline,
        questions=questions,
        server_time=now,
    )


async def _get_attempt_questions(
    attempt: Attempt, round_: Round, db: AsyncSession
) -> List[QuestionOut]:
    """Return questions in attempt order without correct answers."""
    q_order = json.loads(attempt.question_order or "[]")
    opt_order_map = json.loads(attempt.option_order_map or "{}")

    # Fetch all questions in one query
    q_result = await db.execute(
        select(Question).where(Question.id.in_(q_order))
    )
    questions_map = {q.id: q for q in q_result.scalars().all()}

    output = []
    for idx, q_id in enumerate(q_order):
        q = questions_map.get(q_id)
        if not q:
            continue

        # Fetch options
        opt_result = await db.execute(
            select(AnswerOption).where(AnswerOption.question_id == q_id)
        )
        all_opts = {o.id: o for o in opt_result.scalars().all()}

        # Apply option order
        if q_id in opt_order_map:
            opts_ordered = [all_opts[oid] for oid in opt_order_map[q_id] if oid in all_opts]
        else:
            opts_ordered = sorted(all_opts.values(), key=lambda o: o.display_order)

        # Build without correct answer
        options_out = [
            AnswerOptionOut(
                id=o.id,
                option_label=o.option_label,
                option_text=o.option_text,
                display_order=i,
            )
            for i, o in enumerate(opts_ordered)
        ]

        output.append(
            QuestionOut(
                id=q.id,
                question_text=q.question_text,
                topic=q.topic,
                difficulty=q.difficulty,
                point_value=q.point_value,
                code_snippet=q.code_snippet,
                image_url=q.image_url,
                options=options_out,
                display_order=idx,
            )
        )

    return output


@router.post("/attempts/{attempt_id}/save", response_model=SaveAnswerResponse)
async def save_answer(
    attempt_id: str,
    body: SaveAnswerRequest,
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    """Autosave an answer — idempotent."""
    now = datetime.now(timezone.utc)

    attempt = await _get_active_attempt(attempt_id, participant.id, db)

    # Check deadline
    if attempt.deadline_at and _ensure_utc(attempt.deadline_at) < now:
        attempt.status = AttemptStatus.TIMED_OUT
        round_result = await db.execute(select(Round).where(Round.id == attempt.round_id))
        round_ = round_result.scalar_one_or_none()
        if round_:
            await _finalize_attempt(attempt, round_, db)
        await db.commit()
        raise HTTPException(status_code=403, detail="Attempt has timed out.")

    # Validate question belongs to this attempt
    q_order = json.loads(attempt.question_order or "[]")
    if body.question_id not in q_order:
        raise HTTPException(status_code=400, detail="Question not part of this attempt.")

    # Validate option belongs to question (if provided)
    if body.selected_option_id:
        opt_result = await db.execute(
            select(AnswerOption).where(
                and_(
                    AnswerOption.id == body.selected_option_id,
                    AnswerOption.question_id == body.question_id,
                )
            )
        )
        if not opt_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Option does not belong to this question.")

    # Upsert answer
    ans_result = await db.execute(
        select(Answer).where(
            and_(Answer.attempt_id == attempt_id, Answer.question_id == body.question_id)
        )
    )
    answer = ans_result.scalar_one_or_none()

    if answer:
        answer.selected_option_id = body.selected_option_id
        answer.saved_at = now
        answer.client_saved_at = body.client_timestamp
    else:
        answer = Answer(
            attempt_id=attempt_id,
            question_id=body.question_id,
            selected_option_id=body.selected_option_id,
            saved_at=now,
            client_saved_at=body.client_timestamp,
        )
        db.add(answer)

    await db.commit()
    return SaveAnswerResponse(saved=True, question_id=body.question_id, server_timestamp=now)


@router.post("/attempts/{attempt_id}/submit", response_model=SubmitAttemptResponse)
async def submit_attempt(
    attempt_id: str,
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    """Final submission — score and finalize."""
    attempt = await _get_active_attempt(attempt_id, participant.id, db)

    round_result = await db.execute(select(Round).where(Round.id == attempt.round_id))
    round_ = round_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    attempt.status = AttemptStatus.SUBMITTED
    attempt.submitted_at = now

    await _finalize_attempt(attempt, round_, db)
    await db.commit()
    await db.refresh(attempt)

    return SubmitAttemptResponse(
        attempt_id=attempt.id,
        status=attempt.status.value,
        score=attempt.score,
        correct_count=attempt.correct_count,
        incorrect_count=attempt.incorrect_count,
        unanswered_count=attempt.unanswered_count,
        submitted_at=attempt.submitted_at,
        message="Your submission has been recorded successfully.",
    )


@router.get("/attempts/{attempt_id}/status", response_model=AttemptStatusResponse)
async def get_attempt_status(
    attempt_id: str,
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt).where(
            and_(Attempt.id == attempt_id, Attempt.participant_id == participant.id)
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    now = datetime.now(timezone.utc)
    seconds_remaining = None
    if attempt.deadline_at and attempt.status == AttemptStatus.IN_PROGRESS:
        seconds_remaining = max(0, (_ensure_utc(attempt.deadline_at) - now).total_seconds())

    ans_count_result = await db.execute(
        select(func.count(Answer.id)).where(
            and_(Answer.attempt_id == attempt_id, Answer.selected_option_id.is_not(None))
        )
    )
    answers_saved = ans_count_result.scalar() or 0

    return AttemptStatusResponse(
        attempt_id=attempt.id,
        status=attempt.status.value,
        deadline_at=attempt.deadline_at,
        server_time=now,
        seconds_remaining=seconds_remaining,
        answers_saved=answers_saved,
    )


@router.get("/attempts/{attempt_id}/answers")
async def get_attempt_answers(
    attempt_id: str,
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt).where(
            and_(Attempt.id == attempt_id, Attempt.participant_id == participant.id)
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    ans_result = await db.execute(
        select(Answer).where(Answer.attempt_id == attempt_id)
    )
    answers = ans_result.scalars().all()
    return {
        "attempt_id": attempt_id,
        "answers": {a.question_id: a.selected_option_id for a in answers if a.selected_option_id is not None}
    }


@router.post("/attempts/{attempt_id}/violation", response_model=ViolationResponse)
async def report_violation(
    attempt_id: str,
    body: ViolationReport,
    request: Request,
    participant: Participant = Depends(get_current_participant_with_consent),
    db: AsyncSession = Depends(get_db),
):
    """Record a proctoring violation event."""
    result = await db.execute(
        select(Attempt).where(
            and_(Attempt.id == attempt_id, Attempt.participant_id == participant.id)
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt or attempt.status != AttemptStatus.IN_PROGRESS:
        return ViolationResponse(
            recorded=False,
            resulted_in_termination=False,
            message="Attempt not active.",
        )

    # Map violation type
    try:
        vtype = ViolationType(body.violation_type)
    except ValueError:
        vtype = ViolationType.WINDOW_BLUR

    round_result = await db.execute(select(Round).where(Round.id == attempt.round_id))
    round_ = round_result.scalar_one_or_none()

    terminate = False
    if round_ and round_.violation_policy.value == "strict":
        terminate = True

    violation = Violation(
        attempt_id=attempt_id,
        participant_id=participant.id,
        violation_type=vtype,
        detected_at_client=body.detected_at,
        policy_applied=round_.violation_policy if round_ else None,
        resulted_in_termination=terminate,
    )
    db.add(violation)

    if terminate:
        attempt.status = AttemptStatus.TERMINATED
        attempt.termination_reason = f"Proctoring violation: {vtype.value}"
        if round_:
            await _finalize_attempt(attempt, round_, db)

    await db.commit()

    return ViolationResponse(
        recorded=True,
        resulted_in_termination=terminate,
        message=(
            "Your attempt has been terminated due to a proctoring violation."
            if terminate
            else "Violation recorded. This is a warning."
        ),
    )


async def _get_active_attempt(attempt_id: str, participant_id: str, db: AsyncSession) -> Attempt:
    result = await db.execute(
        select(Attempt).where(
            and_(
                Attempt.id == attempt_id,
                Attempt.participant_id == participant_id,
                Attempt.status == AttemptStatus.IN_PROGRESS,
            )
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active attempt not found. It may have already been finalized.",
        )
    return attempt


async def _finalize_attempt(attempt: Attempt, round_: Round, db: AsyncSession):
    """Score the attempt server-side."""
    now = datetime.now(timezone.utc)

    # Fetch all answers for this attempt
    ans_result = await db.execute(
        select(Answer).where(Answer.attempt_id == attempt.id)
    )
    answers = ans_result.scalars().all()

    # Fetch correct options in one query
    opt_ids = [a.selected_option_id for a in answers if a.selected_option_id]
    correct_opt_set: set = set()
    if opt_ids:
        opt_result = await db.execute(
            select(AnswerOption.id).where(
                and_(AnswerOption.id.in_(opt_ids), AnswerOption.is_correct == True)
            )
        )
        correct_opt_set = {row[0] for row in opt_result.all()}

    total_score = 0.0
    correct = 0
    incorrect = 0
    unanswered = 0

    for answer in answers:
        if answer.selected_option_id is None:
            answer.is_correct = None
            answer.points_awarded = round_.points_unanswered
            total_score += round_.points_unanswered
            unanswered += 1
        elif answer.selected_option_id in correct_opt_set:
            answer.is_correct = True
            answer.points_awarded = round_.points_correct
            total_score += round_.points_correct
            correct += 1
        else:
            answer.is_correct = False
            answer.points_awarded = round_.points_incorrect
            total_score += round_.points_incorrect
            incorrect += 1

    attempt.score = total_score
    attempt.correct_count = correct
    attempt.incorrect_count = incorrect
    attempt.unanswered_count = unanswered
    attempt.finalized_at = now
