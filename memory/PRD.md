# VIQSO Digital Media — Political Voter CRM (Multi-Tenant)

## Problem Statement
Build a political voter management CRM. Brand: **VIQSO Digital Media**. Then extended with:
- Multi-tenant organization system (each client gets unique access key)
- Bulk Excel import with smart merge
- Family auto-detection + manual override
- Advanced segregation by caste/religion/surname/family/age/gender etc.
- Per-party branding (logo/colors/name)
- Strict role + booth-scope enforcement
- Brute-force protection
- PWA / mobile-app-like experience
- Super-admin console for master to create client orgs

## User Personas
- **Super-Admin** (Master) — Creates client organizations, assigns access keys. Access via `/super-admin` + master key.
- **Org Admin** — Full control within their organization (users, booths, voters, branding).
- **Supervisor** — Manages assigned booths, can create visits, import voters.
- **Field Worker** — Conducts surveys ONLY for their assigned booths.

## Architecture
- **Organizations** collection (id, name, party_name, access_key, active)
- All other collections (users, booths, voters, visits, settings) have `org_id`
- 3-factor login: `access_key + email + password`
- JWT contains `org_id` → enforced on every query
- Worker writes strictly checked against `assigned_booth_ids`
- Brute-force: 5 failed logins by email → 15-min lockout

## Implementation Log
### 2026-02-26 (iter-1): Initial single-tenant MVP
- JWT auth, 7 resource groups, 5 analytics endpoints
- 8 booths, 9 users, 120 voters, 15 visits seeded
- Backend: 31/31 tests ✓

### 2026-02-26 (iter-2): Multi-tenant + advanced features
- **Multi-tenant org system** with access keys + strict isolation
- **Bulk Excel import** (`/api/import/voters`, `/api/import/template`) with smart-merge by voter_id
- **Family auto-detection** (address + surname) + manual override field
- **Segregation views** — `/api/segregation/{group_by}` for caste, religion, surname, age, gender, occupation, preference, sentiment, booth, ward
- **Families API** — `/api/families` returns grouped households
- **Per-org branding** — `/api/settings` (GET public for login, PUT admin-only); color pickers + logo URL
- **Super-admin endpoints** — `/api/orgs` CRUD with `X-Super-Admin-Key` header
- **Brute-force lockout** — by email, 5 attempts → 15 min lockout
- **Worker booth-scope enforcement** on POST/PATCH `/api/voters`
- **PWA manifest** + theme-color + apple-touch-icon
- **Super-admin console** at `/super-admin`
- Backend: 56/56 tests ✓ (all regression + new)

## Demo Credentials
| Item | Value |
|------|-------|
| Default org access key | `VIQSO-2026` |
| Admin | admin@crm.com / admin123 |
| Supervisor | supervisor@crm.com / super123 |
| Worker | worker@crm.com / worker123 |
| Super-admin master key | `VIQSO-MASTER-2026-XKL9PQR4` (set via `X-Super-Admin-Key` header) |

## Backlog (P0/P1/P2)
### P1
- Audit log for super-admin actions
- Per-user password reset flow
- API rate limiting (global)

### P2
- WhatsApp/SMS campaigns to surveyed voters
- Voter slip PDF generation
- Geo-mapping of booths with heatmap
- Multi-language survey form (Hindi/regional)
- Service worker for true offline PWA mode
- CSV export of segregation results

## Next Tasks
- User reviews initial output and provides guidance
- Prioritize backlog based on campaign timeline
