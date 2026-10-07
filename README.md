# Frontend Interview Prep — Set 2

Five React + TypeScript features, each on its own route and shipped as its own pull request.

## Stack

| Concern | Choice |
| --- | --- |
| Build tool | Vite |
| Language | TypeScript (strict) |
| UI | React 19 |
| Routing | React Router |
| Styling | Tailwind CSS |
| Linting | ESLint (type-aware) |
| Tests | Vitest + Testing Library |

## Running it

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173.

## Checks

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --build
npm test           # Vitest
npm run build      # production build
```

## Questions

| # | Question | Route | PR link |
| --- | --- | --- | --- |
| 1 | Shopping Cart | `/cart` | |
| 2 | Infinite Feed | `/feed` | |
| 3 | Kanban Board | `/kanban` | |
| 4 | Live Dashboard | `/dashboard` | |
| 5 | Comments with Offline Support | `/comments` | |

Video:

## Layout

```
src/
  components/   shared UI used by more than one feature
  pages/        route-level components
  questions.ts  question metadata shared by the nav, home page and routes
  test/         test setup
```

Each feature lands in `src/features/<name>/` on its own branch.
