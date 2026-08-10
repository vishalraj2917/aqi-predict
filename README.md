# AQI Predict — Backend (Phase 4 + Phase 7)

FastAPI backend implementing the API endpoints planned in the roadmap, wired
to the real forecast models trained in Phase 6.

## Run it in your terminal

```bash
cd aqi-backend
pip install -r requirements.txt --break-system-packages    # drop the flag if not needed on your system
uvicorn app.main:app --reload
```

Then open **http://127.0.0.1:8000/docs** — FastAPI's auto-generated Swagger
UI, where you can try every endpoint directly in the browser without writing
any curl commands.

The frontend (Phase 3, Vite dev server on port 5173) is already allowed by
CORS in `app/main.py`, so once both are running you can wire the React app
to call `http://127.0.0.1:8000` directly.

## What's implemented

| Endpoint | Method | Auth? | Description |
|---|---|---|---|
| `/api/aqi/cities` | GET | No | List tracked cities |
| `/api/aqi/current?city=` | GET | No | Latest AQI + pollutant breakdown |
| `/api/aqi/history?city=&hours=` | GET | No | Historical AQI points |
| `/api/aqi/compare?cities=A,B,C` | GET | No | Multi-city AQI comparison |
| `/api/aqi/predict?city=&horizon=` | GET | No | **Real ML prediction** (horizon: 1 or 24) |
| `/api/weather/current?city=` | GET | No | Latest weather snapshot |
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Get JWT access token |
| `/api/favorites` | GET/POST | Yes | List / add favorite cities |
| `/api/favorites/{city}` | DELETE | Yes | Remove favorite |
| `/api/alerts/preferences` | POST | Yes | Set AQI alert threshold |
| `/api/alerts` | GET | Yes | List past alerts |

Auth uses JWT bearer tokens. In Swagger UI, register a user, log in, copy
the `access_token`, click **Authorize** at the top, and paste it in as
`Bearer <token>` — then the favorites/alerts endpoints will work from the
docs UI too.

## Database
Uses SQLite by default (`aqi.db`, created automatically on first run — zero
setup needed). To switch to PostgreSQL for the real Phase 5 deployment, set
an environment variable before running:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/aqi_db"
uvicorn app.main:app --reload
```
No code changes needed — see `app/database.py`.

## Data source
`app/ml/aqi_weather_raw.csv` is the same synthetic dataset from Phase 6.
`/api/aqi/current`, `/history`, and `/compare` read from it directly (acting
as a stand-in for the AQI_READINGS/WEATHER_READINGS tables until a real
ingestion job populates the database — see Phase 5 schema in
`05_Database_Design.md` from Phase 1). `/api/aqi/predict` calls the actual
trained XGBoost models from Phase 6 (`app/ml/aqi_forecast_h1.pkl` and
`aqi_forecast_h24.pkl`) — this is a real, working prediction, not mocked.

## Known simplifications (documented, not hidden)
- `confidence` in the predict response is a fixed value pulled from the
  model's validation R² (see Phase 6 README), not a per-request prediction
  interval — computing a true interval (e.g. via quantile regression) is a
  reasonable Phase 7 stretch goal.
- Alerts are stored but nothing currently triggers/sends them automatically
  — that requires a scheduled job (e.g. APScheduler or a cron task) that
  periodically checks predictions against each user's threshold. Not built
  yet; flagging it rather than pretending it's live.
- Email delivery for alerts is not implemented (needs an SMTP/email API
  credential you'd provide).

## Folder structure
```
app/
  main.py              FastAPI app, CORS, router registration
  database.py          SQLAlchemy engine/session (SQLite by default)
  auth.py              Password hashing + JWT
  schemas.py           Pydantic request/response models
  models/orm.py        SQLAlchemy tables (Users, Cities, Favorites, Alerts...)
  ml/predictor.py       Loads trained models, serves predictions
  ml/*.pkl, *.csv       Trained models + dataset from Phase 6
  routers/
    auth_router.py      /api/auth/*
    aqi_router.py        /api/aqi/*
    weather_router.py    /api/weather/*
    user_router.py        /api/favorites, /api/alerts/*
```

## Next step
Connect the Phase 3 frontend's hardcoded arrays to these real endpoints
(e.g. Dashboard.jsx's `favorites` array → `fetch('/api/aqi/current?city=...')`).
