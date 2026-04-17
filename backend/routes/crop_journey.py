import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from models.crop_journey import (
    QuestionsRequest,
    FollowupRequest,
    AnalyzeRequest,
    StartJourneyRequest,
    TaskUpdateRequest,
    PhotoCheckRequest,
    UpdatePlanRequest,
    CompleteJourneyRequest,
)
from services.crop_ai import (
    generate_onboarding_questions,
    generate_followup_questions,
    analyze_and_recommend,
    generate_task_calendar,
    analyze_crop_photo,
    update_plan_for_conditions,
    generate_journey_report,
)
from services.weather_api import get_weather
from services.subsidy_rss import fetch_subsidy_alerts

router = APIRouter()

_journeys: dict[str, dict[str, Any]] = {}


# ── Onboarding ────────────────────────────────────────────────────────────────

@router.post("/questions")
async def get_questions(req: QuestionsRequest):
    # Fetch weather first so questions are weather-aware
    weather = await get_weather(req.location)
    questions = await generate_onboarding_questions(
        req.location, req.month, req.land_photo_b64, weather
    )
    return {"questions": questions, "weather": weather}


@router.post("/followup-questions")
async def get_followup_questions(req: FollowupRequest):
    weather = await get_weather(req.location)
    questions = await generate_followup_questions(
        req.location, req.month, req.initial_answers, weather
    )
    return {"questions": questions, "has_followup": len(questions) > 0}


@router.post("/analyze")
async def analyze_land(req: AnalyzeRequest):
    weather = await get_weather(req.location)
    recommendation = await analyze_and_recommend(
        req.location, req.month, req.answers, weather, req.land_photo_b64
    )
    return {"recommendation": recommendation, "weather": weather}


# ── Journey Lifecycle ─────────────────────────────────────────────────────────

@router.post("/start")
async def start_journey(req: StartJourneyRequest):
    journey_id = str(uuid.uuid4())[:8]

    # Fetch fresh weather to embed seasonal context into calendar
    weather = await get_weather(req.location)

    calendar = await generate_task_calendar(
        req.crop_type,
        req.sowing_date,
        req.location,
        req.land_size_acres,
        req.irrigation_type,
        weather,
    )

    tasks_total = sum(len(w.get("tasks", [])) for w in calendar)

    _journeys[journey_id] = {
        "journey_id": journey_id,
        "farmer_id": req.farmer_id,
        "crop_type": req.crop_type,
        "location": req.location,
        "sowing_date": req.sowing_date,
        "land_size_acres": req.land_size_acres,
        "irrigation_type": req.irrigation_type,
        "answers": req.answers,
        "task_calendar": calendar,
        "completed_tasks": [],
        "photo_checks": [],
        "plan_updates_count": 0,
        "plan_update_log": [],
        "total_weeks": len(calendar),
        "tasks_completed": 0,
        "tasks_total": tasks_total,
        "status": "active",
        "final_grade": None,
        "selling_price_per_kg": None,
        "total_income": None,
        "buyer_name": None,
        "report": None,
    }

    return {
        "journey_id": journey_id,
        "total_weeks": len(calendar),
        "tasks_total": tasks_total,
        "crop_type": req.crop_type,
    }


@router.get("/{journey_id}")
async def get_journey(journey_id: str):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")
    return _journeys[journey_id]


@router.get("/{journey_id}/weather")
async def get_journey_weather(journey_id: str):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")
    return await get_weather(_journeys[journey_id]["location"])


# ── Task Management ───────────────────────────────────────────────────────────

@router.post("/{journey_id}/task")
async def update_task(journey_id: str, req: TaskUpdateRequest):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")

    j = _journeys[journey_id]
    done: list = j["completed_tasks"]

    if req.completed and req.task_id not in done:
        done.append(req.task_id)
    elif not req.completed and req.task_id in done:
        done.remove(req.task_id)

    j["tasks_completed"] = len(done)
    return {"tasks_completed": j["tasks_completed"], "tasks_total": j["tasks_total"]}


# ── Photo Health Check ────────────────────────────────────────────────────────

@router.post("/{journey_id}/photo-check")
async def photo_check(journey_id: str, req: PhotoCheckRequest):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")

    j = _journeys[journey_id]
    # Pass fresh weather for context-aware analysis
    weather = await get_weather(j["location"])
    analysis = await analyze_crop_photo(
        req.photo_b64, j["crop_type"], req.stage, req.week, weather
    )

    j["photo_checks"].append({"week": req.week, "stage": req.stage, **analysis})
    return analysis


# ── Adaptive Plan Update ──────────────────────────────────────────────────────

@router.post("/{journey_id}/update-plan")
async def update_plan(journey_id: str, req: UpdatePlanRequest):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")

    j = _journeys[journey_id]

    # Get fresh weather
    weather = await get_weather(j["location"])

    # Get latest photo check result if trigger is photo_check
    latest_photo = None
    if req.trigger == "photo_check" and j["photo_checks"]:
        latest_photo = j["photo_checks"][-1]

    updated_weeks = await update_plan_for_conditions(
        j, req.current_week, weather, latest_photo
    )

    if updated_weeks:
        # Merge updated weeks back into calendar
        updated_map = {w["week"]: w for w in updated_weeks}
        j["task_calendar"] = [
            updated_map.get(w["week"], w) for w in j["task_calendar"]
        ]
        j["tasks_total"] = sum(len(w.get("tasks", [])) for w in j["task_calendar"])
        j["plan_updates_count"] = j.get("plan_updates_count", 0) + 1
        j["plan_update_log"].append({
            "week": req.current_week,
            "trigger": req.trigger,
            "weeks_updated": len(updated_weeks),
        })

    return {
        "updated": len(updated_weeks) > 0,
        "weeks_updated": len(updated_weeks),
        "task_calendar": j["task_calendar"],
        "tasks_total": j["tasks_total"],
    }


# ── Subsidies ─────────────────────────────────────────────────────────────────

@router.get("/{journey_id}/subsidies")
async def get_subsidies(journey_id: str):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")

    j = _journeys[journey_id]
    state = j["location"].split(",")[-1].strip() if "," in j["location"] else j["location"]
    alerts = await fetch_subsidy_alerts(j["crop_type"], state)
    return {"alerts": alerts}


# ── Complete Journey ──────────────────────────────────────────────────────────

@router.post("/{journey_id}/complete")
async def complete_journey(journey_id: str, req: CompleteJourneyRequest):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")

    j = _journeys[journey_id]
    j["status"] = "completed"
    j["selling_price_per_kg"] = req.selling_price_per_kg
    j["final_grade"] = req.final_grade
    j["buyer_name"] = req.buyer_name
    if req.quantity_sold_kg:
        j["total_income"] = round(req.selling_price_per_kg * req.quantity_sold_kg, 2)

    j["report"] = await generate_journey_report(j)
    return {"status": "completed", "report": j["report"]}


@router.get("/{journey_id}/report")
async def get_report(journey_id: str):
    if journey_id not in _journeys:
        raise HTTPException(status_code=404, detail="Journey not found")

    j = _journeys[journey_id]
    if not j.get("report"):
        j["report"] = await generate_journey_report(j)
    return j["report"]
