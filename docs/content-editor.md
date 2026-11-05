# Website content editor

The private editor is at `/login` or `/admin`. The public menu has no login link. These routes ask search engines not to index them. Every save requires a valid WCA session and a server permission check.

## Access

| Account                                                | Access               |
| ------------------------------------------------------ | -------------------- |
| Current WCA delegate with a matching `Delegates.wcaId` | Edit their own blurb |
| WCA user 8184, Cailyn Sinclair                         | Full content access  |
| Active user in `SiteEditors`                           | Full content access  |
| User listed in `CONTENT_EDITOR_WCA_IDS`                | Full content access  |
| Other account                                          | No editor access     |

A WCA user ID is a number, such as `8184`. A WCA competitor ID is a different value, such as `2010TEST01`. The editor list uses numeric user IDs. Delegate ownership uses the verified competitor ID from WCA.

Full editors can add, edit, delete, publish, hide, and reorder delegates and FAQ questions. They can change delegate regions and contact details. They can edit the home cards, page headings, About, contact information, parent information, competition guidance, and delegate introduction. Competition results and upcoming competitions still come from WCA. Site layout and navigation remain in code.

Regions are text fields. Select an existing region or enter a new region. Smaller display order numbers appear first.

## Configure WCA login

1. Create a WCA OAuth application at `https://www.worldcubeassociation.org/oauth/applications`.
2. Add the production callback URL: `https://www.pnwcubing.com/api/auth/callback`.
3. For local development, add `http://localhost:3000/api/auth/callback`.
4. Copy `.env.example` to `.env.local`.
5. Set `WCA_CLIENT_ID` and `WCA_CLIENT_SECRET`.
6. Set `SITE_URL` to the exact website origin.
7. Generate `SESSION_SECRET` with `openssl rand -hex 32`.

Use separate OAuth credentials for a preview deployment. Set its exact origin in `SITE_URL` and its callback in WCA.

The website uses the authorization code flow with state and PKCE. It requests only the public WCA scope. The access token stays in an encrypted, HttpOnly session cookie. The browser cannot read it. The session expires with the WCA token, within eight hours at most. Closing a browser session removes the cookie unless the browser restores that session.

The server reads the current WCA profile for each editor page and save. It also reads editor access on each request. A role removal takes effect on the next request. A delegate cannot change their name, WCA ID, region, email, or publication status.

## Prepare Directus

The setup script supports Directus 10 roles and Directus 11 policies. It uses the REST API at `https://admin.pnwcubing.com`.

1. Back up the Directus database and uploads.
2. Keep the Directus Public role or policy free of wildcard collection access.
3. Set `DIRECTUS_SETUP_TOKEN` in `.env.local` to an administrator token.
4. Run `yarn cms:setup`.

The script keeps existing delegate names and blurbs. It adds `status` and `sort`, then marks existing delegate records as published. It creates the following collections:

| Collection    | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `Delegates`   | Existing profiles, with publication status and display order |
| `FAQ`         | Question, answer, publication status, and display order      |
| `SiteContent` | HTML page sections with stable IDs                           |
| `SiteEditors` | Numeric WCA user IDs, names, and active flags                |

The script copies the current site text into Directus. It adds Cailyn as the first editor. It also removes anonymous access to these four collections before it adds draft content. The website reads public content through its server token.

The script can run again. It does not replace existing page text, reset publication status, or restore deleted FAQ questions. Keep the hidden `SiteContent` record `__setup_faq_v1`. This record marks the completed FAQ import.

The setup changes anonymous API access. Configure the website token before you deploy this code. The old website requires anonymous access to the delegate collection.

## Create the website service token

1. In Directus, create a role or policy for the website service.
2. Disable Data Studio access and administrator access for this role or policy.
3. Grant read, create, update, and delete access to `Delegates`, `FAQ`, and `SiteEditors`.
4. Grant read and update access to `SiteContent`.
5. Include all fields in these collection permissions.
6. Create a service user with this role or policy.
7. Create a static token for this user.
8. Set `DIRECTUS_TOKEN` to this static token.
9. Remove `DIRECTUS_SETUP_TOKEN` from `.env.local` after setup.

Do not give the service user access to Directus users, roles, policies, permissions, or schema changes. Do not add the setup token to Vercel. Both tokens are server secrets. They must have different values.

## Deploy

Set these server environment variables in Vercel:

```text
SITE_URL=https://www.pnwcubing.com
WCA_CLIENT_ID=...
WCA_CLIENT_SECRET=...
SESSION_SECRET=...
DIRECTUS_URL=https://admin.pnwcubing.com
DIRECTUS_TOKEN=...
CONTENT_EDITOR_WCA_IDS=
```

Deploy the branch after CMS setup. Open `/login` and sign in with WCA. Use Editor access to add or revoke full editors. User 8184 always has access. The optional environment list also grants access and overrides an inactive CMS entry.

## Content states

| Record       | Draft              | Published  | Hidden        |
| ------------ | ------------------ | ---------- | ------------- |
| Delegate     | Private            | Public     | Private       |
| FAQ question | Private            | Public     | Private       |
| Page section | Original site text | Saved HTML | Blank section |

A save takes effect immediately for a published record. Drafts replace the saved record. They do not retain a separate published revision. For a page section, keep Published selected when you update live copy. To prepare changes separately, use Directus content versions outside this editor.

Page sections have an HTML field and a preview. The website removes scripts, event handlers, unsafe URLs, and forms. Video frames can use only the supported YouTube hosts. Existing Tailwind classes remain available. New classes require a code change and rebuild. FAQ answers and delegate blurbs use plain text.

If Directus is unavailable, page sections and FAQs use the original site text. The delegate directory becomes empty. The editor shows an error and rejects saves. A hidden page section can therefore show its original text during a CMS outage.

## Checks

Run:

```bash
yarn test
yarn lint
yarn build
```

The automated checks use mocked WCA and Directus responses. They cover ownership, protected fields, full editor actions, editor revocation, session expiry, same-origin protection, HTML filtering, public publication filters, and setup on Directus 10 and 11.

For a live acceptance check:

1. Sign in as user 8184.
2. Add a draft delegate with a valid WCA ID.
3. Change the region and blurb, then publish the profile.
4. Open `/delegates` and find the profile in its region.
5. Hide the profile and make sure that it disappears.
6. Add and publish a FAQ question, then inspect `/about/competing`.
7. Edit a page section, save it, and inspect the public page.
8. Grant another WCA account editor access, then revoke that access.
9. Sign in as a delegate and change only that delegate's blurb.
10. Sign in with an unrelated WCA account and make sure that access is refused.
11. Sign out and make sure that the editor redirects to `/login`.
