# LINCHUB — Boutique Recruitment Ecosystem SaaS

## Original problem statement
Web apps dengan background cream halus, bersih, editorial, tulisan tidak "AI look".
LINCHUB Tracking SaaS by PT. Linchub Network Indonesia — Super Admin Controlled System.
Semua modul (Project, Candidate, Billing, Analyst, Settings) wajib saling terhubung.

## User personas
- Super Admin (Corporate Portal) — full access, RBAC, pricing, analyst, billing, logs
- Karyawan (Recruiter Portal) — pipeline, interview, updates
- Client Portal — status proyek & riwayat invoice

## Architecture
- Backend: FastAPI + MongoDB (Motor), JWT auth (Bearer + cookie), bcrypt
- Frontend: React 19 + React Router 7, Tailwind, Recharts, shadcn/ui base, Fraunces + Manrope + JetBrains Mono
- Theme: cream #FAF6EE, ink #1B1B1F, emerald #2F6F5E, editorial layout, no gradients

## Implemented (v1.0 — Feb 2026)
- Landing (Layar Awal) + editorial hero + module ticker + CTA
- Dynamic Login Portal Switcher (Client / Karyawan / Corporate tabs)
- Top-nav dropdowns: Project ▾, Candidate ▾, Billing ▾, Analyst, Settings ▾
- Project: List + Kanban view, CRUD leads, 5-stage pipeline, auto-archive prev months, search
- Project Analyst: acquisition trend, conversion rate, stage distribution (weekly/monthly/yearly)
- Candidate Interview (Stage 1-2): CDD table with source/cluster badges, promote to OJT
- Candidate OJT: List & Tracking with day progress bar + target/gap; Customize Progress drawer with daily entries; promote to PKWT
- Candidate PKWT: List & Tracking (30-day cycle), status Hired/Extended/Terminated
- Billing Master Pricing: Fractional / Stages / Massive (Model A & B) auto-calc, VVIP locked
- Billing Invoices: Live dynamic template, auto invoice_no INV/LCH/YYYY/MM/XXX, PPN 11%, preview + print-to-PDF, uses branding from Settings
- Billing Cashflow: KPI cards, stacked bar chart, pie composition, ledger with status filter, CSV export
- Analyst: Exec KPIs, funnel with bottleneck alert, lead stage distribution, CSV/JSON export
- Settings: RBAC permission matrix, Global Invoice Branding (letterhead/stamp/signature URL), immutable Audit Logs, Notification integrations (WhatsApp/Email/Slack — MOCKED placeholder for API keys), Trigger rules
- Auth: JWT + bcrypt, seeded admin (lidiyapratamy@gmail.com/ADMIN123), karyawan + client demo users
- Audit trail: create/update/delete auto-logged per entity

## Backlog / Next priorities
- P1: Real WhatsApp (Twilio/WA Cloud) + Resend email + Slack webhook wiring
- P1: Server-side PDF invoice generation with true branding upload (object storage)
- P2: Bulk import leads via CSV
- P2: Client Portal restricted view (only own projects/invoices)
- P2: Change password UI in Settings
- P3: 2FA / SSO
