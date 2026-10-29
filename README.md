# Campaign Hub

[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

🌐 [Live Demo](https://YOUR_DEMO_URL) · 📘 [API Documentation](https://YOUR_API_URL/docs)

A small full-stack tool for managing **cold-outreach campaigns and leads**. Create campaigns, bulk-import leads, move each lead through the funnel (`pending → sent → replied / bounced / unsubscribed`) and see reply and bounce rates at a glance.

I built it as a compact demo of the backend and frontend work involved in an outbound-email SaaS.

> **Scope note:** Campaign Hub *tracks and manages* outreach. It does not send emails. Sending is on the roadmap (see [What I'd add next](#what-id-add-next)).

## Tech stack

| Layer | Stack |
| --- | --- |
| API | Node.js, Express, **TypeScript**, **MySQL** (`mysql2`), Zod validation |
| Web | **Next.js 14** (App Router), React, **Tailwind CSS** |
| Docs | OpenAPI 3 + Swagger UI at `/docs` |
| Tests | Vitest + Supertest (no database required) |
| Ops | Dockerfiles + `docker-compose` (MySQL, API, Web), GitHub Actions CI |

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

### Project structure

```
.
├── backend/
│   ├── sql/schema.sql      # database schema
│   ├── src/                # routes, validation, repositories
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/                # Next.js App Router pages
│   ├── Dockerfile
│   └── .env.example
└── docker-compose.yml
```

### Database design

See [`backend/sql/schema.sql`](backend/sql/schema.sql).

- `campaigns`: status ENUM, indexed on `status`
- `leads`: FK to campaigns with `ON DELETE CASCADE`
- `UNIQUE (campaign_id, email)` enforces data integrity and enables fast duplicate-safe imports
- `INDEX (campaign_id, status)` serves both the stats query and filtered lead lists

## Design decisions and trade-offs

- **`INSERT IGNORE` for imports.** Re-importing the same list is safe and cheap, and the unique key guarantees no duplicates. The trade-off is that skipped rows are silent at the SQL level, so the API reports how many leads were added versus skipped.
- **1000-lead cap per request.** Keeps request size, validation time and transaction length predictable. Larger lists can be sent in batches.
- **Repository interface with an in-memory implementation.** Tests are fast and need no database or Docker. The trade-off is that SQL-specific behavior (constraints, indexes) isn't covered by the unit tests, which is why real-MySQL integration tests are on the roadmap.
- **Stats via one `GROUP BY`.** A single indexed query returns all funnel counts, instead of one query per status.
- **Optional API key, not full auth.** Enough to protect a demo deployment without building user management that this project doesn't need yet.

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
npm test          # validation, dedupe, pagination, stats, auth
npm run typecheck
```

Tests run against the in-memory repository, so no database is needed.

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

### Examples

```bash
# Create a campaign
curl -X POST localhost:4000/api/campaigns \
  -H 'Content-Type: application/json' \
  -d '{"name":"Q4 Outreach","subject":"Quick question"}'

# Bulk-add leads
curl -X POST localhost:4000/api/campaigns/1/leads \
  -H 'Content-Type: application/json' \
  -d '{"leads":[{"email":"jane@acme.com","firstName":"Jane","company":"Acme"}]}'

# Get funnel stats
curl localhost:4000/api/campaigns/1/stats
```

Example stats response (illustrative; see `/docs` for the exact schema):

```json
{
  "pending": 40,
  "sent": 35,
  "replied": 9,
  "bounced": 3,
  "unsubscribed": 1,
  "replyRate": 0.26,
  "bounceRate": 0.09
}
```

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `PORT`, `CORS_ORIGIN` | API | Server port and allowed web origin |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | API | MySQL connection |
| `API_KEY` | API | If set, `/api/*` requires an `x-api-key` header |
| `NEXT_PUBLIC_API_URL` | Web | API base URL (baked in at build time) |

## Deploying

- **API + MySQL:** any container host (Render, Railway, Fly.io, AWS ECS). Use `backend/Dockerfile` and a managed MySQL (PlanetScale, Railway MySQL, AWS RDS). Run `schema.sql` once.
- **Web:** Vercel (set root directory to `frontend` and `NEXT_PUBLIC_API_URL` to your API URL) or `frontend/Dockerfile`.
- Set `CORS_ORIGIN` on the API to your deployed web URL.

## What I'd add next

- Authentication per user/workspace
- A background worker (BullMQ + Redis) to actually send sequences
- Webhooks for reply/bounce events
- Integration tests against a real MySQL container in CI

## License

[MIT](LICENSE)
