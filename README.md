# Calendly Clone

A polished full-stack scheduling platform built for an internship assignment. The project recreates Calendly-style event setup, public booking, and meeting management while adding a set of bonus features that make the product feel more complete and interview-ready.

## What This Project Covers

### Core Features
- Create, edit, and delete event types
- Generate public booking links with unique slugs
- Let invitees book meetings without authentication
- Show upcoming and past meetings in the admin dashboard
- Cancel meetings from the dashboard

### Bonus Features Implemented
- Responsive landing page and dashboard experience
- Multiple weekday availability schedules
- Date-specific override hours
- Buffer time before and after meetings
- Custom invitee questions on the booking form
- Notification logging for booking confirmations and cancellations
- PostgreSQL-ready backend with JSON fallback for local development

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- React Calendar

### Backend
- Node.js
- Express
- PostgreSQL support via `pg`
- Local JSON persistence fallback

## Project Structure

```text
backend/
  data/
  server.js
  storage.js
database/
  schema.sql
frontend/
  app/
    admin/
    public/[slug]/
```

## How To Run

### 1. Start the backend

```powershell
cd c:\Users\Dishu\Desktop\Calendly-Clone\backend
npm install
npm run dev
```

### 2. Start the frontend

```powershell
cd c:\Users\Dishu\Desktop\Calendly-Clone\frontend
npm install
npm run dev
```

### 3. Open the app

- Landing page: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin`
- Backend health: `http://localhost:5000/health`
- Backend test route: `http://localhost:5000/api/test`

## Storage Modes

### Local mode

If `backend/.env` still contains the placeholder `DATABASE_URL=your_database_url_here`, the backend runs in JSON mode using:

```text
backend/data/store.json
```

This is the easiest mode for local testing and demos.

### PostgreSQL mode

If `DATABASE_URL` is set to a real Postgres connection string, the backend automatically switches to PostgreSQL mode and creates the required tables from the app’s live schema.

You can also review the matching schema in:

- [database/schema.sql](database/schema.sql)

## Interview-Ready Highlights

- Clean admin dashboard with advanced event configuration
- Public booking flow with smarter availability and custom intake questions
- Buffer-aware scheduling logic that prevents tightly packed meetings
- Notification log that simulates confirmation and cancellation email output
- Backward-compatible storage architecture with a real database upgrade path

## Suggested Demo Flow

1. Open `/admin`
2. Create a new event with weekday availability, a date override, buffers, and custom questions
3. Open the public link
4. Pick a valid slot and submit the booking form
5. Return to `/admin` to show:
   - the new meeting in Upcoming Meetings
   - the custom answers
   - the notification log entry
6. Cancel the meeting and show the cancellation notification

## Notes

- The backend currently logs notification emails instead of sending real emails through a provider.
- The app supports PostgreSQL, but the JSON fallback keeps the project easy to run for reviewers.
- If you want to reset local demo data, clear `backend/data/store.json`.
