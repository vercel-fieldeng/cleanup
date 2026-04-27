# Cleanup

A web dashboard for bulk managing and cleaning up **Vercel projects** and **GitHub repositories**. Authenticate with Personal Access Tokens and get a unified interface to inspect, filter, and perform bulk operations on your resources.

## Features

### Vercel

- **Projects** — Browse all projects across teams, filter, select multiple, and bulk delete (including deployments and env vars)
- **Integrations & Stores** — View installed integrations and Vercel-native stores (Blob, Edge Config); delete stores
- **Environment Variables** — Scan env vars across all projects with recommended filters; decrypt and delete env vars; revoke compromised OpenAI API keys
- **Team Switching** — Switch between Vercel teams

### GitHub

- **Repositories** — Browse org/user repos, filter, and bulk archive or delete repositories
- **Repo Details** — View commits, contributors, and README for individual repos
- **Org Switching** — Switch between GitHub organizations

## Tech Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Biome** for linting
- **Vitest** for testing

## Getting Started

### Development

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Production

```bash
pnpm install
pnpm run build
pnpm run start
```

### Other Scripts

```bash
pnpm test       # Run tests
pnpm lint       # Lint with Biome
pnpm lint:fix   # Lint and auto-fix
```
