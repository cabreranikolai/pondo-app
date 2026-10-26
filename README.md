# Pondo — Your Money, in Balance.

Pondo is a mobile-first personal finance and budgeting app designed for iPhone users in the Philippines. It helps people track account balances, income, expenses, monthly budgets, and financial activity. This first project phase establishes the frontend structure and a responsive dashboard with fictional Philippine peso examples.

The brand uses a restrained forest-green and warm-ivory palette with a simple wallet-and-coin mark. Pondo means money in Filipino; the tagline is “Your Money, in Balance.”

## Technology stack

- React and JSX
- Vite
- Tailwind CSS v4 with the official Vite plugin
- React Router
- Lucide React
- Recharts
- npm

Supabase is reserved for a future phase and is not installed or configured.

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
  constants/                Navigation and illustrative mock data
  hooks/                    Reserved for shared React hooks
  layouts/                  Main application shell
  lib/                      Formatting helpers
  pages/                    Dashboard and planned app routes
  App.jsx                   Route definitions
  index.css                 Tailwind CSS v4 and global styles
  main.jsx                  Application entry point
```

Pondo’s color palette is centralized in CSS custom properties in `src/index.css`. The current wallet-and-coin wordmark is rendered with Lucide React icons and can be replaced with a dedicated brand asset later.

## Current scope

The dashboard uses clearly labeled, fictional mock data. No backend connection, authentication, local financial record storage, or real transaction management is implemented. Mock monetary values are represented as integer centavos for display examples only; actual financial calculations and data handling will be designed with backend integration.

## Next development phase

The next phase can establish Supabase authentication, invitation-only registration, user profiles, and a secure data model for accounts, transactions, categories, and budgets. Authorization policies must ensure end users can access only their own financial records while keeping superadmin account and invitation management separate from private user finances.
