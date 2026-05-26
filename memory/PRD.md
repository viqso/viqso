# VIQSO Digital Media — Political Voter CRM (Multi-Tenant SaaS)

## Problem Statement
Multi-tenant SaaS Political CRM by VIQSO Digital Media. Each candidate/party gets their own customised app (logo, colors, candidate photo, voter data) under VIQSO's umbrella. Booth agents and admins work on data for their own ward/booths only.

## User Personas
- **Super-Admin / VIQSO Master** — Creates client orgs at `/super-admin`, hands out access keys + login creds.
- **Candidate Admin** (e.g. Abhishek Dubey) — Full org control: users, booths, voters, branding, candidate profile.
- **Supervisor** — Manages assigned booths, schedules visits, runs bulk imports.
- **Booth Agent** (Field Worker) — Surveys only assigned booths; can print/WhatsApp voter slips.

## Architecture
- `organizations` collection — id, name, party_name, access_key, active
- `org_id` on every record (users, booths, voters, visits, settings)
- 3-factor login: `access_key + email + password`
- JWT contains `org_id` → enforced on every read/write
- Per-org branding incl. **candidate profile** (photo, position, bio, constituency, election date, footer message)
- `/slip/:voter_id` page renders printable card with party logo + candidate photo + voter+booth detail
- WhatsApp share via `wa.me/{phone}?text=…` with prefilled Hindi/English template

## Iterations
### iter-1 — Initial single-tenant MVP (31/31 ✓)
JWT auth, booth/voter/visit CRUD, analytics, dashboard.

### iter-2 — Multi-tenant + advanced features (56/56 ✓)
- Organization model + access keys + 3-factor login
- Strict cross-org isolation + worker booth-scope enforcement on writes
- Brute-force lockout (5/email/15 min)
- Bulk Excel import (smart-merge by voter_id)
- Segregation by caste/religion/surname/family/age/etc.
- Family auto-detection (address + surname)
- Per-org branding settings
- Super-Admin console at `/super-admin`
- PWA manifest + theme color

### iter-3 — Candidate profile + Voter Slip + WhatsApp (69/69 ✓)
- DEFAULT_SETTINGS extended: candidate_name, candidate_photo_url, candidate_position, candidate_bio, constituency_name, election_date, slip_footer_message, whatsapp_template
- `POST /api/upload/image` — base64 data URL (max 2MB, image/* only)
- `GET /api/voters/{id}/slip-data` — bundled voter + booth + org + settings
- `/slip/:id` page — printable voter slip (A5 print layout) + WhatsApp share button
- Voters list: per-row Slip + WhatsApp action buttons
- Admin Branding tab: Candidate Profile section with photo upload
- **AAP Sample Org seeded** — Abhishek Dubey, Ward 20 Mumbai, AAP, 5 booths, 45 voters, 3 booth agents

## Demo Credentials
| Org | Access Key | Login |
|-----|------------|-------|
| VIQSO Demo | `VIQSO-2026` | admin@crm.com / admin123 (also supervisor@, worker@) |
| AAP Ward 20 Mumbai | `AAP-MUM-W20-2026` | abhishek@aap.org / abhishek123 (agents: priya@, rohit@, anita@ / agent123) |
| Super-Admin Master Key | `VIQSO-MASTER-2026-XKL9PQR4` | use as `X-Super-Admin-Key` header |

## Backlog (P0/P1/P2)
### P1 nice-to-haves
- Modularize server.py (1633 lines → routers)
- Image magic-byte validation on upload
- Brute-force key by email only (currently uses ip+email; behind ingress IP varies)
- Normalize /api/families response shape

### P2 enhancements
- Object storage for logos/photos (instead of base64 in settings doc)
- WhatsApp Business API (programmatic send vs. wa.me link)
- True PWA offline mode (service worker)
- Voter slip PDF generation server-side
- Multi-language survey form (Hindi/Marathi)
- Geo-mapping of booths with heatmap
- CSV export of segregation/analytics

## Next Tasks
- User reviews iter-3 output (AAP demo) and provides direction
- Decide on P1/P2 prioritization
