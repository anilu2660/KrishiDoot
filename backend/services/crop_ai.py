"""
Gemini-powered crop lifecycle AI.
Covers: weather-aware questions, adaptive follow-up, rich task calendar with
per-week weather forecasts, photo health check, plan updates, journey report.
"""
import base64
import json
from datetime import datetime, timedelta

from google import genai
from google.genai import types as genai_types

from config import settings

CROP_DURATIONS = {
    "wheat": 130, "rice": 150, "cotton": 180, "tomato": 90,
    "onion": 120, "soybean": 100, "maize": 110, "mustard": 110,
    "gram": 100, "sugarcane": 360, "potato": 90, "groundnut": 120,
}


def _client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _extract(text: str, bracket: str = "{") -> str:
    close = "}" if bracket == "{" else "]"
    s = text.find(bracket)
    e = text.rfind(close) + 1
    if s == -1 or e == 0:
        raise ValueError("No JSON found")
    return text[s:e]


def _decode_b64(b64: str) -> tuple[str, bytes]:
    b64 = b64.strip()
    if b64.startswith("data:") and "," in b64:
        header, raw = b64.split(",", 1)
        mime = header.split(";")[0].replace("data:", "") or "image/jpeg"
        return mime, base64.b64decode(raw)
    return "image/jpeg", base64.b64decode(b64)


def _weather_summary(weather: dict) -> str:
    if not weather or not weather.get("current"):
        return "Weather data unavailable"
    wc = weather["current"]
    lines = [f"Now: {wc['temp_c']}°C, {wc['humidity']}% humidity, {wc['desc']}"]
    for d in weather.get("forecast", [])[:3]:
        lines.append(f"{d['date']}: {d['min_c']}-{d['max_c']}°C, rain {d['precip_mm']}mm, {d['desc']}")
    if weather.get("advisory"):
        lines.append(f"Advisory: {weather['advisory']}")
    return "\n".join(lines)


# ── Round 1 — Onboarding Questions (weather-aware) ──────────────────────────

async def generate_onboarding_questions(location: str, month: int,
                                         land_photo_b64: str = None,
                                         weather: dict = None) -> list:
    if not settings.GEMINI_API_KEY:
        return _fallback_questions()

    month_name = datetime(2025, month, 1).strftime("%B")
    contents: list = []

    if land_photo_b64:
        mime, img_bytes = _decode_b64(land_photo_b64)
        contents.append(genai_types.Part.from_bytes(data=img_bytes, mime_type=mime))

    wx = _weather_summary(weather) if weather else "Not available"

    photo_note = ""
    if land_photo_b64:
        photo_note = (
            "\nIMPORTANT: Analyze the land photo. For any question whose answer is "
            "clearly visible (soil colour, terrain, water body, crop residue), add "
            '"detected_from_photo": "<exact option string>". Only set when confident.'
        )

    contents.append(f"""You are KrishiDoot AI — expert Indian agricultural advisor.
{"Land photo attached (see above)." if land_photo_b64 else ""}
Location: {location} | Month: {month_name}
Current weather + 3-day forecast:
{wx}
{photo_note}

Generate exactly 6 Hinglish questions covering: soil type/colour, irrigation source,
land size (acres), last crop grown, budget per acre, farming experience.
Make questions WEATHER-AWARE: if current humidity is high mention disease risk; if
forecast shows no rain ask about irrigation backup; if cold season ask about frost protection.

Return ONLY valid JSON array (no markdown):
[
  {{"id":"q1","question":"Zameen ki mitti kaisi hai?","type":"choice",
    "options":["Kali (Black - cotton soil)","Laal (Red/Laterite)","Bhoori (Loamy)","Reti (Sandy)"]}},
  {{"id":"q2","question":"Kitne acre zameen hai?","type":"number","unit":"acres","min":0.1,"max":100}},
  {{"id":"q3","question":"Sinchai ka source?","type":"choice",
    "options":["Nalkoop (Borewell)","Nahar (Canal)","Barish par nirbhar","Talab / Pond"]}},
  {{"id":"q4","question":"Pichli fasal?","type":"choice",
    "options":["Gehun","Chawal","Daal","Kapas","Kuch nahi (Fallow)"]}},
  {{"id":"q5","question":"Kheti ka anubhav?","type":"choice",
    "options":["2 saal se kam","2-5 saal","5-15 saal","15+ saal"]}},
  {{"id":"q6","question":"Acre per budget?","type":"choice",
    "options":["₹5,000 tak","₹5,000-15,000","₹15,000-30,000","₹30,000+"]}}
]
Example with photo detection: {{"id":"q1",...,"detected_from_photo":"Kali (Black - cotton soil)"}}""")

    try:
        r = await _client().aio.models.generate_content(model="gemini-2.5-flash", contents=contents)
        return json.loads(_extract(r.text, "["))
    except Exception as exc:
        print(f"[crop_ai] questions failed: {exc}")
        return _fallback_questions()


def _fallback_questions() -> list:
    return [
        {"id": "q1", "question": "Mitti ka rang?", "type": "choice",
         "options": ["Kali (Black)", "Laal (Red)", "Bhoori (Brown)", "Reti (Sandy)"]},
        {"id": "q2", "question": "Kitne acre?", "type": "number", "unit": "acres", "min": 0.1, "max": 100},
        {"id": "q3", "question": "Pani ka source?", "type": "choice",
         "options": ["Borewell", "Canal", "Rain-fed", "Pond/River"]},
        {"id": "q4", "question": "Pichli fasal?", "type": "choice",
         "options": ["Gehun", "Chawal", "Daal", "Kuch nahi"]},
        {"id": "q5", "question": "Kheti ka anubhav?", "type": "choice",
         "options": ["Naya (<2 saal)", "Thoda (2-5 saal)", "Anubhavi (5-15 saal)", "Maahir (15+)"]},
        {"id": "q6", "question": "Acre per budget?", "type": "choice",
         "options": ["₹5,000 tak", "₹5,000-15,000", "₹15,000-30,000", "₹30,000+"]},
    ]


# ── Round 2 — Adaptive Follow-up Questions ──────────────────────────────────

async def generate_followup_questions(location: str, month: int,
                                       initial_answers: dict,
                                       weather: dict) -> list:
    """AI decides if follow-up questions are needed based on answers + weather.
    Returns [] when no follow-up is required (proceed directly to recommendation)."""
    if not settings.GEMINI_API_KEY:
        return []

    month_name = datetime(2025, month, 1).strftime("%B")
    wx = _weather_summary(weather) if weather else "Not available"

    prompt = f"""You are KrishiDoot AI. A farmer just answered initial onboarding questions.
Decide if CRITICAL follow-up information is still missing.

Location: {location} | Month: {month_name}
Weather:
{wx}

Farmer's initial answers:
{json.dumps(initial_answers, ensure_ascii=False, indent=2)}

Rules:
- Only ask follow-up if truly critical for safe crop planning (drainage, equipment, disease history, water depth)
- If rain-fed + dry forecast → ask about backup water
- If high humidity forecast → ask about pesticide sprayer availability
- If new farmer (<2 years) + expensive crop → ask about training/support
- If large land (>5 acres) + manual labour only → ask about labour availability
- If borewell → ask approximate water depth (affects irrigation schedule)
- If previous crop had disease issues → ask about soil treatment done
- MAXIMUM 3 follow-up questions. Return [] if nothing critical missing.

Return ONLY valid JSON array ([] for none, or 2-3 questions):
[
  {{
    "id": "fq1",
    "question": "Borewell mein pani kitni gehraai par milta hai?",
    "type": "choice",
    "options": ["50 feet se kam", "50-100 feet", "100-200 feet", "200+ feet"],
    "why_asking": "Irrigation schedule depends on borewell depth"
  }}
]
types: choice | number | yes_no (options: ["Haan","Nahi"])"""

    try:
        r = await _client().aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        result = json.loads(_extract(r.text, "["))
        return result if isinstance(result, list) else []
    except Exception as exc:
        print(f"[crop_ai] followup failed: {exc}")
        return []


# ── Crop Recommendation ──────────────────────────────────────────────────────

async def analyze_and_recommend(location: str, month: int, answers: dict,
                                  weather: dict, land_photo_b64: str = None) -> dict:
    if not settings.GEMINI_API_KEY:
        return _fallback_rec()

    month_name = datetime(2025, month, 1).strftime("%B")
    contents: list = []

    if land_photo_b64:
        mime, img_bytes = _decode_b64(land_photo_b64)
        contents.append(genai_types.Part.from_bytes(data=img_bytes, mime_type=mime))

    wx = _weather_summary(weather) if weather else "Not available"

    contents.append(f"""You are KrishiDoot AI. Analyze and recommend the best crop for this Indian farmer.

Location: {location} | Month: {month_name}
{"Land photo attached." if land_photo_b64 else ""}
Weather (current + 3-day forecast):
{wx}

All farmer answers (rounds 1 + 2):
{json.dumps(answers, ensure_ascii=False, indent=2)}

Consider: soil type, water availability, current season, weather risk, budget, experience.
Factor in the weather forecast — e.g. if rain expected, avoid crops that need immediate dry sowing.

Return ONLY valid JSON (no markdown):
{{
  "recommended_crop": "wheat",
  "alternative_crops": ["mustard","gram"],
  "soil_assessment": "2 line Hinglish assessment based on answers + photo",
  "why_this_crop": "2-3 line Hinglish reasoning including weather fit",
  "weather_fit": "Why current season weather suits this crop",
  "expected_yield_per_acre": "18-22 quintal",
  "expected_income_per_acre": "₹45,000-55,000",
  "key_risks": ["Paala risk (temp <5°C forecast)", "Kum baarish"],
  "weather_warnings": ["Baarish ke baad hi beejai kare — mitti nam honi chahiye"],
  "best_sowing_window": "Nov 1 - Nov 15",
  "confidence": 82
}}""")

    try:
        r = await _client().aio.models.generate_content(model="gemini-2.5-flash", contents=contents)
        return json.loads(_extract(r.text))
    except Exception as exc:
        print(f"[crop_ai] recommend failed: {exc}")
        return _fallback_rec()


def _fallback_rec() -> dict:
    return {
        "recommended_crop": "wheat",
        "alternative_crops": ["mustard", "gram"],
        "soil_assessment": "Mitti ki jaankari ke liye photo chahiye",
        "why_this_crop": "Rabi season mein gehun sabse suitable fasal hai",
        "weather_fit": "November mein cool-dry weather gehun ke liye ideal hai",
        "expected_yield_per_acre": "15-20 quintal",
        "expected_income_per_acre": "₹35,000-50,000",
        "key_risks": ["Kum baarish", "Keeton ka hamlaa"],
        "weather_warnings": [],
        "best_sowing_window": "Nov 1 - Nov 20",
        "confidence": 50,
    }


# ── Weather-Integrated Task Calendar ────────────────────────────────────────

async def generate_task_calendar(crop_type: str, sowing_date: str, location: str,
                                   land_size_acres: float, irrigation_type: str,
                                   weather: dict = None) -> list:
    if not settings.GEMINI_API_KEY:
        return _fallback_calendar(crop_type)

    duration = CROP_DURATIONS.get(crop_type.lower(), 120)
    weeks = (duration // 7) + 1
    wx = _weather_summary(weather) if weather else "Not available"

    # Build a week-by-week date map
    sow = datetime.strptime(sowing_date, "%Y-%m-%d")
    week_dates = [
        {
            "week": w,
            "start": (sow + timedelta(days=(w - 1) * 7)).strftime("%b %d"),
            "end": (sow + timedelta(days=w * 7 - 1)).strftime("%b %d"),
            "month": (sow + timedelta(days=(w - 1) * 7)).strftime("%B"),
        }
        for w in range(1, weeks + 1)
    ]

    prompt = f"""Generate a complete, weather-aware farming task calendar for {crop_type} in India.

Sowing date: {sowing_date} | Location: {location}
Land: {land_size_acres} acres | Irrigation: {irrigation_type}
Duration: ~{duration} days ({weeks} weeks)

Current weather + 3-day forecast:
{wx}

Week date schedule:
{json.dumps(week_dates, indent=2)}

For EACH week generate:
1. expected_weather — realistic seasonal forecast for that month/week in {location}
   (use your knowledge of Indian seasonal patterns for that region + month)
2. Tasks with weather-specific conditions
3. weather_advisory — critical warning if any (frost, rain window, heat stress, pest pressure)
4. week_cost_estimate — total input cost for the week (₹/acre)
5. critical_window — true if timing is critical (sowing, fertilizer, spray windows)

Return ONLY valid JSON array (no markdown):
[
  {{
    "week": 1,
    "stage": "Beejai (Sowing)",
    "date_range": "Nov 05 - Nov 11",
    "days_range": "Day 1-7",
    "expected_weather": {{
      "temp_range": "18-28°C",
      "rain_mm_week": 5,
      "humidity_pct": 55,
      "frost_risk": false,
      "heat_stress": false,
      "conditions": "Cool and dry — ideal for sowing"
    }},
    "weather_advisory": "Mitti mein 50% nami ho tabhi beejai kare",
    "week_cost_estimate": "₹2,400",
    "critical_window": true,
    "tasks": [
      {{
        "task_id": "w1_t1",
        "title": "Khet ki tayaari aur beejai",
        "desc": "2-3 jotaai ke baad beejai 4-5 cm gehraai mein kare",
        "category": "sowing",
        "weather_condition": "Only sow if soil moisture >50% — delay if very dry",
        "water_liters_per_acre": 4000,
        "inputs": [{{"name": "Certified Seed", "quantity": "40 kg/acre", "cost_approx": "₹1200"}},
                   {{"name": "DAP Basal", "quantity": "50 kg/acre", "cost_approx": "₹1400"}}],
        "photo_needed": true,
        "critical": true
      }}
    ]
  }}
]
categories: sowing|irrigation|fertilizer|pesticide|weeding|observation|harvest
Set photo_needed=true for week 1, any disease/spray week, harvest week.
Include EVERY week with realistic seasonal weather. Cover all {weeks} weeks.
Task titles in Hinglish."""

    try:
        r = await _client().aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return json.loads(_extract(r.text, "["))
    except Exception as exc:
        print(f"[crop_ai] calendar failed: {exc}")
        return _fallback_calendar(crop_type)


def _fallback_calendar(crop_type: str) -> list:
    duration = CROP_DURATIONS.get(crop_type.lower(), 120)
    stages = ["Beejai", "Ugaav", "Vegetative", "Flowering", "Maturity", "Harvest"]
    total = (duration // 7) + 1
    return [
        {
            "week": w,
            "stage": stages[min(int((w / total) * len(stages)), len(stages) - 1)],
            "date_range": "",
            "days_range": f"Day {(w-1)*7+1}-{w*7}",
            "expected_weather": {
                "temp_range": "20-30°C", "rain_mm_week": 5, "humidity_pct": 60,
                "frost_risk": False, "heat_stress": False, "conditions": "Seasonal",
            },
            "weather_advisory": "",
            "week_cost_estimate": "₹500",
            "critical_window": w in (1, total),
            "tasks": [
                {
                    "task_id": f"w{w}_t1",
                    "title": "Khet ka nireekshan",
                    "desc": "Paudhe ki growth aur bimari dekhe",
                    "category": "observation",
                    "weather_condition": "",
                    "water_liters_per_acre": 3000 if w % 2 == 0 else 0,
                    "inputs": [],
                    "photo_needed": w in (1, total),
                    "critical": w == total,
                }
            ],
        }
        for w in range(1, total + 1)
    ]


# ── Adaptive Plan Update ─────────────────────────────────────────────────────

async def update_plan_for_conditions(journey: dict, current_week: int,
                                      fresh_weather: dict,
                                      photo_result: dict = None) -> list:
    """Re-generate remaining weeks based on fresh weather + photo check result.
    Returns only the updated future weeks (week > current_week)."""
    if not settings.GEMINI_API_KEY:
        return []

    crop_type = journey.get("crop_type", "wheat")
    remaining_calendar = [w for w in journey.get("task_calendar", []) if w["week"] > current_week]
    if not remaining_calendar:
        return []

    wx = _weather_summary(fresh_weather)
    photo_context = ""
    if photo_result:
        photo_context = f"""
Latest crop photo check (Week {photo_result.get('week', current_week)}):
- Health score: {photo_result.get('health_score', 75)}/100
- Status: {photo_result.get('status', 'healthy')}
- Observations: {', '.join(photo_result.get('observations', []))}
- Immediate action: {photo_result.get('immediate_action', '')}"""

    prompt = f"""You are KrishiDoot AI. Update the remaining farming task calendar based on new conditions.

Crop: {crop_type} | Location: {journey.get('location')}
Current week: {current_week} (already completed up to this point)
{photo_context}

Fresh weather data:
{wx}

Current remaining plan (weeks {current_week+1} onwards):
{json.dumps(remaining_calendar, indent=2)}

TASK: Update the remaining weeks to reflect:
1. New weather forecast — adjust irrigation, spray windows, frost protection
2. Photo health result — if diseased/stressed, add immediate corrective tasks
3. If weather risk detected — add precautionary tasks (e.g. fungicide if high humidity forecast)
4. Keep changes minimal — only update what the weather/health situation demands
5. Add a "plan_change_reason" field to weeks you modified

Return ONLY the updated remaining weeks as valid JSON array (no markdown).
Preserve task_ids for unchanged tasks. Use new task_ids (e.g. "w5_t3_new") for added tasks."""

    try:
        r = await _client().aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        updated = json.loads(_extract(r.text, "["))
        return updated if isinstance(updated, list) else []
    except Exception as exc:
        print(f"[crop_ai] update_plan failed: {exc}")
        return []


# ── Crop Photo Health Check ──────────────────────────────────────────────────

async def analyze_crop_photo(photo_b64: str, crop_type: str, stage: str,
                               week: int, weather: dict = None) -> dict:
    if not settings.GEMINI_API_KEY:
        return _fallback_photo(week)

    mime, img_bytes = _decode_b64(photo_b64)
    img_part = genai_types.Part.from_bytes(data=img_bytes, mime_type=mime)

    wx = _weather_summary(weather) if weather else "Not available"

    prompt = f"""Analyze this {crop_type} crop field photo. Stage: {stage} (Week {week}).

Current weather context:
{wx}

Return ONLY valid JSON (no markdown):
{{
  "health_score": 85,
  "status": "healthy",
  "observations": ["Patta hara aur healthy", "Koyi bimari nahi dikh rahi"],
  "weather_related_risks": ["High humidity — monitor for fungal spots next week"],
  "immediate_action": "Agli hafte nitrogen top-dressing kare",
  "do_not_do": ["Abhi pesticide mat chhidke — baarish forecast hai"],
  "subsidy_claim_tip": "Fasal Bima Yojana: nuksaan par claim kare",
  "plan_update_needed": false,
  "plan_update_reason": "",
  "next_check_week": {week + 2}
}}
status: healthy|mild_stress|diseased|pest_attack|nutrient_deficiency|drought_stress
Set plan_update_needed=true if health_score < 65 or disease/pest detected.
Observations, actions in Hinglish. Factor in weather when giving advice."""

    try:
        r = await _client().aio.models.generate_content(model="gemini-2.5-flash", contents=[img_part, prompt])
        return json.loads(_extract(r.text))
    except Exception as exc:
        print(f"[crop_ai] photo check failed: {exc}")
        return _fallback_photo(week)


def _fallback_photo(week: int) -> dict:
    return {
        "health_score": 70, "status": "healthy",
        "observations": ["Photo analysis unavailable — manual check kare"],
        "weather_related_risks": [],
        "immediate_action": "Dobara try kare",
        "do_not_do": [],
        "subsidy_claim_tip": "",
        "plan_update_needed": False,
        "plan_update_reason": "",
        "next_check_week": week + 2,
    }


# ── Journey Report ────────────────────────────────────────────────────────────

async def generate_journey_report(journey: dict) -> dict:
    if not settings.GEMINI_API_KEY:
        return _fallback_report()

    done = len(journey.get("completed_tasks", []))
    total = sum(len(w.get("tasks", [])) for w in journey.get("task_calendar", []))
    photo_checks = journey.get("photo_checks", [])
    avg_health = (
        round(sum(p.get("health_score", 75) for p in photo_checks) / len(photo_checks))
        if photo_checks else "N/A"
    )
    plan_updates = journey.get("plan_updates_count", 0)

    prompt = f"""Generate a complete Indian farming journey summary report.

Crop: {journey.get("crop_type")} | Location: {journey.get("location")}
Land: {journey.get("land_size_acres")} acres | Sowing: {journey.get("sowing_date")}
Tasks completed: {done}/{total} ({round(done/total*100) if total else 0}%)
Photo health checks: {len(photo_checks)} (avg health score: {avg_health}/100)
Plan adaptations made: {plan_updates}
Final grade: {journey.get("final_grade", "B")}
Selling price: ₹{journey.get("selling_price_per_kg", 0)}/kg
Total income: ₹{journey.get("total_income", 0)}

Return ONLY valid JSON (no markdown):
{{
  "summary_hinglish": "Is baar ki kheti...",
  "total_cost_estimate": "₹28,000",
  "net_profit_estimate": "₹42,000",
  "yield_achieved": "18 quintal/acre",
  "roi_percent": 65,
  "weather_impact": "Season mein mausam kaafi acha raha — yield average se 10% zyada",
  "highlights": ["Samay par pani diya", "2 baar photo check kiya"],
  "lessons": ["Agle baar DAP pehle dalna", "July mein fungicide spray zaroori hai"],
  "next_season_tip": "Agle rabi mein sarson try kare — mitti ke liye achha",
  "care_score": 82
}}"""

    try:
        r = await _client().aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return json.loads(_extract(r.text))
    except Exception as exc:
        print(f"[crop_ai] report failed: {exc}")
        return _fallback_report()


def _fallback_report() -> dict:
    return {
        "summary_hinglish": "Aapki kheti ki journey poori ho gayi. Badhai ho!",
        "total_cost_estimate": "₹25,000",
        "net_profit_estimate": "₹35,000",
        "yield_achieved": "15-18 quintal/acre",
        "roi_percent": 40,
        "weather_impact": "Seasonal weather was typical for the region",
        "highlights": ["Fasal poori ki", "Record rakha"],
        "lessons": ["AI advisory follow karte rahe"],
        "next_season_tip": "Mitti test karwaaye agle season se pehle",
        "care_score": 75,
    }
