# Campaign Hub

A small full-stack tool for managing **cold-outreach campaigns and leads**: create campaigns, bulk-import leads, track each lead through the funnel (pending → sent → replied / bounced / unsubscribed) and see reply and bounce rates.

I built it as a compact demo of the kind of backend + frontend work involved in an outbound-email SaaS.

| Layer | Stack |
| --- | --- |
| API | Node.js, Express, **TypeScript**, **MySQL** (`mysql2`), Zod validation |
| Web | **Next.js 14** (App Router), React, **Tailwind CSS** |
| Docs | OpenAPI 3 + Swagger UI at `/docs` |
| Tests | Vitest + Supertest (no database required) |
| Ops | Dockerfiles + `docker-compose` (MySQL, API, Web) |

## Features

- REST API with pagination, status filtering and consistent JSON errors
- Idempotent **bulk lead import** (up to 1000 per request) using `INSERT IGNORE` on a `(campaign_id, email)` unique key
- Funnel **stats endpoint** computed with a single indexed `GROUP BY` query
- Input validation with Zod; helmet, CORS, rate limiting and optional `x-api-key` auth
- Repository pattern: the API depends on an interface, so tests run on an in-memory store and production runs on MySQL
- Interactive API docs (Swagger UI) generated from an OpenAPI spec
- Dashboard UI: create campaigns, import leads from pasted text, change statuses, filter leads

## Architecture

```
Next.js (Tailwind)  ──HTTP/JSON──▶  Express API  ──▶  Repository interface
                                       │                 ├─ MySqlRepository   (production)
                                       │                 └─ MemoryRepository  (tests)
                                       └─ /docs (Swagger UI)
```

### Database design

See [`backend/sql/schema.sql`](backend/sql/schema.sql).

- `campaigns` – status ENUM, indexed on `status`
- `leads` – FK to campaigns with `ON DELETE CASCADE`
- `UNIQUE (campaign_id, email)` enforces data integrity and enables fast duplicate-safe imports
- `INDEX (campaign_id, status)` serves both the stats query and filtered lead lists

## Quick start (Docker)

```bash
docker compose up --build
```

- Web UI: http://localhost:3000
- API: http://localhost:4000
- API docs: http://localhost:4000/docs

## Run locally without Docker

Requirements: Node 18+ and a MySQL 8 instance.

```bash
# 1. Database
mysql -u root -p < backend/sql/schema.sql

# 2. API
cd backend
cp .env.example .env      # edit DB credentials
npm install
npm run dev               # http://localhost:4000

# 3. Web (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev               # http://localhost:3000
```

## Tests

```bash
cd backend
npm test          # 14 tests covering validation, dedupe, pagination, stats, auth
npm run typecheck
```

## API overview

Full interactive docs live at `/docs`. Summary:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/api/campaigns` | Create a campaign |
| GET | `/api/campaigns?page=&limit=` | List campaigns |
| GET | `/api/campaigns/:id` | Campaign details + stats |
| PATCH | `/api/campaigns/:id/status` | Change campaign status |
| POST | `/api/campaigns/:id/leads` | Bulk-add leads (dupes skipped) |
| GET | `/api/campaigns/:id/leads?status=` | List leads, optional filter |
| GET | `/api/campaigns/:id/stats` | Funnel counts + reply/bounce rate |
| PATCH | `/api/leads/:id/status` | Update a lead's status |

Example:

```bash
curl -X POST localhost:4000/api/campaigns \
  -H 'Content-Type: application/json' \
  -d '{"name":"Q4 Outreach","subject":"Quick question"}'

curl -X POST localhost:4000/api/campaigns/1/leads \
  -H 'Content-Type: application/json' \
  -d '{"leads":[{"email":"jane@acme.com","firstName":"Jane","company":"Acme"}]}'
```

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `PORT`, `CORS_ORIGIN` | API | Server port and allowed web origin |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | API | MySQL connection |
| `API_KEY` | API | If set, `/api/*` requires an `x-api-key` header |
| `NEXT_PUBLIC_API_URL` | Web | API base URL (baked in at build time) |

## Deploying

- **API + MySQL**: any container host (Render, Railway, Fly.io, AWS ECS). Use the `backend/Dockerfile` and a managed MySQL (PlanetScale, Railway MySQL, AWS RDS). Run `schema.sql` once.
- **Web**: Vercel (set root directory to `frontend` and `NEXT_PUBLIC_API_URL` to your API URL) or the `frontend/Dockerfile`.
- Set `CORS_ORIGIN` on the API to your deployed web URL.

## What I'd add next

Authentication per user/workspace, a background worker (BullMQ + Redis) to actually send sequences, webhooks for reply/bounce events, and integration tests against a real MySQL container in CI.
