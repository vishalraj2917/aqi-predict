# Deployment Guide — Phase 13

Two pieces to deploy: the **frontend** (React/Vite) and the **backend**
(FastAPI). They're deployed to different services and talk to each other
over the internet instead of localhost. Recommended free-tier stack:

| Piece | Service | Why |
|---|---|---|
| Frontend | **Vercel** | Built for Vite/React, free tier, auto-deploys on git push |
| Backend | **Render** | Free tier runs Python/FastAPI easily, simple env var UI |
| Database | **Neon** or **Supabase** | Free managed PostgreSQL, gives you a connection string |

You'll end up with two live URLs, e.g.:
- Frontend: `https://aqi-predict.vercel.app`
- Backend: `https://aqi-predict-backend.onrender.com`

---

## Step 0 — Apply the code changes in this kit

Before deploying, copy these files into your existing project, overwriting
the originals:

- `frontend-changes/src/lib/api.js` → `aqi-website/src/lib/api.js`
- `frontend-changes/.env.example` → `aqi-website/.env.example` (also copy it to `aqi-website/.env` for local dev — keep `.env` untracked by git)
- `frontend-changes/vercel.json` → `aqi-website/vercel.json` (new file — needed so page refreshes on routes like `/dashboard` don't 404)
- `backend-changes/app/main.py` → `aqi-backend/app/main.py`
- `backend-changes/Procfile` → `aqi-backend/Procfile` (new file — tells Render how to start the server)
- `backend-changes/requirements.txt` → `aqi-backend/requirements.txt` (adds `psycopg2-binary`, the PostgreSQL driver — your app already supports PostgreSQL via `DATABASE_URL`, it just wasn't installed since you've only used SQLite so far)

**Why these changes matter:** your code currently hardcodes
`http://127.0.0.1:8000` as the backend URL and only allows CORS requests
from `localhost:5173`. Neither exists once deployed — the frontend needs
to know your backend's real URL, and the backend needs to allow requests
from your real frontend URL. These changes make both configurable via
environment variables instead of hardcoded values, so you don't touch code
again after this.

---

## Step 1 — Push your project to GitHub

Both Vercel and Render deploy from a GitHub repo.

```bash
cd D:\AQI_Website_Phase3\aqi-website
git init
git add .
git commit -m "Initial commit"
```

Create a new repository on github.com (don't initialize it with a
README), then:

```bash
git remote add origin https://github.com/<your-username>/aqi-predict.git
git branch -M main
git push -u origin main
```

**Important:** add a `.gitignore` first so you don't commit `node_modules`
or your local `.env`/`aqi.db`:

```
node_modules/
dist/
.env
aqi.db
__pycache__/
*.pyc
```

---

## Step 2 — Set up a free PostgreSQL database (Neon)

1. Go to https://neon.tech, sign up, create a new project
2. Copy the connection string it gives you (looks like
   `postgresql://user:pass@ep-xxx.neon.tech/dbname`)
3. Keep this — you'll paste it into Render in Step 3

(SQLite, which you've been using locally, works fine for local dev but
isn't suitable for a real deployment — Render's free tier has an ephemeral
filesystem, so a SQLite file would get wiped on every restart.)

---

## Step 3 — Deploy the backend to Render

1. Go to https://render.com, sign up, click **New +** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `aqi-backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     (Render also auto-detects the `Procfile` you added, either works)
4. Add environment variables (Render's dashboard → Environment):
   - `DATABASE_URL` = your Neon connection string from Step 2
   - `JWT_SECRET` = any long random string (e.g. generate one at
     https://randomkeygen.com) — **don't leave this as the code's default**
   - `FRONTEND_ORIGINS` = leave blank for now, you'll set this in Step 5
5. Click **Create Web Service** and wait for it to build and deploy
6. Once live, note your backend URL, e.g.
   `https://aqi-predict-backend.onrender.com`
7. Visit `<your-backend-url>/docs` to confirm it's actually running

**Note:** Render's free tier spins down after inactivity and takes ~30-60
seconds to wake up on the next request. That's normal for a free-tier
student project — just don't be alarmed by a slow first load.

---

## Step 4 — Deploy the frontend to Vercel

1. Go to https://vercel.com, sign up, click **Add New** → **Project**
2. Import the same GitHub repo
3. Configure:
   - **Root Directory**: `aqi-website`
   - **Framework Preset**: Vite (should auto-detect)
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL from Step 3
     (e.g. `https://aqi-predict-backend.onrender.com`)
5. Click **Deploy**
6. Once live, note your frontend URL, e.g.
   `https://aqi-predict.vercel.app`

---

## Step 5 — Connect them: allow the real frontend URL in CORS

Go back to Render → your backend service → Environment, and set:

- `FRONTEND_ORIGINS` = `https://aqi-predict.vercel.app` (your actual Vercel URL, no trailing slash)

Save — Render will redeploy automatically. This is the step that fixes
CORS for your live site (same fix category as the `localhost` CORS issue
you already debugged — just now pointing at your real deployed URL instead
of `localhost:5173`).

---

## Step 6 — Test it

Visit your Vercel URL. You should see the site load with **no red "can't
reach backend" banner**, and real AQI data. Try registering a user — this
confirms the database connection works too.

---

## Known limitations after deployment
- Free-tier Render sleeps after inactivity — first load after idle time is slow.
- The dataset (`aqi_weather_raw.csv`) is static — it doesn't grow with new
  real-time readings. A real production system would need a scheduled job
  ingesting fresh AQI/weather data continuously (this is a good "Future
  Scope" item to mention if you present this project).
- Alerts still don't auto-trigger (same limitation noted in the backend
  README) — that would need a scheduled job (e.g. Render Cron Jobs or
  APScheduler) checking predictions against thresholds periodically.
