# VIQSO Digital Media — Political Voter CRM

## Problem Statement
Create a political voter management CRM with booth dashboard, survey forms, worker login, analytics and admin panel.
Brand: **VIQSO Digital Media** (Connect · Create · Grow). Reference: Ranniti app aesthetic with vibrant gradient (blue → purple → pink → orange).

## User Personas
- **Admin** — Full system access. Manages users, booths, all data.
- **Supervisor** — Manages assigned booths and field workers. Read/update on booths and voters.
- **Field Worker** — Conducts voter surveys on the ground for assigned booths only.

## Core Requirements (static)
- Multi-role JWT auth with bcrypt
- Booth management (CRUD, target tracking, worker assignment)
- Voter surveys (basic info + demographics + political preferences + issues + custom fields)
- Visit scheduling (admin/supervisor create, workers complete)
- Analytics (overview KPIs, demographics, sentiment, issues, booth-stats, 14-day trends)
- Role-based data scoping (workers see only their booths)
- Admin panel for user/booth management
- Mobile-friendly survey form with multi-step wizard

## Implementation (2026-02-26 / iteration 1)
### Backend (`/app/backend/server.py`)
- JWT auth with cookie + Bearer header support
- 7 resource groups: auth, users, booths, voters, visits, analytics, root
- Auto-seeds on startup: 8 booths, 9 users (1 admin + 1 supervisor + 6 workers + worker login), 120 voters, 15 visits
- 5 analytics endpoints with aggregations and worker-scope filtering
- Pydantic models with UUID ids (no ObjectId leakage)

### Frontend (`/app/frontend/src`)
- React 19 + react-router 7 + Shadcn UI + Recharts + Tailwind
- VIQSO brand: dark navy + vibrant gradient (blue/purple/pink/orange) + Cabinet Grotesk typography
- Pages: Login, Dashboard (Command Center), Booths, BoothDetail, Voters, SurveyForm (4-step wizard), Visits, Analytics, Admin
- AuthContext with localStorage + cookie token sync
- Mobile bottom nav + desktop sidebar
- All interactive elements have `data-testid` attributes

### Tested (iteration 1)
- Backend: 31/31 pytest tests pass (100%)
- Frontend: All pages render, all role-based flows working
- Credentials verified: admin@crm.com / supervisor@crm.com / worker@crm.com

## Demo Credentials
| Role         | Email                | Password   |
|--------------|----------------------|------------|
| Admin        | admin@crm.com        | admin123   |
| Supervisor   | supervisor@crm.com   | super123   |
| Field Worker | worker@crm.com       | worker123  |

## Backlog (P0/P1/P2)
### P1 — Improvements
- Booth-scope check on POST/PATCH /api/voters and /api/visits for workers (API-level enforcement)
- Rate limiting / brute-force lockout on /api/auth/login
- Tighten CORS origins for production

### P2 — Future Enhancements
- WhatsApp/SMS bulk messaging integration (engagement boost)
- Voter slip PDF generation
- Family-grouping of voters
- CSV import/export for voter rolls
- Caste/community-wise targeting reports
- Real-time push notifications to field workers
- Geo-mapping of booths with heatmap overlay
- Multi-language survey form (Hindi/regional languages)

## Next Tasks
- Gather user feedback on initial output
- Prioritize backlog based on campaign timeline
