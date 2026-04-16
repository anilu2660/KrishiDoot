# KrishiDoot.AI — Project Context for AI Agents

## Current Status: Integration complete, demo-ready

## Stack
- **FastAPI** + uvicorn — async API server (`cd backend && python -m uvicorn main:app --reload`)
- **Pydantic v2** — request/response validation + LLM output enforcement
- **LangGraph** — agent orchestration
- **Gemma 4** (`gemma-4-31b-it`) — negotiation dialogue agent
- **Gemini 2.5 Flash** (`gemini-2.5-flash`) — crop vision grading (multimodal)
- **Supabase** — PostgreSQL DB (optional — sessions work in-memory without it)
- **python-telegram-bot** — Telegram interface
- **React 18 + Vite** — frontend at `frontend/` (`npm run dev` → localhost:5173)

## Environment Setup
All keys go in `backend/.env`:
```
GEMINI_API_KEY=<key>
DATA_GOV_API_KEY=DEMO_KEY   # real API, limited to 30 req/hr
TELEGRAM_BOT_TOKEN=<token>
SUPABASE_URL=               # optional
SUPABASE_KEY=               # optional
```

## Running the App
```bash
# Terminal 1 — backend
cd backend
python -m uvicorn main:app --reload   # http://localhost:8000

# Terminal 2 — frontend
cd frontend
npm run dev                           # http://localhost:5173

# Terminal 3 — Telegram bot (optional)
cd backend
python -m telegram_bot.bot
```

## Folder Ownership
```
backend/
  main.py              → Person 1 (done)
  config.py            → Person 1 (done)
  models/              → Person 1 (done — read before touching routes)
  routes/
    negotiation.py     → Done (LangGraph wired in)
    grading.py         → Done
    market_data.py     → Done (fallback prices if DEMO_KEY rate-limited)
  services/
    apmc_api.py        → Person 1 (done)
    vision.py          → Done — uses Gemini 2.5 Flash with google-genai SDK
    guardrails.py      → Done
  agents/              → Done (farmer_agent, buyer_agent, orchestrator)
  db/schema.sql        → Person 1 (run once in Supabase SQL editor)
  telegram_bot/        → Person 1 (done)

frontend/
  src/pages/
    Landing.jsx        → Done (GSAP animated marketing page)
    Grade.jsx          → Done (image upload → Gemini vision → Agmark grade)
    Negotiate.jsx      → Done (chat UI → LangGraph negotiation)
    Market.jsx         → Done (APMC modal prices + BATNA calculator)
  src/components/ui.jsx → shared UI primitives (INPUT_CLS, SELECT_CLS, ErrorAlert, SpinnerIcon)
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/negotiate/start` | Start session — returns `session_id`, `batna_price`, `initial_ask` |
| POST | `/negotiate/respond` | Send buyer counter-offer — returns agent dialogue + new ask |
| POST | `/grade/crop` | Base64 image → Agmark grade (A/B/C) + price band |
| GET | `/market/price?crop=&state=` | APMC modal price + fallback if rate-limited |
| GET | `/docs` | Swagger UI |

## Known Issues / Remaining Work
- Supabase not wired — sessions lost on server restart (acceptable for demo)
- DEMO_KEY rate-limited at 30 req/hr — market page falls back to representative prices
- Gemini 2.5 Flash grading: if API call fails, returns fallback (Grade B, 35% confidence)
- Telegram bot negotiation uses simple stub logic, not LangGraph

## Important Constraints
- **Never** let `proposed_price < reservation_price` reach the buyer — `guardrails.enforce_floor()` enforced in `routes/negotiation.py`
- All LLM output parsed as `AgentOutput` Pydantic model — no free-form text
- `NegotiationStartRequest` has `extra="forbid"` — do NOT send extra fields from frontend
- APMC API returns ₹/quintal — `apmc_api.py` divides by 100 to give ₹/kg (already handled)

## Dependencies
Install with: `pip install -r backend/requirements.txt`
Note: `supabase==2.4.6` and `python-telegram-bot==21.3` pin `websockets==12.0` which conflicts with `google-genai`. Fix: `pip install "websockets>=13.0,<17.0"` after requirements install.
