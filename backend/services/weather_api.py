"""
Weather data via wttr.in — free, no API key required.
Falls back to Gemini AI-generated weather if wttr.in is unavailable.
"""
import json
import time
from datetime import datetime, timedelta

import httpx

_cache: dict[str, tuple[float, dict]] = {}
_TTL = 300  # 5 minutes


async def get_weather(location: str) -> dict:
    now = time.time()
    if location in _cache and now - _cache[location][0] < _TTL:
        return _cache[location][1]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://wttr.in/{location}?format=j1",
                headers={"Accept-Language": "en"},
            )
            data = r.json()

        cur = data["current_condition"][0]
        days = data.get("weather", [])[:5]

        result = {
            "location": location,
            "source": "wttr.in",
            "current": {
                "temp_c": int(cur["temp_C"]),
                "feels_like_c": int(cur["FeelsLikeC"]),
                "humidity": int(cur["humidity"]),
                "desc": cur["weatherDesc"][0]["value"],
                "wind_kmph": int(cur["windspeedKmph"]),
                "precip_mm": float(cur.get("precipMM", 0)),
            },
            "forecast": [
                {
                    "date": d["date"],
                    "max_c": int(d["maxtempC"]),
                    "min_c": int(d["mintempC"]),
                    "avg_c": int(d["avgtempC"]),
                    "precip_mm": round(sum(float(h.get("precipMM", 0)) for h in d["hourly"]), 1),
                    "desc": d["hourly"][4]["weatherDesc"][0]["value"],
                }
                for d in days
            ],
            "advisory": _advisory_from_raw(cur, days),
        }
        _cache[location] = (now, result)
        return result

    except Exception:
        # Fall back to Gemini-generated realistic weather
        result = await _gemini_weather_fallback(location)
        _cache[location] = (now, result)
        return result


async def _gemini_weather_fallback(location: str) -> dict:
    """Generate realistic weather using Gemini when wttr.in is unavailable."""
    try:
        from google import genai
        from config import settings

        if not settings.GEMINI_API_KEY:
            raise ValueError("No Gemini key")

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        month = datetime.now().strftime("%B")
        today = datetime.now()
        dates = [(today + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]

        prompt = f"""Generate realistic current weather data for {location}, India in {month}.
Use your knowledge of Indian regional climate patterns. Today: {dates[0]}

Return ONLY valid JSON (no markdown):
{{
  "current": {{
    "temp_c": 28,
    "feels_like_c": 30,
    "humidity": 60,
    "desc": "Partly Cloudy",
    "wind_kmph": 12,
    "precip_mm": 0.0
  }},
  "forecast": [
    {{"date": "{dates[0]}", "max_c": 35, "min_c": 22, "avg_c": 28, "precip_mm": 0, "desc": "Sunny"}},
    {{"date": "{dates[1]}", "max_c": 34, "min_c": 23, "avg_c": 28, "precip_mm": 0, "desc": "Clear"}},
    {{"date": "{dates[2]}", "max_c": 33, "min_c": 21, "avg_c": 27, "precip_mm": 3, "desc": "Partly Cloudy"}},
    {{"date": "{dates[3]}", "max_c": 32, "min_c": 20, "avg_c": 26, "precip_mm": 0, "desc": "Clear"}},
    {{"date": "{dates[4]}", "max_c": 36, "min_c": 24, "avg_c": 30, "precip_mm": 0, "desc": "Hot and Sunny"}}
  ]
}}
Fill REALISTIC temperatures/humidity/rain for {location} in {month}. All 5 forecast entries required."""

        r = await client.aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        text = r.text
        s = text.find('{')
        e = text.rfind('}') + 1
        data = json.loads(text[s:e])

        cur = data["current"]
        rain_tomorrow = data["forecast"][1]["precip_mm"] if len(data.get("forecast", [])) > 1 else 0
        advisory = _advisory_values(cur["temp_c"], cur["humidity"], rain_tomorrow)

        return {
            "location": location,
            "source": "ai_estimate",
            "current": cur,
            "forecast": data.get("forecast", []),
            "advisory": advisory,
        }
    except Exception:
        return _static_fallback(location)


def _advisory_from_raw(cur: dict, forecast: list) -> str:
    temp = int(cur["temp_C"])
    humidity = int(cur["humidity"])
    rain_tomorrow = (
        sum(float(h.get("precipMM", 0)) for h in forecast[1]["hourly"])
        if len(forecast) > 1 else 0
    )
    return _advisory_values(temp, humidity, rain_tomorrow)


def _advisory_values(temp: int, humidity: int, rain_tomorrow: float) -> str:
    tips = []
    if humidity > 80:
        tips.append("Nami zyada — fungal disease se bachao")
    if temp > 38:
        tips.append("Bahut garmi — sham ko pani de")
    if rain_tomorrow > 5:
        tips.append("Kal baarish — pesticide mat chhidke")
    if temp < 10:
        tips.append("Raat thandi — seedlings dhake")
    return " | ".join(tips) if tips else "Mausam theek hai — khet ka kaam ho sakta hai"


def _static_fallback(location: str) -> dict:
    """Last-resort when both wttr.in and Gemini fail."""
    return {
        "location": location,
        "source": "static_fallback",
        "current": {
            "temp_c": 28, "feels_like_c": 30, "humidity": 60,
            "desc": "Partly Cloudy", "wind_kmph": 10, "precip_mm": 0.0,
        },
        "forecast": [],
        "advisory": "Mausam data upalabdh nahi — local weather check kare",
    }
