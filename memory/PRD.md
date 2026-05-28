# VIQSO Digital Media — Political Voter CRM (Multi-Tenant SaaS)

## Problem Statement
Multi-tenant SaaS Political CRM by VIQSO Digital Media. Each candidate/party gets their own customised, white-labeled app (logo, colors, candidate photo, voter data) under VIQSO's umbrella. Booth agents and admins work on data for their own ward/booths only.

## User Personas
- **Super-Admin / VIQSO Master** — Creates client orgs at `/super-admin`, hands out access keys + login creds. Can spin up time-limited DEMO orgs for sales presentations.
- **Candidate Admin** — Full org control: users, booths, voters, branding, candidate profile.
- **Supervisor** — Manages assigned booths, schedules visits, runs bulk imports.
- **Booth Agent** — Surveys only assigned booths; can print/WhatsApp voter slips.

## Architecture
- `organizations` collection — id, name, party_name, access_key, active, **is_demo, expires_at, watermark**
- `org_id` on every record (users, booths, voters, visits, settings, audit_logs)
- 3-factor login: `access_key + email + password`
- JWT contains `org_id` → enforced on every read/write
- Per-org branding incl. candidate profile (photo, position, bio, constituency, election date, footer)
- Demo orgs: backend hard-blocks ALL requests after `expires_at` (subscription expired)
- Audit log on key actions; War Room live dashboard per org

## Iterations
### iter-1 — Initial single-tenant MVP (31/31 ✓)
JWT auth, booth/voter/visit CRUD, analytics, dashboard.

### iter-2 — Multi-tenant + advanced features (56/56 ✓)
- Organization model + access keys + 3-factor login
- Strict cross-org isolation + worker booth-scope enforcement
- Brute-force lockout (5/email/15 min)
- Bulk Excel import, segregation, family auto-detection
- Per-org branding settings, Super-Admin console, PWA manifest

### iter-3 — Candidate profile + Voter Slip + WhatsApp (69/69 ✓)
- Candidate profile fields + image upload
- `/slip/:id` printable voter slip + WhatsApp share
- Voters list per-row Slip + WhatsApp action buttons
- AAP Ward 20 Mumbai sample org seeded

### iter-4 — Enterprise features (89/89 ✓ pytest + frontend verified) [2026-05-28]
- **Demo Mode Orgs**: SuperAdmin can create demo orgs with `is_demo`, `expires_in_days`, custom `watermark`
- **SuperAdmin UI**: New checkbox + conditional expiry/watermark inputs; DEMO badge + expiry date on org cards
- **Login response enriched**: `/api/auth/login` now returns `is_demo`, `demo_expires_at`, `watermark` (mirrors `/api/auth/me`)
- **PDF Voter Import**: `/api/import/voters-pdf` using pdfplumber/pdfminer.six
- **Audit Logs**: `/api/audit-logs` per org
- **War Room**: `/api/war-room/live` live dashboard
- a11y: DialogDescription added to org-create dialog

### iter-5 — White-label APK Builder (21/21 ✓ pytest + frontend verified) [2026-05-28]
- **Per-org Bubblewrap TWA**: `_build_twa_manifest()` generates Bubblewrap-compatible `twa-manifest.json` baked with org's logo, theme color, party name, access_key auto-injected as start_url query param
- **APK endpoints (super-admin only)**:
  - `GET /api/orgs/{id}/apk-config` — returns full TWA manifest + PWABuilder deep-link
  - `PATCH /api/orgs/{id}/apk-settings` — saves `apk_package_id` + `apk_signing_fingerprint` (SHA-256 validated)
  - `GET /api/orgs/{id}/apk-package` — streams ZIP with twa-manifest.json + assetlinks.json + README + build.sh
- **Public Digital Asset Links**: `GET /api/.well-known/assetlinks.json` — no-auth aggregator of all configured org packages (required for TWA to open without browser chrome)
- **SuperAdmin UI — ApkBuilderDialog**: 3-step wizard with live app-icon preview, package_id + fingerprint config, Bubblewrap ZIP download, PWABuilder deep-link, DAL status indicator
- **Public URL resolution**: PUBLIC_APP_URL env > X-Forwarded-Host > frontend/.env > request.base_url fallback (prevents internal cluster URL leak)
- **Error UX fix**: Switched dialog from fetch() to axios — robust against browser-extension body-stream consumption; backend HTTPException details now surface correctly in toasts

## Demo Credentials (see /app/memory/test_credentials.md)
| Org | Access Key | Login |
|-----|------------|-------|
| VIQSO Demo | `VIQSO-2026` | admin@crm.com / admin123 |
| AAP Ward 20 Mumbai | `AAP-MUM-W20-2026` | abhishek@aap.org / abhishek123 |
| iter-4 Demo Org | `VIQSO-WK2JHQACD5` | demo1@test.com / demo123 (expires 2026-05-31, watermark: SALES DEMO) |
| Super-Admin Master Key | `VIQSO-MASTER-2026-XKL9PQR4` | header: X-Super-Admin-Key |

### iter-6 — OCR-enabled EC PDF Import (13/13 ✓ pytest + frontend verified) [2026-05-28]
- **Tesseract 5.3 + Hindi langpack** installed system-wide; `pytesseract` + `pdf2image` + `poppler-utils`
- **Smart text-vs-scan detection**: pdfplumber tries text extraction per page; pages with <80 chars trigger OCR fallback automatically
- **Async background job pattern**: POST returns `{job_id}` immediately, frontend polls `GET /import/voters-pdf/jobs/{job_id}` every 2s
- **Parses**: Voter Name, Father/Husband Name, Age, Gender, House No, EPIC (English + Devanagari regex patterns)
- **Job collection** `pdf_import_jobs`: tracks total_pages, pages_processed, inserted, skipped_duplicates, failed_count, blocks_detected, ocr_used, failed_rows[], progress_percent
- **Force OCR toggle** in UI for purely scanned PDFs
- **Frontend Import.jsx**: useEffect polling, progress bar, OCR badge, failed-rows accordion (page/name/epic/error)
- Multi-page support; multi-tenancy strict (jobs scoped per `org_id`); duplicate detection via EPIC

## Backlog
### P1
- White-label APK strategy **— DONE in iter-5**
- OCR import **— DONE in iter-6**
- Modularize server.py (~2400 lines → routers/ split)
- Demo watermark visual overlay UI
- PDF import: import_batch_id rollback (note: voters now carry `import_job_id` — UI rollback action pending)
- Audit-logs pagination cursor
- Background job recovery: sweep stale "processing" jobs on backend startup
- Concurrency cap (semaphore) for parallel OCR uploads
- OCR DPI auto-tune (200 default, 300 for low-confidence retries)
- Optional: route `/.well-known/assetlinks.json` (root) → `/api/.well-known/assetlinks.json` at hosting layer

### P2
- AI features via Emergent LLM Key: sentiment analysis on survey notes, issue clustering, speech-line suggestions
- WhatsApp Business API (programmatic send vs wa.me link)
- True PWA offline mode (service worker)
- Server-side voter slip PDF generation
- Multi-language survey form (Hindi/Marathi)
- Geo-mapping of booths with heatmap
- CSV export of segregation/analytics

## Next Tasks
- User to review iter-4 (Demo Mode + PDF Import + Audit + War Room) and pick next priority
- Likely candidates: APK wrapper, server.py modularization, or AI features
