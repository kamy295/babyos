# BabyOS

An AI-powered family companion that helps parents capture, organize, and retrieve their baby's everyday moments, activities, and important information.

BabyOS aims to make childcare tracking simpler by allowing parents to record information naturally instead of maintaining multiple disconnected lists and notes.

## Problem

Parents often rely on memory, scattered messages, and separate apps to track everyday childcare information. Finding something they recorded earlier can be difficult.

BabyOS brings these records together through natural-language capture, structured event tracking, and an AI-powered assistant.

## Target Users

Busy parents of babies and toddlers who want a simple way to:

- Record everyday childcare information.
- Track sleep, feeding, health, activities, and milestones.
- Manage childcare-related tasks.
- Retrieve previously recorded information.

## Core User Journey

1. Enter a natural-language note.
2. Let AI extract structured events.
3. Review and correct the proposed information.
4. Confirm and save the capture.
5. View saved events in the timeline.
6. Edit or delete events when needed.
7. Retrieve information later.

## Features

### 1. AI-Powered Quick Capture

- Capture childcare information using natural language.
- AI-powered event extraction using Google Gemini.
- Extract structured events from free-form notes.
- Review and edit suggested events before saving.
- Confirm or discard extracted events.
- Preserve original notes alongside extracted events.

### 2. Baby Timeline

- View saved events in chronological order.
- Filter events by category.
- Support Sleep, Feeding, Activity, Health, Milestone, and General categories.
- Edit existing events through a right-side drawer.
- Delete events with confirmation.
- Category-specific editing fields.
- Automatic duration calculation using start and end times.

### 3. Task Manager

- Create childcare-related tasks.
- Set due dates.
- Mark tasks as completed or reopen them.
- Edit and delete tasks.
- Filter tasks by status.

**Current persistence:** Browser localStorage.

### 4. Sleep Tracker

- Integrated sleep-tracking interface.
- Sleep session state maintained in browser localStorage.

Further work is planned to integrate sleep sessions with the main timeline and database.

### 5. AskBabyOS

- Integrated assistant interface for interacting with BabyOS information.

The complete question-answering workflow is still under development.

### 6. Notifications

- Global notification system.
- Success, error, warning, and informational notifications.
- Automatic dismissal.
- Manual dismissal.
- Reusable notification components.

### 7. UI and Experience

- Responsive dashboard.
- Light and dark themes.
- Reusable UI components.
- Right-side drawer interactions.
- Consistent form styling and validation.

## Backend and Data

BabyOS uses a backend and relational database to manage family and baby information.

Implemented backend functionality:

- Hono API server.
- Supabase PostgreSQL integration.
- Family and family-member data model.
- Baby profiles.
- Original family notes.
- Structured baby events.
- Atomic capture confirmation.
- Event retrieval, editing, and deletion.
- Family- and baby-scoped development data.

**Current persistence overview:**

| Feature         | Persistence  |
| --------------- | ------------ |
| Original notes  | Supabase     |
| Timeline events | Supabase     |
| Tasks           | localStorage |
| Sleep sessions  | localStorage |

## Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- CSS
- React Hooks

### Backend

- Node.js
- Hono
- TypeScript
- Zod

### Database

- Supabase
- PostgreSQL
- Supabase JavaScript Client

### AI

- Google Gemini
- `@google/genai`

### Development Tools

- ESLint
- TypeScript
- npm

## Current Limitations

- Authentication is not yet implemented.
- Multi-user family collaboration is not yet available.
- Production-ready Row Level Security policies are pending.
- Tasks and sleep sessions are not yet persisted in Supabase.
- Sleep Tracker and Timeline integration is pending.
- AskBabyOS functionality requires further implementation and verification.
- Production deployment and security hardening are pending.

## Roadmap

### Phase 1 — Core Application

- [x] Dashboard
- [x] AI Quick Capture
- [x] Event extraction and review
- [x] Supabase integration
- [x] Timeline
- [x] Event filtering
- [x] Event editing and deletion
- [x] Task Manager
- [x] Global notifications
- [x] Light and dark themes
- [x] Sleep Tracker interface
- [x] AskBabyOS interface

### Phase 2 — Data and Tracking

- [ ] Sleep Tracker and Timeline integration
- [ ] Persist sleep sessions in Supabase
- [ ] Persist tasks in Supabase
- [ ] Daily and weekly baby activity summaries
- [ ] Complete AskBabyOS question-answering workflow

### Phase 3 — Family and Authentication

- [ ] User authentication
- [ ] Family creation and invitations
- [ ] Multiple family members
- [ ] Role-based access
- [ ] Production-ready database security and RLS policies

### Phase 4 — Intelligence and Insights

- [ ] Better historical information retrieval
- [ ] AI-powered summaries
- [ ] Trends and insights
- [ ] Context-aware recommendations

## Current Status

BabyOS has moved beyond the initial prototype.

The application currently supports AI-assisted childcare capture, persistent event storage, timeline management, task management, notifications, and a sleep-tracking interface.

The next focus is completing data integration, family authentication, and deeper AI-powered functionality.

---

**BabyOS — Making everyday parenting information easier to capture, organize, and understand.**
