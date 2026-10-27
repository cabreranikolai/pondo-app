# Pondo — Your Money, in Balance.

Pondo is a mobile-first personal finance and budgeting app designed for iPhone users in the Philippines. It helps people track account balances, income, expenses, monthly budgets, and financial activity.

The brand uses a restrained forest-green and warm-ivory palette with a simple wallet-and-coin mark. Pondo means money in Filipino; the tagline is “Your Money, in Balance.”

## Technology stack

- React and JSX
- Vite
- Tailwind CSS v4 with the official Vite plugin
- React Router
- Lucide React
- Recharts
- npm

Supabase Auth and client-side session management are implemented. The initial
database schema and security policies are under `supabase/`.

## Prerequisites

- Node.js 20.19+ or 22.12+ (Node 24 is also supported)
- npm (included with Node.js)

## Getting started

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Create a production build:

```sh
npm run build
```

Lint the project:

```sh
npm run lint
```

## Project structure

```text
public/                     Static assets
src/
  assets/                   App assets
  components/
    dashboard/              Summary, chart, budget, and transaction UI
    layout/                 Responsive sidebar and mobile navigation
    ui/                     Shared branding, page, and empty-state components
  constants/                Navigation and legacy preview data
  hooks/                    Reserved for shared React hooks
  layouts/                  Main application shell
  lib/                      Formatting helpers and Supabase client
  contexts/                 Auth session and profile context
  components/auth/          Authentication layout, fields, and route guards
  pages/                    Dashboard and planned app routes
  App.jsx                   Route definitions
  index.css                 Tailwind CSS v4 and global styles
  main.jsx                  Application entry point
supabase/
  migrations/               Versioned PostgreSQL schema and security migrations
  functions/                Server-side invitation email function
```

Pondo’s color palette is centralized in CSS custom properties in `src/index.css`. The current wallet-and-coin wordmark is rendered with Lucide React icons and can be replaced with a dedicated brand asset later.

## Current scope

Supabase login, registration, password recovery, profile display-name updates,
protected routes, account management, transaction history, budgets, and
financial reports are implemented. The invitation Edge Function must be
deployed and configured before invitations can send email. Dashboard and
report figures are loaded from the signed-in user's Supabase records; the
legacy illustrative data module is not used for those figures.

## Next development phase

See [supabase/README.md](./supabase/README.md) for migration order and
verification, authentication settings, and invitation-function deployment
instructions. Database-backed pages require the documented migrations to be
applied to the intended Supabase project.
