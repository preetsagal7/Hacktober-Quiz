"""
Hacktober 2026 — Concurrency & Capacity Test Script (Phase 15)
Simulates concurrent participant entries, rules acceptance, quiz starts, and autosaves.
Usage: python tests/load_test.py --concurrency 50
"""
import asyncio
import time
import argparse
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app

async def simulate_participant(participant_num: int, round_id: str, results: list):
    usn = f"LOADTEST{participant_num:04d}"
    t0 = time.perf_counter()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        try:
            # 1. Login
            entry_res = await client.post("/api/v1/participant/entry", json={"usn": usn})
            if entry_res.status_code != 200:
                results.append((False, "entry", time.perf_counter() - t0))
                return
            token = entry_res.json()["session_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 2. Accept Rules
            rules_res = await client.get("/api/v1/participant/rules/current", headers=headers)
            if rules_res.status_code == 200:
                rules_id = rules_res.json()["id"]
                await client.post(
                    "/api/v1/participant/consent",
                    headers=headers,
                    json={"rules_version_id": rules_id, "accepted": True},
                )

            # 3. Start Quiz
            start_res = await client.post(f"/api/v1/quiz/rounds/{round_id}/start", headers=headers)
            if start_res.status_code != 200:
                results.append((False, "start", time.perf_counter() - t0))
                return
            attempt = start_res.json()
            attempt_id = attempt["attempt_id"]
            questions = attempt.get("questions", [])

            # 4. Autosave Answer
            if questions:
                q = questions[0]
                opt = q["options"][0]["id"]
                save_res = await client.post(
                    f"/api/v1/quiz/attempts/{attempt_id}/save",
                    headers=headers,
                    json={"question_id": q["id"], "selected_option_id": opt},
                )
                if save_res.status_code != 200:
                    results.append((False, "save", time.perf_counter() - t0))
                    return

            results.append((True, "success", time.perf_counter() - t0))
        except Exception as e:
            results.append((False, str(e), time.perf_counter() - t0))

async def main(concurrency: int):
    print(f"=== Hacktober 2026: Running Concurrency Test with {concurrency} simulated participants ===")
    from app.core.database import init_db, AsyncSessionLocal
    from app.core.seeder import seed_database
    from app.core.question_bank import seed_questions
    from app.models import Round
    from sqlalchemy import select

    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_database(session)
        await seed_questions(session)
        rounds_res = await session.execute(select(Round).order_by(Round.round_number))
        r1 = rounds_res.scalars().first()
        r1.status = "open"
        await session.commit()
        round_id = r1.id

    results = []
    t_start = time.perf_counter()
    tasks = [simulate_participant(i, round_id, results) for i in range(1, concurrency + 1)]
    await asyncio.gather(*tasks)
    total_time = time.perf_counter() - t_start

    successful = [r for r in results if r[0]]
    failed = [r for r in results if not r[0]]
    avg_latency = sum(r[2] for r in results) / len(results) if results else 0

    print(f"Total Completed: {len(results)} in {total_time:.2f}s")
    print(f"Successful: {len(successful)} ({len(successful)/len(results)*100:.1f}%)")
    print(f"Failed: {len(failed)}")
    print(f"Average Request Chain Latency: {avg_latency*1000:.1f} ms")
    print(f"Throughput: {len(results)/total_time:.1f} simulated users/sec")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--concurrency", type=int, default=30)
    args = parser.parse_args()
    asyncio.run(main(args.concurrency))
