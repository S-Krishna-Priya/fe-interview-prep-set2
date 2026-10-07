# Frontend Interview Prep Set 2

Five React + TypeScript features, each on its own route, each shipped as its own branch and pull request, merged into `main` in order Q1 → Q5.

## Setup

```bash
npm install
```

Requires Node 22+.

## Run

```bash
npm run dev
```

The app runs at http://localhost:5173.

## Test

```bash
npm test              # Vitest, single run
npm run test:watch    # watch mode
```

## Verify

One command runs everything CI runs:

```bash
npm run verify
```

It executes, in order, and fails with a non-zero exit code on the first failure:

| Step | Command | What it catches |
| --- | --- | --- |
| Type-check | `tsc -b` | type errors under `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Lint | `eslint .` | `typescript-eslint` strictTypeChecked + React Hooks rules |
| Tests | `vitest run` | the feature test suites |
| Build | `vite build` | production build failures |
| Repo check | `node scripts/repo-check.mjs` | skipped/focused tests, leftover `console.log`/`debugger`, `any` and `eslint-disable` escape hatches, obvious committed secrets |

The repo check is a set of greps, not a proof — it catches the mistakes that slip past the four real gates above, nothing more.

The same `npm run verify` runs in GitHub Actions on every pull request (`.github/workflows/verify.yml`).

## Routes

| Route | Question |
| --- | --- |
| `/cart` | Q1 — Shopping Cart |
| `/feed`, `/feed/:id` | Q2 — Infinite Feed |
| `/kanban` | Q3 — Kanban Board |
| `/dashboard` | Q4 — Live Dashboard |
| `/comments` | Q5 — Comments with Offline Support |

## Architecture

```
src/
  features/
    cart/        Q1 — product list, cart state, money math in integer cents
    feed/        Q2 — infinite scroll with ref-based in-flight guards
    kanban/      Q3 — board state, native HTML5 drag, keyboard move path
    dashboard/   Q4 — settle-then-schedule polling, request-id staleness guard
    comments/    Q5 — optimistic posts, offline queue, server-side idempotency
  components/    shared app shell
  pages/         home and not-found
  questions.ts   question metadata shared by the nav and home page
  test/          Vitest setup
scripts/
  repo-check.mjs repository hygiene check used by `npm run verify`
```

Each feature owns its own folder: state hook, pure helpers, presentational components and tests together. Nothing is shared between features, which is what let all five be built in parallel on separate branches without touching the same files.

**Stack:** Vite · React 19 · TypeScript (strict) · React Router · Tailwind CSS · Vitest + Testing Library · ESLint. No UI, drag-and-drop, charting or state library does the core work of any question.

## Pull requests

| # | Question | PR |
| --- | --- | --- |
| 1 | Shopping Cart | [#8](https://github.com/S-Krishna-Priya/fe-interview-prep-set2/pull/8) |
| 2 | Infinite Feed | [#6](https://github.com/S-Krishna-Priya/fe-interview-prep-set2/pull/6) |
| 3 | Kanban Board | [#7](https://github.com/S-Krishna-Priya/fe-interview-prep-set2/pull/7) |
| 4 | Live Dashboard | [#9](https://github.com/S-Krishna-Priya/fe-interview-prep-set2/pull/9) |
| 5 | Comments with Offline Support | [#10](https://github.com/S-Krishna-Priya/fe-interview-prep-set2/pull/10) |

Each PR description carries a screenshot of the feature (`docs/screenshots/`), captured from the running app.

## Review

Every branch was audited by an independent reviewer that had not seen the implementer's reasoning — only the requirements, the diff and the test output. Three of the five were sent back before merge:

| Q | Finding | Outcome |
| --- | --- | --- |
| 2 | **Critical** — StrictMode's mount/remount left the in-flight guard stuck, so the feed never loaded in `npm run dev`. Invisible to Vitest (Testing Library does not wrap in `StrictMode`) and to `vite build` (StrictMode does not double-invoke in production). | Fixed; regression test proven to fail against the pre-fix code |
| 3 | **High** — dragging a card *down* a column landed it one slot too far; the drag path had no tests at all. | Fixed; drag tests added for both directions |
| 4 | **High** — a visibility resume started a second concurrent request instead of cancelling the outstanding one. | Fixed by aborting the superseded request |

A fourth defect surfaced during final browser verification, after merge: the dashboard refreshed every ~10.6s instead of 5s, because the bookkeeping that decides which slices changed ran inside a `setSlices` updater, which React calls twice in StrictMode. Fixed on `main` in "Apply every dashboard poll instead of every other one".

The pattern worth noting: every one of these passed type-check, lint, tests and CI. Tests that drive hooks directly with fake timers do not reproduce what `StrictMode` does to a real component tree, so the browser checks are what caught them.
