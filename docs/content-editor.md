# Website content editor

The private editor is at `/login` or `/admin`. The public menu has no login link. These routes ask search engines not to index them. Every save requires a valid WCA session and a server permission check.

## Access

| Account                                                       | Access                 |
| ------------------------------------------------------------- | ---------------------- |
| WCA account with a matching, unarchived `Delegates.wcaUserId` | Edit their own profile |
| Active user in `SiteEditors`                                  | Full content access    |
| User listed in `CONTENT_EDITOR_WCA_IDS`                       | Full content access    |
| Other account                                                 | No editor access       |

A WCA user ID is a number, such as `8184`. A WCA competitor ID is a different value, such as `2010TEST01`. The editor list uses numeric user IDs. Delegate ownership uses the numeric user ID from the authenticated WCA account. A competitor ID is optional. Names and email addresses do not determine ownership.

Full editors can add, edit, archive, restore, publish, hide, and reorder delegates. They can add, edit, delete, publish, hide, and reorder FAQ questions. They can change delegate regions and contact details. They can edit the home cards, page headings, About, contact information, parent information, competition guidance, and delegate introduction. Competition results and upcoming competitions still come from WCA. Site layout remains in code. Built-in header links stay in code. The Merch and Public Documents URLs come from `SiteNavigation`.

Regions are text fields. Select an existing region or enter a new region. Smaller display order numbers appear first.

## Configure WCA login

1. Create a WCA OAuth application at `https://www.worldcubeassociation.org/oauth/applications`.
2. Add the production callback URL: `https://www.pnwcubing.com/api/auth/callback`.
3. For local development, add `http://localhost:3000/api/auth/callback`.
4. Copy `.env.example` to `.env.local`.
5. Set `WCA_CLIENT_ID` and `WCA_CLIENT_SECRET`.
6. Set `SITE_URL` to the exact website origin.
7. Generate `SESSION_SECRET` with `openssl rand -hex 32`.

Production uses `https://www.pnwcubing.com`. The website redirects the apex domain to this host. The origin helper also treats an apex `SITE_URL` value as the `www` origin. Login reaches the configured host before it sets its state cookie.

Use separate OAuth credentials for a preview deployment. Set its exact origin in `SITE_URL` and its callback in WCA.

The website uses the authorization code flow with state and PKCE. It requests only the public WCA scope. The access token stays in an encrypted, HttpOnly session cookie. The browser cannot read it. The session expires with the WCA token, within eight hours at most. Closing a browser session removes the cookie unless the browser restores that session.

The server reads the current WCA profile for each editor page and save. It also reads editor access on each request. A removal of full editor access takes effect on the next request. An unarchived delegate profile still grants access to that profile, even after a WCA role ends. A delegate can edit their own name, email, region, blurb, publication status, and display order. Both WCA IDs appear as read-only fields after the account is linked. Only full editors can add, archive, or restore profiles. Either the delegate or a full editor can publish or hide an unarchived profile.

If a delegate has one matching profile, the editor selects it automatically. Delegates cannot edit other profiles or other content collections.

## Prepare Directus

The setup script supports Directus 10 roles and Directus 11 policies. It uses the REST API at `https://admin.pnwcubing.com`.

1. Back up the Directus database and uploads.
2. Keep the Directus Public role or policy free of wildcard collection access.
3. Set `DIRECTUS_SETUP_TOKEN` in `.env.local` to an administrator token.
4. Run `yarn cms:setup`.

To inspect an existing setup first, run:

```bash
yarn cms:check
```

This command prints collection names, field names, types, and primary keys. It does not change the database or permissions. It does not print the administrator token or content records.

Setup checks all existing collection schemas before it changes permissions. It reuses existing FAQ text fields with different casing, such as `Question` and `Answer`. The website reads and writes those fields without changing their names or existing content. Setup stops for ambiguous FAQ names, other incompatible field names, incompatible types, or incompatible primary keys. It does not rename fields, change existing field types, or replace a primary key.

Keep the hidden `SiteContent` record `__setup_faq_fields_v1`. It stores the FAQ field names for website writes, including when the FAQ collection is empty. The website service token needs no schema access. The content editor cannot change this record.

Setup also configures `SiteEditors.active` to return Boolean values. This lets the website recognize active editors when the database stores the flag as `1` or `0`. Existing editor flags stay unchanged.

If Directus rejects a field change, the error now names the field and includes the Directus error code and message. Keep the existing collections and records. Run `yarn cms:check` to inspect the schema before a retry.

The script keeps existing delegate content and primary keys. It links each legacy competitor ID to a numeric `wcaUserId` through the public WCA account endpoint. It requires unique numeric IDs and stops before changes if identities conflict. If a record has neither ID, the editor must link it manually. Existing publication states stay unchanged. Only records from before the original publication feature receive an initial published state. It creates the following collections:

| Collection       | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `Delegates`      | Existing profiles, with publication status and display order |
| `FAQ`            | Original FAQ records retained after the block import         |
| `SiteContent`    | Ordered page blocks with stable IDs                          |
| `Pages`          | Page list with native access to each page’s blocks           |
| `SiteNavigation` | Merch and Public Documents URLs                              |
| `SiteEditors`    | Numeric WCA user IDs, names, and active flags                |

The script copies the current site text into Directus. It removes anonymous access to these content collections before it adds draft content. The website reads public content through its server token. Setup does not grant editor access to any WCA user.

To grant the first full editor access, add an active record in `SiteEditors` through Directus. Use the numeric WCA user ID as the record ID. You can also set `CONTENT_EDITOR_WCA_IDS` to a comma-separated list of numeric WCA user IDs.

The script can run again. It does not replace existing page text, reset publication status, or restore deleted FAQ questions. Keep the hidden `SiteContent` record `__setup_faq_v1`. This record marks the completed FAQ import.

The setup changes anonymous API access. Configure the website token before you deploy this code. The old website requires anonymous access to the delegate collection.

## Create the website service token

1. In Directus, create a role or policy for the website service.
2. Disable Data Studio access and administrator access for this role or policy.
3. Grant read, create, update, and delete access to `Delegates`, `FAQ`, and `SiteEditors`.
4. Grant read, create, and update access to `SiteContent`. Include all fields. The website removes blocks without deleting their records.
5. Grant `SiteNavigation` read access to `id,href` and update access to `href`, limited to IDs 5 and 8.
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

Deploy the branch after CMS setup. Open `/login` and sign in with WCA. Use Editor access to add or revoke full editors. No user has built-in full access. The optional environment list grants access and overrides an inactive CMS entry.

## Content states

| Record       | Draft              | Published  | Hidden        |
| ------------ | ------------------ | ---------- | ------------- |
| Delegate     | Private            | Public     | Private       |
| FAQ question | Private            | Public     | Private       |
| Page section | Original site text | Saved HTML | Blank section |

Archived delegates remain private. Only a full editor can restore them. The editor groups legacy draft delegates with Hidden profiles.

A save takes effect immediately for a published record. Drafts replace the saved record. They do not retain a separate published revision. For a page section, keep Published selected when you update live copy. To prepare changes separately, use Directus content versions outside this editor.

Page titles and subtitles use plain text. Page bodies, card descriptions, FAQ answers, and delegate blurbs use visual rich text editors.

The website uses Tiptap. Click an existing link to edit its text and URL. You can also select text and use Link or Ctrl/Cmd+K. Apply link changes the draft. Save page publishes the change.

Remove link keeps its text. Escape or Cancel closes the link editor without changes.

The website removes scripts, event handlers, unsafe URLs, and forms. Video frames can use only the supported YouTube hosts. Layout and colors stay in code.

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

1. Sign in as an active full editor.
2. Add a hidden delegate with a numeric WCA user ID.
3. Change the region and blurb, then publish the profile.
4. Open `/delegates` and find the profile in its region.
5. Hide the profile and make sure that it disappears.
6. Open Pages, then Competition Guide. Add a question to its FAQ list and inspect `/about/competing`.
7. Edit a page section, save it, and inspect the public page.
8. Grant another WCA account editor access, then revoke that access.
9. Sign in as a delegate and edit that delegate's profile. Make sure that the WCA ID is read-only.
10. Sign in with an unrelated WCA account and make sure that access is refused.
11. Sign out and make sure that the editor redirects to `/login`.

## Sync delegates

Run `yarn cms:setup` before you deploy this version. Setup adds `wcaUserId`, `wcaRegionId`, `wcaRegion`, `wcaActive`, and `wcaStatus`. The existing Directus primary key stays unchanged. The website service account still uses the same collection permissions.

In the delegate editor, select Sync WCA delegates. Sync reads all active roles for WCA region 28, Pacific Northwest, and region 114, Canada (West). These are the WCA names for the requested US Northwest and western Canada regions. The public WCA API provides the [region roles](https://www.worldcubeassociation.org/api/v0/user_roles?groupType=delegate_regions&isActive=true&groupId=28).

New profiles start hidden and use the public WCA email when available. Sync refreshes WCA region details, the WCA role, and the optional competitor ID. It preserves existing names, email addresses, local regions, blurbs, display orders, visibility, and archives. If someone leaves the tracked lists, the editor shows a notice on their card. Sync does not archive, hide, delete, or publish that profile.

If a sync stops partway through, run it again. Unique WCA user IDs prevent duplicate profiles. The command reads both complete WCA lists before it writes any records.

To add someone outside these regions, select Add delegate. Enter their numeric WCA user ID and select Look up WCA account. Review their profile and save it. The account needs no competitor ID or current WCA delegate role. New profiles default to hidden.

The dashboard groups published profiles by WCA region, with a separate Additional delegates group. Hidden profiles and archived profiles have their own sections. Published cards are green, hidden cards are amber, and archived cards are gray. Each card also shows its state as text. The editable local region still controls grouping on the public directory.

Trainee delegate emails never appear on the public directory, including manually entered emails. The editor shows a notice beside their profile details. The WCA public API omits trainee emails, so imported trainee profiles start with a blank email. Existing edited emails stay unchanged during sync. If the website cannot confirm the current WCA role, it hides the contact email until WCA responds again.

## Automatic visibility check

The Directus server runs `scripts/update-delegate-visibility.mjs` hourly at minute 17. It checks each published profile through the public WCA user endpoint. If WCA confirms that the account has no current delegate role, the job changes Published to Hidden. This rule also applies to additional delegates. A move to another WCA region does not hide a profile. Trainees count as active delegates.

The job never publishes, archives, deletes, or restores profiles. Hidden and archived profiles stay unchanged. If a WCA request fails, returns a missing account, or returns an unknown role, the job stops before any updates. Every WCA check completes before the first update. If a CMS write fails partway through, a later run completes the remaining updates.

Either the delegate or a full editor can still change visibility. The next hourly check hides a published profile again if the person has no current WCA delegate role. Returning delegates remain hidden until someone publishes them.

The standalone job uses Node 18 or later and needs no website packages. The server stores it at `/root/directus/delegate-visibility`. Its private `job.env` file supplies `DIRECTUS_URL` and `DIRECTUS_TOKEN`. The job account can read only delegate IDs, WCA user IDs, and publication states. It can update only the status of published records, and the new status must be hidden. Administrator and Data Studio access are disabled.

The schedule is `/etc/cron.d/pnw-delegate-visibility`. The repository copy is `scripts/cron/pnw-delegate-visibility`. A file lock prevents overlapping runs. Logs go to `/var/log/pnw-delegate-visibility.log`, with weekly rotation and four retained files. Logs contain counts and times, without account tokens or email addresses.

To inspect the job on the Directus server, run:

```bash
/root/directus/delegate-visibility/run-delegate-visibility.sh --dry-run
tail -20 /var/log/pnw-delegate-visibility.log
cat /etc/cron.d/pnw-delegate-visibility
```

To update the installed job, copy `scripts/update-delegate-visibility.mjs` and `scripts/run-delegate-visibility.sh` into the server directory. Keep `job.env` private with mode `600`. Run the dry check before the next scheduled run. To disable the job, move its schedule file out of `/etc/cron.d`.

## Pages, header links, and account display

Full editors start at `/admin/pages`. Open a page to edit its title, optional subtitle, and ordered blocks. Titles and subtitles use plain text. Normal text and green highlight blocks use visual rich text. FAQ lists contain plain questions and rich answers. Home feed cards contain a plain title, rich description, link text, URL, and visibility. Add, remove, hide, and reorder list items or blocks. Save page saves changed blocks and shows a temporary notification.

Each editor view has its own URL. Examples include `/admin/pages/parents`, `/admin/delegates/123`, `/admin/navigation`, and `/admin/editor-access/8184`. Refresh and browser history keep the selected view. The editor warns before you leave unsaved changes.

In the Directus console, open Pages, select a page, then open its blocks. Directus uses its native list, relation, and rich text fields. Drag blocks or list items to change their order. Select Page title to edit the plain title and subtitle. Select FAQ list or Home feed cards to edit their items. Both editors use the same SiteContent records. Keep existing IDs unchanged. A Directus flow assigns IDs to new blocks. Records with IDs that start with `__setup_` are internal and must stay unchanged.

Setup preserves existing IDs, HTML, and publication states. It copies old headings, subtitles, cards, and FAQs into structured fields once. Contact body text gets a separate block because its original record also contained the heading. Original FAQ records remain available as a record of the import. Later changes belong in the page blocks.

Removing a block through the website hides and unlinks its record. Removing a block from the native page list unlinks it. Setup does not restore unlinked blocks. To restore a website-removed block, open SiteContent, clear its deleted flag, select its page, and set its visibility.

In the website editor, open Navigation to change the Merch and Public Documents URLs. These are the only editable destinations. Website page URLs, link labels, order, and header layout stay in code. The header uses the original navigation style. Its logo links to Home, and About uses a chevron menu. The logo and built-in page links stay in code.

In Directus, open SiteNavigation and select Merch or Public Documents. Edit `href`. The other fields are read-only, and the built-in destination fields are read-only. Existing internal records stay in the database for compatibility, but their values cannot change the website routes or header layout.

The website service account has read access to `id` and `href` for those two records, and update access to `href` only. It has no navigation create or delete permission. Setup configures the existing restricted PNW Website Service role on Directus 10. For a custom role or Directus 11 policy, apply those same restrictions in the Directus console. The separate visibility job keeps its delegate-only permissions.

A signed-in visitor sees their WCA avatar in the top right. If WCA has no avatar, the header shows their initial in the same position. The avatar links to the content editor. A browser with no login history shows no account control while signed out. After a verified login, the browser stores only `pnw.hasLoggedIn=true` in local storage. When that visitor signs out, the header shows the text link `login`. This flag grants no access and contains no token or personal data. Private session responses are never cached.

For Parents and Competition Guide each contain their own FAQ list block. Questions, rich answers, visibility, and order are editable inside each page. The website uses its FAQ components and theme to display the items.

The local preview runs with `yarn dev` at `http://localhost:3000`. Development uses `.next-dev`, while production builds use `.next`. A production build can run without stopping the local preview.
