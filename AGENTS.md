# Repository Guidelines

## Project Structure & Module Organization
- Next.js 13 App Router with TypeScript. Route segments live in `src/app` (e.g., `page.tsx`, `about`, `competitions`, `layout.tsx`, `globals.css`).
- Shared UI sits in `src/components`; prefer adding new UI there for reuse before embedding large blocks in pages.
- Data helpers and network calls live in `src/lib` (Directus client, WCA fetchers, time utilities). Keep external requests centralized here.
- Static assets belong in `public`. Tailwind config is in `tailwind.config.ts` and uses Flowbite plugins.

## Build, Test, and Development Commands
- `yarn dev`: run the app locally at http://localhost:3000 with HMR.
- `yarn build`: production build; fixes type/lint errors before shipping.
- `yarn start`: serve the built output for a production-like preview.
- `yarn lint`: run ESLint + Prettier config; ensure it is clean before opening a PR.

## Coding Style & Naming Conventions
- Use TypeScript and React function components. Components/files in `src/components` should be `PascalCase`; utilities in `src/lib` should be `camelCase` exports.
- TailwindCSS + Flowbite drive styling; prefer class-based styling over inline styles except for dynamic values. Use `classnames` for conditional classes.
- 2-space indentation, Prettier-managed formatting, and ESLint defaults from `eslint-config-next`. Use absolute imports via `@/` when possible.

## Testing Guidelines
- No automated suite yet; when adding logic-heavy code, add unit/integration tests (React Testing Library or similar) under `src/__tests__` or colocated `*.test.tsx`.
- Meanwhile, sanity-check via `yarn dev`: navigate key pages, verify data fetches (WCA/Directus), and check console for warnings. Avoid committing live API keys—use `.env.local` for new secrets.

## Commit & Pull Request Guidelines
- Write short, imperative commit messages (`Add competition card`, `Fix directus fetch`), consistent with current history.
- PRs should include a brief summary, screenshots/GIFs for UI changes, test notes or repro steps, and links to any tracking issue.
- Keep diffs scoped; call out config or dependency changes explicitly.

## Security & Configuration Tips
- External calls hit `https://www.worldcubeassociation.org` and `https://admin.pnwcubing.com`; mock or stub them in tests and be mindful of rate limits.
- Never commit secrets. If new tokens are required, load them via `.env.local` and document the variable names in the PR description.
