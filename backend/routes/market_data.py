from fastapi import APIRouter, HTTPException, Query

from services.apmc_api import get_modal_price

router = APIRouter()

_FALLBACK_PRICES = {
    "tomato": 25.0, "wheat": 22.0, "onion": 18.0, "potato": 15.0,
    "rice": 35.0, "maize": 20.0, "soybean": 45.0, "cotton": 65.0,
    "sugarcane": 3.5, "bajra": 18.0, "jowar": 19.0, "mustard": 52.0,
}


@router.get("/price")
async def get_market_price(
    crop: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
):
    """
    Fetch today's APMC modal price for a crop in a state.
    Example: GET /market/price?crop=tomato&state=karnataka
    Falls back to representative prices if data.gov.in is rate-limited.
    """
    crop = crop.strip().replace("_", " ")
    state = state.strip().replace("_", " ")

    try:
        price = await get_modal_price(crop, state)
        return {"crop": crop, "state": state, "modal_price_per_kg": price, "unit": "INR/kg"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        fallback = _FALLBACK_PRICES.get(crop.lower(), 20.0)
        return {"crop": crop, "state": state, "modal_price_per_kg": fallback, "unit": "INR/kg"}

