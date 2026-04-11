# pnwcubing.com Architecture and Operations

Last verified: April 11, 2026

This document describes how `pnwcubing.com` works today, what it depends on, and how to keep the live system running.

## High-level architecture

There are two separate production systems behind the public experience:

1. `www.pnwcubing.com`
   Served by Vercel as a Next.js 13 App Router site from this repository.

2. `admin.pnwcubing.com`
   Served by a Directus container on a DigitalOcean droplet.

There is also a third external dependency:

3. `www.worldcubeassociation.org`
   Used as the source of upcoming competition data and WCA person avatars.

At the edge, both `www.pnwcubing.com` and `admin.pnwcubing.com` are currently fronted by Cloudflare. That is an inference from the live response headers observed on April 11, 2026. `www.pnwcubing.com` also shows Vercel response headers, which matches the expected hosting setup.

## How the website itself works

### Framework and runtime

- The site is a Next.js 13 application using the App Router.
- Core metadata, the shared header, Vercel Analytics, and Google Analytics are defined in [src/app/layout.tsx](/home/cailyn/projects/pnwcubing.com/src/app/layout.tsx:1).
- The codebase is small and mostly server-rendered, with a few client components for navigation and interactive cards.

### Main live data flows

#### Competitions page

- [src/app/competitions/page.tsx](/home/cailyn/projects/pnwcubing.com/src/app/competitions/page.tsx:9) calls `fetchUpcomingComps()` multiple times with region-specific search strings.
- [src/lib/wcaApi.ts](/home/cailyn/projects/pnwcubing.com/src/lib/wcaApi.ts:18) fetches upcoming competitions from the public WCA API.
- The page uses `export const revalidate = 60`, so Vercel will ISR-revalidate roughly every 60 seconds.
- Each competition is rendered by [src/components/CompetitionCard/CompetitionCard.tsx](/home/cailyn/projects/pnwcubing.com/src/components/CompetitionCard/CompetitionCard.tsx:15), which computes registration state client-side from WCA timestamps.

Operational impact:

- If the WCA API is down or slow, the competitions page can fail or show stale content.
- Because the code currently does not catch WCA fetch failures on the page, a hard failure from the WCA API can break rendering for that route.

#### Delegates page

- [src/app/delegates/page.tsx](/home/cailyn/projects/pnwcubing.com/src/app/delegates/page.tsx:11) reads the `Delegates` collection from Directus.
- [src/lib/directus.ts](/home/cailyn/projects/pnwcubing.com/src/lib/directus.ts:18) points directly at `https://admin.pnwcubing.com`.
- The page uses `export const revalidate = 5`, so Vercel refreshes this route aggressively.
- Each delegate also triggers a WCA person lookup for avatar data in [src/components/DelegateDetails/DelegateDetails.tsx](/home/cailyn/projects/pnwcubing.com/src/components/DelegateDetails/DelegateDetails.tsx:14).

Operational impact:

- The page depends on both Directus and the WCA persons API.
- If Directus fails, the page falls back to an empty delegate list because `getDelegates()` catches the error and returns `[]`.
- If the WCA person endpoint fails for a given delegate, the code returns `null` for that person, but the image component is still passed an empty string. That is a possible fragility point worth keeping in mind when debugging delegate page issues.

### Static and semi-static content

- Most other routes are static content pages under `src/app`.
- [next.config.js](/home/cailyn/projects/pnwcubing.com/next.config.js:13) defines a permanent redirect from `/feedback` to a Google Form.
- Remote images are only allowed from `avatars.worldcubeassociation.org`; see [next.config.js](/home/cailyn/projects/pnwcubing.com/next.config.js:3).

### Local development

Run the site locally with:

```bash
yarn dev
```

Useful local checks:

```bash
yarn lint
yarn build
```

The site does not appear to require local environment variables for basic rendering, because the production dependencies are hardcoded in the source.

## Production hosting for `www.pnwcubing.com`

### What is serving it

- `https://www.pnwcubing.com` responds with `x-vercel-cache` and `x-vercel-id` headers.
- `https://pnwcubing.com` 308-redirects to `https://www.pnwcubing.com/`.
- Cloudflare headers are also present, so Cloudflare appears to be in front of Vercel.

### Operational model

This repository is the source for the public website. Vercel builds and serves it. The repo itself does not contain Vercel-specific project metadata beyond the app code, so deployment settings likely live in the Vercel project dashboard.

If the public site is down, the likely failure domains are:

1. Vercel deployment/build issue
2. Domain or Cloudflare routing issue
3. Upstream dependency issue from Directus or WCA

### Basic production checks

```bash
curl -I https://www.pnwcubing.com
curl -I https://www.pnwcubing.com/delegates
curl -I https://www.pnwcubing.com/competitions
```

What good looks like:

- `200` for the page
- `x-vercel-id` present
- `x-powered-by: Next.js` may be present on some routes

If only `/delegates` is broken, check Directus first. If only `/competitions` is broken, check WCA reachability first.

## Production hosting for `admin.pnwcubing.com`

### What is serving it

The DigitalOcean server backing `admin.pnwcubing.com` is currently:

- OS: Ubuntu 23.04
- Listening publicly on port `80`
- Running one Docker container named `directus-directus-1`

There is no nginx, no Caddy, no PM2, and no dedicated systemd app unit running the API.

### Live Directus deployment layout

On the droplet:

- App directory: `/root/directus`
- Compose file: `/root/directus/docker-compose.yml`
- SQLite database used by the container: `/root/directus/database/database.sqlite`
- Uploads directory: `/root/directus/uploads`

Important detail:

- `/root/directus/data.db` also exists, but the running container is not using it.
- The container is mounted only with `/root/directus/database` and `/root/directus/uploads`.
- The actual running DB path inside the container is `/directus/database/database.sqlite`.

### How the container is started

The current compose file is effectively:

- Image: `directus/directus:latest`
- Port mapping: host `80` to container `8055`
- Volumes:
  - `/root/directus/database -> /directus/database`
  - `/root/directus/uploads -> /directus/uploads`

The running container environment confirms:

- `DB_CLIENT=sqlite3`
- `DB_FILENAME=/directus/database/database.sqlite`
- `STORAGE_LOCAL_ROOT=/directus/uploads`

### HTTPS and TLS

The droplet itself is only exposing port `80`. `https://admin.pnwcubing.com` still works because Cloudflare appears to terminate TLS in front of the origin. That conclusion is based on response headers from April 11, 2026.

Implication:

- If Cloudflare is disabled or pointed elsewhere, the origin server is not independently ready to serve HTTPS.

### Directus health checks

From any machine:

```bash
curl -I https://admin.pnwcubing.com
curl -s https://admin.pnwcubing.com/server/info
curl -I https://admin.pnwcubing.com/items/Delegates
```

What good looks like:

- `/` returns `302` to `./admin`
- `/server/info` returns JSON
- `/items/Delegates` returns `200`

From the droplet:

```bash
ssh -F /dev/null root@<admin-server>
docker ps
docker logs --tail 100 directus-directus-1
docker exec directus-directus-1 sh -lc 'ls -la /directus/database /directus/uploads'
```

### Restarting Directus

SSH into the server:

```bash
ssh -F /dev/null root@<admin-server>
cd /root/directus
docker compose ps
docker compose restart
docker logs --tail 100 directus-directus-1
```

If the container is missing or stopped:

```bash
ssh -F /dev/null root@<admin-server>
cd /root/directus
docker compose up -d
docker compose ps
docker logs --tail 100 directus-directus-1
```

If you need to fully recreate from the existing compose file:

```bash
ssh -F /dev/null root@<admin-server>
cd /root/directus
docker compose down
docker compose up -d
```

Be careful with `down` on a remote production box. The SQLite database and uploads are bind-mounted and should persist, but you are still intentionally taking the API offline during the recreation.

### Keeping the API running

For the current setup, the minimum operational checklist is:

1. Make sure Docker itself is running.
2. Make sure `directus-directus-1` is present in `docker ps`.
3. Confirm `/server/info` and `/items/Delegates` respond over `https://admin.pnwcubing.com`.
4. Confirm `https://www.pnwcubing.com/delegates` still renders.

Useful commands:

```bash
ssh -F /dev/null root@<admin-server> 'systemctl status snap.docker.dockerd --no-pager'
ssh -F /dev/null root@<admin-server> 'docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"'
ssh -F /dev/null root@<admin-server> 'docker logs --tail 100 directus-directus-1'
```

### Backups and data that matter

The important persistent data for Directus is:

- `/root/directus/database/database.sqlite`
- `/root/directus/uploads/`

If you only back up one thing, back up `database.sqlite`. If you want complete content recovery, back up both the SQLite database and the uploads directory.

Example backup commands:

```bash
ssh -F /dev/null root@<admin-server>
cp /root/directus/database/database.sqlite /root/directus/database/database.sqlite.bak.$(date +%F-%H%M%S)
tar -czf /root/directus/uploads.$(date +%F-%H%M%S).tar.gz -C /root/directus uploads
```

If you are doing anything risky, copy the SQLite DB before you touch the container.

## Known operational risks in the current setup

These are not guesses. They were directly observed on April 11, 2026.

### 1. The container has no restart policy

`docker inspect` reports `RestartPolicy=no`.

Implication:

- If the container exits unexpectedly or Docker restarts in a way that does not restore it, the API stays down until someone manually brings it back.

Recommended fix:

- Add `restart: unless-stopped` to the `directus` service in `/root/directus/docker-compose.yml`.
- Re-apply the compose file with `docker compose up -d`.
- Verify with `docker inspect directus-directus-1 --format '{{.HostConfig.RestartPolicy.Name}}'`.

### 2. The compose file uses `directus/directus:latest`

Implication:

- Future recreates are not reproducible.
- A `docker compose up -d` on a different day may silently pull a substantially newer Directus image.

### 3. The compose file contains bootstrap-looking secrets and admin credentials inline

The running container environment includes literal values from `docker-compose.yml`, including:

- placeholder `KEY`
- placeholder `SECRET`
- an inline admin email/password pair

Implication:

- This should be treated as a security issue.
- The large `/root/directus/.env` file is not currently wired into the container, so changing that file alone does not change production behavior.

### 4. `/root/directus/.env` appears to be mostly unused by the live container

The compose file does not reference `env_file`, and the running container environment matches the literal compose `environment:` block instead.

Implication:

- Editing `/root/directus/.env` is unlikely to fix production unless the compose file is also changed.

### 5. `PUBLIC_URL` is misconfigured or absent in the running Directus container

The logs contain:

```text
PUBLIC_URL should be a full URL
```

Implication:

- Some redirects, emails, and generated URLs may be wrong or fragile.

### 6. The droplet relies on Cloudflare for HTTPS

The origin itself only exposes port `80`.

Implication:

- Cloudflare is part of the production path, not just optional caching.

### 7. The Directus deployment is old and not pinned

The Directus logs report an upgrade notice showing the install is many versions behind current releases.

Implication:

- There is likely security and maintenance debt.
- Upgrading requires planning because the current deployment is not pinned and uses SQLite.

## Quick incident playbooks

### `www.pnwcubing.com` is down

1. Check `curl -I https://www.pnwcubing.com`.
2. If Vercel headers are missing, investigate Vercel and Cloudflare routing first.
3. If only `/delegates` is failing, check `https://admin.pnwcubing.com/server/info`.
4. If only `/competitions` is failing, check WCA API reachability.

### `admin.pnwcubing.com` is down

1. SSH to the production admin server.
2. Run `docker ps`.
3. If the container is stopped or missing, `cd /root/directus && docker compose up -d`.
4. Check `docker logs --tail 100 directus-directus-1`.
5. Re-test `curl -s https://admin.pnwcubing.com/server/info`.

### Delegate page is empty

1. Check `curl -I https://admin.pnwcubing.com/items/Delegates`.
2. If Directus is healthy, inspect the `Delegates` collection in the Directus admin UI.
3. If Directus is unhealthy, recover the container first.

## Files to read first

- Public site layout and analytics: [src/app/layout.tsx](/home/cailyn/projects/pnwcubing.com/src/app/layout.tsx:1)
- Competitions data flow: [src/app/competitions/page.tsx](/home/cailyn/projects/pnwcubing.com/src/app/competitions/page.tsx:1)
- Delegates data flow: [src/app/delegates/page.tsx](/home/cailyn/projects/pnwcubing.com/src/app/delegates/page.tsx:1)
- Directus client: [src/lib/directus.ts](/home/cailyn/projects/pnwcubing.com/src/lib/directus.ts:1)
- WCA API client: [src/lib/wcaApi.ts](/home/cailyn/projects/pnwcubing.com/src/lib/wcaApi.ts:1)
- Next.js redirect and image config: [next.config.js](/home/cailyn/projects/pnwcubing.com/next.config.js:1)
