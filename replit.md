# MaintainIQ

## Overview
MaintainIQ is a MERN-stack asset maintenance and incident reporting platform for facility managers and technicians (QR-code asset tracking, Gemini AI incident triage, work order assignment, maintenance logging, and dashboard analytics). This project was imported from GitHub (`HamzaSaeed06/Final_Hackathone_SMIT`).

## Structure
- `backend/` — Node.js/Express API (Mongoose/MongoDB, optional Redis rate-limiting, Cloudinary uploads, Gemini AI, Nodemailer). Entry point `backend/src/server.js`.
- `frontend/` — React + Vite SPA (Tailwind CSS, React Router, Zustand, Socket.io client).
- See `README.md` and `API_DOCS.md` for full feature list, env vars, and API reference.

## Status
Running on Replit.
- **Backend API** workflow: `cd backend && npm run dev` on port 8000 (console output). Connects to MongoDB Atlas, auto-seeds/syncs the default admin user from `DEFAULT_ADMIN_EMAIL`/`DEFAULT_ADMIN_PASSWORD` on every start.
- **Start application** workflow: `cd frontend && npm run dev` on port 5000 (webview) — this is what the user sees. Vite proxies `/api` and `/socket.io` to the backend on `localhost:8000`, so the frontend talks to the API same-origin (`VITE_API_URL=/api`) instead of hardcoding a host — keeps it portable across dev/preview domains.
- Secrets configured: `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, `SMTP_USER`, `SMTP_PASS`, `DEFAULT_ADMIN_PASSWORD`.
- Redis is not configured (no Redis server in this environment) — rate limiting automatically falls back to an in-memory store, which is fine for a single dev instance.
- Known limitation: the configured `GEMINI_API_KEY` doesn't have access to any of the Gemini model names the backend tries (`gemini-1.5-pro/flash`, `gemini-pro`, `gemini-1.0-pro` all 404). AI triage silently falls back to a mock response — functional but not real AI output. If real AI triage matters, check the key's enabled models/API version, or update `backend/src/services/ai.service.js` to a model the key supports.

## Frontend UI/UX
The entire frontend was rebuilt for a "Refined Utility/Cockpit" look — a precise, high-visibility field-ops aesthetic with light ("Daylight") and dark ("Night Shift") themes, deepened design tokens in `frontend/src/index.css`, framer-motion micro-interactions, skeleton loading states, empty/error states, and mobile-first polish on the public QR scan/report pages. All existing API calls, auth, and Socket.io wiring were preserved unchanged — this was a presentation-only rebuild.

## User preferences
None recorded yet.
