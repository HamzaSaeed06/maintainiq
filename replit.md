# MaintainIQ

## Overview
MaintainIQ is a MERN-stack asset maintenance and incident reporting platform for facility managers and technicians (QR-code asset tracking, Gemini AI incident triage, work order assignment, maintenance logging, and dashboard analytics). This project was imported from GitHub (`HamzaSaeed06/Final_Hackathone_SMIT`).

## Structure
- `backend/` — Node.js/Express API (Mongoose/MongoDB, optional Redis rate-limiting, Cloudinary uploads, Gemini AI, Nodemailer). Entry point `backend/src/server.js`.
- `frontend/` — React + Vite SPA (Tailwind CSS, React Router, Zustand, Socket.io client).
- See `README.md` and `API_DOCS.md` for full feature list, env vars, and API reference.

## Status
Imported but not yet configured to run on Replit. No dependencies installed, no `.env` files created, and no run workflow configured yet. To get it running it needs:
- A MongoDB connection string (`MONGO_URI`) — e.g. MongoDB Atlas — plus `JWT_SECRET`.
- Optional: `GEMINI_API_KEY` (AI triage), Cloudinary credentials (evidence uploads), SMTP settings (email notifications), `REDIS_URL` (rate-limit store) — the backend has fallbacks for all of these if left blank.
- Frontend needs `VITE_API_URL` pointing at the backend API.

## User preferences
None recorded yet.
