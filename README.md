# Secret Santa — Vercel-Hosted Web App (Next.js + TypeScript + Prisma + Resend)

A complete Secret Santa event generator and anonymous chat web app, designed for deployment on **Vercel**.
Features: event creation, participant registration (name, email, 2 wishlist questions), automatic deranged pairing, assignment emails via **Resend**, and anonymous chat between matched participants. Ready for local development and production deployment.

---

## Table of contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure (example)](#repository-structure-example)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [Database (Prisma) & Schema](#database-prisma--schema)
7. [Local setup & run](#local-setup--run)
8. [API endpoints](#api-endpoints)
9. [Matching algorithm (example)](#matching-algorithm-example)
10. [Email templates (Resend)](#email-templates-resend)
11. [Anonymous chat](#anonymous-chat)
12. [Vercel deployment](#vercel-deployment)
13. [Testing & QA](#testing--qa)
14. [Security & privacy notes](#security--privacy-notes)
15. [Troubleshooting](#troubleshooting)
16. [Contributing](#contributing)
17. [License](#license)

---

# Project overview

This app allows a host to create a Secret Santa event. Participants sign up with name, email, and two simple wishlist answers. When the host triggers the draw, the app runs a derangement algorithm to assign each participant a recipient (no self-assignments), stores the assignments in the DB, and emails each participant with their assigned recipient and wishlist. Participants can chat anonymously with their assigned recipient through the web UI.

---

# Tech stack

* **Next.js 14 (App Router)** + **TypeScript**
* **TailwindCSS** for UI
* **Prisma** ORM with **PostgreSQL** (Vercel Postgres recommended)
* **Resend** for transactional emails
* Realtime chat: **Supabase Realtime** or Vercel Edge + polling alternative (choose implementation).
* Deploy to **Vercel**

---

# Repository structure (example)

```
.
├── README.md
├── package.json
├── next.config.mjs
├── vercel.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── create-event/page.tsx
│   │   ├── event/[eventId]/
│   │   │   ├── join/page.tsx
│   │   │   ├── host/page.tsx
│   │   │   └── chat/[participantId]/page.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── resend.ts
│   │   └── santa.ts (matching logic)
│   ├── components/
│   └── styles/
├── scripts/
│   └── seed.ts
└── .env.example
```

---

# Prerequisites

* Node.js 18+ (recommended)
* pnpm / npm / yarn (choose your package manager)
* A PostgreSQL database: **Vercel Postgres** recommended for production; locally you can use Docker or a hosted DB.
* Resend account & API key (for sending emails)

---

# Environment variables

Create a `.env` (not committed) with:

```env
# Database
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>?schema=public

# Site
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# Resend (email)
RESEND_API_KEY=re_xxx...

# Optional: If using Supabase Realtime for chat
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Optional: Next runtime secrets for Vercel Edge functions
# (These vary depending on your edge setup)
```

> **.env.example** should contain the same keys with placeholder values for the README.

---

# Database (Prisma) & schema

Install Prisma and configure `schema.prisma`:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Event {
  id          String        @id @default(cuid())
  name        String
  hostEmail   String
  createdAt   DateTime      @default(now())
  participants Participant[]
  messages     Message[]
}

model Participant {
  id              String      @id @default(cuid())
  eventId         String
  event           Event       @relation(fields: [eventId], references: [id])
  name            String
  email           String
  wishlist_q1     String
  wishlist_q2     String
  assignedToId    String?     
  assignedTo      Participant? @relation("AssignmentTo", fields: [assignedToId], references: [id])
  assignedFrom    Participant? @relation("AssignmentFrom")
  messagesSent    Message[]   @relation("Sender")
  messagesReceived Message[]  @relation("Recipient")
  createdAt       DateTime    @default(now())
}

model Message {
  id          String      @id @default(cuid())
  eventId     String
  event       Event       @relation(fields: [eventId], references: [id])
  senderId    String
  sender      Participant @relation("Sender", fields: [senderId], references: [id])
  recipientId String
  recipient   Participant @relation("Recipient", fields: [recipientId], references: [id])
  content     String
  createdAt   DateTime    @default(now())
}
```

### Prisma commands

Install and generate Prisma client:

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma generate
```

Create and run migrations (dev):

```bash
npx prisma migrate dev --name init
```

On Vercel run (production):

```bash
npx prisma migrate deploy
```

---

# Local setup & run

1. Clone the repo:

```bash
git clone https://github.com/<your-org>/secret-santa.git
cd secret-santa
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Create `.env` from `.env.example` and fill values.

4. Generate Prisma client & migrate:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. (Optional) Seed sample data:

```bash
node ./scripts/seed.js
# or ts-node ./scripts/seed.ts
```

6. Run the dev server:

```bash
npm run dev
# default Next.js dev port: http://localhost:3000
```

---

# API endpoints (recommended)

These handlers live in `src/app/api/...` or `src/pages/api/...` depending on routing choice.

**Event & participant routes**

* `POST /api/events/create` — Create event
  Body: `{ name, hostEmail }`
  Returns: `{ eventId, joinUrl, hostUrl }`

* `POST /api/events/:eventId/join` — Register participant
  Body: `{ name, email, wishlist_q1, wishlist_q2 }`
  Returns: `{ participantId }`

* `POST /api/events/:eventId/draw` — Run the draw (host only)
  Body: `{ hostEmail?, hostSecret? }` (optional auth)
  Action: runs algorithm, updates `assignedToId`, sends emails via Resend

**Chat**

* `POST /api/chat/send` — Send a message
  Body: `{ eventId, senderId, recipientId, content }`
  Stores message in DB; optionally notify via realtime

* `GET /api/chat/messages?eventId=&participantId=` — List messages relevant to participant
  Returns the list of messages between the participant and their assigned recipient

> All server endpoints should validate inputs and protect against unauthorized host actions.

---

# Matching algorithm (example)

A deterministic derangement algorithm (simple and practical). Put this logic in `src/lib/santa.ts` and call from `/api/events/:eventId/draw`.

```ts
// src/lib/santa.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function generateAndSavePairs(eventId: string) {
  const participants = await prisma.participant.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });

  if (participants.length < 2) {
    throw new Error("Need at least 2 participants");
  }

  const givers = [...participants];
  let receivers = shuffle([...participants]);

  // Attempt reshuffle to avoid self-assign
  let attempts = 0;
  const MAX_ATTEMPTS = 200;

  while (attempts < MAX_ATTEMPTS) {
    let anySelf = false;
    for (let i = 0; i < givers.length; i++) {
      if (givers[i].id === receivers[i].id) {
        anySelf = true;
        break;
      }
    }
    if (!anySelf) break;
    receivers = shuffle([...participants]);
    attempts++;
  }

  if (attempts === MAX_ATTEMPTS) {
    // fallback algorithm: shift by one
    receivers = [...participants.slice(1), participants[0]];
  }

  // Save assignments in DB in a transaction
  const tx = await prisma.$transaction(
    givers.map((giver, i) =>
      prisma.participant.update({
        where: { id: giver.id },
        data: { assignedToId: receivers[i].id },
      })
    )
  );

  return tx; // updated participants
}
```

**Notes**

* This algorithm tries random shuffles; for large N it will succeed quickly. For pathological cases, the fallback ensures a valid derangement.
* After saving assignments, you should fetch `assignedTo` details and send emails.

---

# Email templates (Resend)

Use Resend API to send assignment emails. Example server-side helper:

```ts
// src/lib/resend.ts
import fetch from "node-fetch";

export async function sendAssignmentEmail({
  apiKey,
  to,
  participantName,
  recipientName,
  wishlist_q1,
  wishlist_q2,
  chatUrl,
  eventName,
}: {
  apiKey: string;
  to: string;
  participantName: string;
  recipientName: string;
  wishlist_q1: string;
  wishlist_q2: string;
  chatUrl: string;
  eventName: string;
}) {
  const html = `
    <div style="font-family: Arial; line-height: 1.6;">
      <h2>🎁 Hi ${participantName}, your Secret Santa assignment for ${eventName} is here!</h2>
      <p>You have been assigned to give a gift to:</p>
      <h3>${recipientName}</h3>
      <p><strong>Their Wishlist:</strong></p>
      <ul>
        <li>${wishlist_q1}</li>
        <li>${wishlist_q2}</li>
      </ul>
      <p><a href="${chatUrl}" style="background:#d32f2f;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Anonymous Chat</a></p>
      <p>Have fun and Merry Christmas! 🎄</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Secret Santa <onboarding@resend.dev>",
      to: [to],
      subject: `🎄 Your Secret Santa Assignment for ${eventName}!`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${text}`);
  }

  return res.json();
}
```

---

# Anonymous chat

Options:

1. **Realtime (recommended)** — Use Supabase Realtime or a WebSocket provider. Store messages in `Message` table. Authenticate users by their participantId or session token. Ensure identities are not exposed; label messages as `You` vs `Secret Santa`.
2. **Polling (simpler)** — Poll `GET /api/chat/messages` every 2–3 seconds to fetch new messages.

**Important**

* Only allow participants to send messages to their assigned recipient and vice versa.
* On the UI show `You` for messages from the logged-in participant, and `Secret Santa` for messages from the other side.

---

# Vercel deployment

## Vercel project settings

1. Create a new project on Vercel and connect to this GitHub repo.
2. Add environment variables in Vercel (production):

   * `DATABASE_URL` (Vercel Postgres connection string)
   * `RESEND_API_KEY`
   * `NEXT_PUBLIC_SITE_URL` (e.g. `https://your-site.vercel.app`)
   * `SUPABASE_*` if using Supabase
3. Important: Enable [Environment Secrets] for keys.

## vercel.json (example)

```json
{
  "version": 2,
  "builds": [
    { "src": "next.config.mjs", "use": "@vercel/next" }
  ]
}
```

## Migrations on Vercel

Add build step / post-deploy step:

* Either run migrations in a Vercel serverless function, or run:

```bash
npx prisma migrate deploy
```

You can also use Vercel's Postgres integration and run the migration from your local machine against the production DATABASE_URL.

---

# How to get Resend API key

1. Visit [https://resend.com](https://resend.com) and sign in / sign up.
2. In the dashboard, go to **API Keys**.
3. Click **Create API Key** → give it a name (e.g., `secret-santa-prod`).
4. Copy the key (format `re_xxx...`) and store it into `RESEND_API_KEY` env var in Vercel and your local `.env`.

---

# Testing & QA

## Manual test flows

1. Create event via `/create-event`. Copy host URL and join URL.
2. Open `/event/:eventId/join` and register 3+ participants.
3. From host dashboard `/event/:eventId/host` run draw.
4. Confirm DB: participants now have `assignedToId`.
5. Confirm recipients receive emails (use a test inbox).
6. Log in as one participant (or open chat route with participantId) and send messages; verify anonymous labels and DB entries.

## Automated / script tests

* Add unit tests for matching algorithm (jest).
* Add integration tests for API endpoints (supertest).

## Example curl (register participant)

```bash
curl -X POST "http://localhost:3000/api/events/<eventId>/join" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Alice",
    "email":"alice@example.com",
    "wishlist_q1":"Tea set",
    "wishlist_q2":"Cozy socks"
  }'
```

---

# Security & privacy notes

* **Do not store** `RESEND_API_KEY` in Git. Use env vars / secrets.
* Only reveal host dashboard link to the host. Protect drawing endpoint (ideally with host email + magic link or a simple passcode).
* Emails contain assignment info; ensure content is not leaked.
* For GDPR/Privacy: store and process emails carefully; provide a way to delete event/participants.

---

# Troubleshooting

### Common issues

* **Emails not sent**: Verify `RESEND_API_KEY` and domain verification at Resend; check logs and Resend dashboard.
* **Prisma migrations fail**: Ensure `DATABASE_URL` is correct and the DB is reachable.
* **Self-assignment happened**: Algorithm should prevent — re-run draw after clearing assignedToId or implement additional derangement checks.

### Debugging tips

* Use `npx prisma studio` to inspect DB locally.
* Log outputs on serverless functions for Vercel (view in Vercel dashboard).
* For email debugging use test addresses like Mailinator or an inbox you control.

---

# Contributing

1. Fork the repo.
2. Create a feature branch `feature/your-feature`.
3. Commit with clear messages.
4. Open a PR — describe the change & testing steps.

---

# Roadmap / improvements

* Add authentication for hosts (magic links)
* Add scheduling for draw (automatic at a certain date)
* Improve chat with typing indicators & message editing
* Add gift price limit & shipping addresses (with privacy safeguards)
* Add CSV import/export for participants

---

# License

MIT License — see `LICENSE` file.

---

# Contact

If you need help setting up Resend, Vercel Postgres, or the matching algorithm, open an issue or contact the maintainer (add your contact info).

---

## Appendix — Quick copy snippets

### `package.json` scripts (example)

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "seed": "ts-node ./scripts/seed.ts"
}
```

### Example `.env.example`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/secret_santa
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_xxx_your_key_here
# Optional for realtime chat
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

---

If you want, I can:

* Generate a `README.md` file ready to paste into the repo (this is it), or produce a shorter “Quick Start” README as well.
* Generate the `src/lib/*` helpers and API route code samples (I can paste full file examples).
  Which would you prefer next?
