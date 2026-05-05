# Chemate AI

Chemate AI is a full-stack study companion for Industrial Chemistry students. It combines a note-first academic assistant, a multi-upload library, chemistry calculations, revision tools, lab report generation, and exam prediction inside a mobile-friendly Next.js app.

## What is implemented

- Email/password authentication with database-backed sessions
- Google OAuth routes and UI, ready once Google credentials are added
- Multi-upload workflow for notes, questions, assignments, and lab manuals
- Readable note pages with extracted equations and chemistry cues
- Grounded question answering from uploaded materials with explicit external-AI permission control
- OpenAI or Gemini-ready provider selection for external answers
- Chemistry calculation engine for stoichiometry, kinetics, and electrochemistry
- Revision mode with generated summaries and flashcards
- Exam prediction from uploaded notes and question history
- Detailed lab report generation with PDF download
- Dark/light theme toggle and responsive dashboard navigation
- PWA manifest and offline fallback page

## Tech stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Prisma 7`
- `PostgreSQL`
- `Framer Motion`
- `OpenAI SDK`
- `pdf-lib`
- `Sonner`
- `Vitest`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the local Prisma Postgres instance:

```bash
npm run db:start
```

3. Generate the Prisma client, sync the schema, and seed the Chemate demo data:

```bash
npm run db:setup
```

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Demo login

- Student: `student@chemate.ai`
- Password: `Chemate#2026`
- Mentor: `mentor@chemate.ai`
- Password: `Mentor#2026`

## Optional provider setup

Add these to `.env` if you want live external AI or Google sign-in:

```env
AI_PROVIDER="openai"
OPENAI_API_KEY="your_openai_key"
OPENAI_MODEL="gpt-5.4-mini"

AI_PROVIDER="gemini"
GEMINI_API_KEY="your_gemini_key"
GEMINI_MODEL="gemini-2.5-flash"

GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

## Useful commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run db:start
npm run db:setup
npm run db:push:prod
npm run db:init:prod
npm run db:studio
```

## Notes

- `npm run db:push` uses `--accept-data-loss` because the default local workflow is designed for a resettable development database.
- Do not use `npm run db:setup` on a live production database. It is for local/demo setup and includes the demo seed flow.
- For production, use `npm run db:push:prod` followed by `npm run db:init:prod`.
- Text-based uploads become searchable immediately. Binary uploads are stored as drafts and work best when you paste extracted text alongside them.
- External AI is never used automatically in the assistant. The user must allow it per answer.
- For Play Store release, deploy the web app first, then package it with Capacitor or a Trusted Web Activity.
