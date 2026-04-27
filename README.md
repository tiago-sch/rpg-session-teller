# RPG Session Teller

**Turn your messy session notes into polished chronicles.**

RPG Session Teller is a web app for tabletop RPG players and game masters. Paste your bullet-point notes after a session, and Gemini AI transforms them into a narrative summary and a full story retelling — in whatever language you wrote the notes in, preserving every name, quote, and event faithfully.

**Live app → [session-teller.tiagoschmidt.com](https://session-teller.tiagoschmidt.com)**

---

## Features

- **AI Chronicle Generation** — Powered by Gemini 2.5 Flash. Produces a short summary (tldr) and a richly written narrative from raw notes. Never invents lore or characters not present in your notes.
- **Multilingual** — Write notes in any language; the output matches.
- **Campaigns** — Organise sessions into campaigns with names and descriptions. Filter your chronicles by campaign from the dashboard.
- **Public Share Links** — Every session gets a public URL you can share with your table. Only the owner can access the editing view.
- **Inline Editing** — Edit session titles and campaign assignments directly from the session page.
- **Profile** — Set a display name that appears as the author on public share pages.
- **Ink Purchases** — Buy consumable ink packs through Stripe Checkout. Stripe webhooks fulfill purchases into the Supabase ink ledger exactly once.
- **Responsive Design** — Works on mobile and desktop. Dashboard uses a horizontal chip filter on small screens and a full sidebar on larger ones.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Routing | React Router v7 |
| Auth & Database | Supabase (email/password auth, PostgreSQL, RLS) |
| Payments | Stripe Checkout + webhooks |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Hosting | Vercel |

**Fonts:** Cinzel (display) + Crimson Pro (body) via Google Fonts.

---

## Database Schema

```
sessions
  id, public_id (uuid), user_id (fk → auth.users)
  title, tldr, prompt, generated_text
  campaign_id (fk → campaigns, nullable)
  created_at, updated_at

campaigns
  id, user_id (fk → auth.users)
  name, description
  created_at

profiles
  id (fk → auth.users), display_name
  updated_at
```

Row-level security ensures users can only read and write their own data. Sessions and campaigns have an additional public `SELECT` policy so share links work without authentication.

---

## Local Development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### Setup

```bash
git clone https://github.com/your-username/rpg-session-teller
cd rpg-session-teller
npm install
```

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_URL=http://localhost:3000
```

The Vercel API routes also accept `SUPABASE_URL` and `SUPABASE_ANON_KEY`; if omitted, they fall back to the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Keep `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` server-only.

### Database

Run these migrations in the Supabase SQL editor (in order):

1. **Sessions table** — `sessions` with RLS (owner read/write)
2. **Profiles table** — auto-created on signup via trigger, stores `display_name`
3. **Public read policy** — allows unauthenticated access to sessions + campaigns for share links
4. **Campaigns table** — with `campaign_id` FK on sessions

### Run

```bash
npm run dev
```

App runs at `http://localhost:5173` with Vite. Use `vercel dev` when testing Stripe Checkout locally so `/api/create-ink-checkout-session` and `/api/stripe-webhook` are available, and set `APP_URL` to the local Vercel URL.

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### Build

```bash
npm run build
```

---

## Deployment (Vercel)

The `vercel.json` at the root configures SPA routing so direct links (e.g. `/s/:id`) don't return 404:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Add the client variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`) and server secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`) in the Vercel project settings before deploying.

---

## Project Structure

```
src/
  components/
    AppHeader.tsx        # Shared responsive header
    AuthCard.tsx         # Fantasy-styled auth wrapper
    AuthInput.tsx        # Labeled input with gold focus
    AuthButton.tsx       # Gold gradient button
    CampaignSelect.tsx   # Campaign dropdown
  context/
    AuthContext.tsx      # Supabase auth state
  hooks/
    useProfile.ts        # Profile fetch + update
  lib/
    supabase.ts          # Supabase client
    gemini.ts            # Gemini generation + prompt
  pages/
    DashboardPage.tsx    # Session list + campaign sidebar
    SessionPage.tsx      # Session detail (owner view)
    SharePage.tsx        # Public share view
    NewSessionPage.tsx   # Create session + AI generation
    ProfilePage.tsx      # Edit display name
    App.tsx              # Router + auth guards
```
