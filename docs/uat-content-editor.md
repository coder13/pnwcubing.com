# Content editor acceptance checks

The initial browser checks used a production build with local WCA and Directus fixtures. Those checks did not change production records.

## Passed checks

- An anonymous visitor cannot open the editor or save content.
- A full editor can add a draft delegate, publish it, hide it, and change its region.
- Public delegate lists show only published profiles.
- A full editor can add, publish, hide, and delete FAQ questions.
- A full editor can update page content and inspect its preview.
- Scripts do not run in the preview or on the public page.
- A full editor can add, deactivate, and delete another editor.
- The editor cannot revoke accounts listed in `CONTENT_EDITOR_WCA_IDS` through the website.
- A delegate sees only their own profile and can edit its name, email, region, blurb, publication status, and display order.
- A delegate's WCA ID is read-only, and the server rejects attempts to change it.
- The editor selects a delegate's profile automatically when there is one matching record.
- A saved blurb remains after a page reload.
- Forged requests cannot edit another delegate or change a delegate's WCA ID.
- All public routes load without horizontal overflow at the desktop width.
- The delegate editor fits a mobile screen.
- Sign out removes access and returns to the login page.
- Browser checks reported no JavaScript errors.

The automated checks cover OAuth state, PKCE, encrypted sessions, expiration, current WCA roles, and same-origin protection. They also cover input limits, publication filters, editor revocation, and repeatable setup on Directus 10 and 11. Setup tests include legacy FAQ field names and Boolean editor flags. Form tests cover automatic profile selection, editable profile fields, and the read-only WCA ID.

## Live setup recovery

The recovery checks used `https://admin.pnwcubing.com` on November 5, 2026. Setup completed and reused `FAQ.Answer` without renaming the field. Repeated setup runs also completed.

The live checks passed:

- All 15 original delegate records and the original FAQ record stayed unchanged.
- The service token read all four CMS collections.
- The service role had only the 14 required content rules, with administrator and Data Studio access disabled.
- The service token could not read fields, users, roles, or permissions.
- FAQ creation and updates used the existing `Answer` field.
- Hidden FAQ records and draft delegate records stayed out of public lists.
- A test delegate identity could edit its matching blurb but could not edit another delegate.
- `SiteEditors.active` returned Boolean values after setup repaired its format.
- The temporary FAQ and delegate records were removed after the checks.

The local login route reached the WCA authorization endpoint. These API checks used test identities for ownership checks. The production build passed. API checks do not replace a real WCA sign-in and the full editor browser checks.

## Numeric accounts and WCA sync

The new automated checks passed on November 5, 2026. The suite contains 71 tests. ESLint, TypeScript, and the production build also passed.

The checks cover numeric ownership without competitor IDs, additional accounts, protected identities, and shared visibility controls. They also cover complete WCA pagination, duplicate prevention, failed imports, and repeat sync. New profiles use public WCA emails. Trainee emails stay out of public data and rendered contact buttons, including manually entered values. The dashboard tests cover region groups, automatic profile selection, and status colors.

Live setup linked all 15 original profiles to unique WCA user IDs. Their original content, primary keys, and publication states stayed unchanged. A later role update preserved all 35 profiles present at that time. Both tracked WCA region lists loaded through the public API. The restricted website token read the new fields, and user 8184 retained full editor access.

The local development preview runs at `http://localhost:3000`. The public directory and login page responded successfully. The browser redirected an anonymous editor visit to login. Later authenticated browser checks confirmed the WCA avatar and page editors.

The hourly visibility job passed four additional automated checks, for 75 tests in total. These cover confirmed retirement, active roles including trainees, dry runs, WCA failures, and a profile archived during a check. TypeScript and ESLint also passed after this change.

The job is installed on the Directus server with an hourly cron schedule, a file lock, and log rotation. Its first live run checked eight published profiles and hid zero profiles. A live conditional update with an empty target also passed without changing content. The job account has exactly two delegate-only permission rules, with hide-only updates and no administrator or Data Studio access.

The page-first dashboard includes a persistent editor sidebar and a seven-page index with Edit and View actions. Each page opens with a breadcrumb and its editable sections together. Save page updates only changed sections. The preview follows published, hidden, and draft content rules. A failed save keeps the text available for a retry.

The suite now contains 90 passing tests. The production build, TypeScript, and ESLint passed. Live setup preserved all existing content and added the navigation collection and page labels. The website token can access navigation, while the hourly visibility account retains its two delegate-only rules. A browser check showed the signed-in WCA avatar and confirmed that it opens the local editor.

The standalone FAQs sidebar item was removed. Full editors now edit each FAQ list inside its page. For Parents has eight original questions. Competition Guide has its own list from the legacy FAQ collection. Pages stays selected in the sidebar.

Navigation editing is now limited to the Merch and Public Documents URLs. Built-in page URLs, labels, and header structure stay fixed. The header has centered links and no logo. The website API rejects edits to other navigation records, new links, deletions, and non-URL fields. The suite contains 92 passing tests, including these restrictions and the header layout.

The page editor uses ordered blocks with visual rich text controls. Page titles and optional subtitles use plain text. Home feed cards have separate title, description, link text, URL, and visibility fields. FAQ items have plain questions and rich answers. Both editors can reorder items. Save confirmations appear as temporary toasts, with a dismiss button. Errors remain beside the form.

The suite contains 107 passing tests after the title and card changes. Tests cover safe card links, plain headings, rich text filtering, migration preservation, repeated setup, native list defaults, and ordered saves. The authenticated browser preview showed all three home cards and plain title fields. A fresh editor view started with no unsaved changes. Admin URLs retained the selected page.

Live setup on November 5, 2026 added Pages and its native block relation. Directus uses native visual text editors and list fields for FAQs and cards. A native creation check generated a new block ID and included the block in its page relation. The website service token updated that same hidden test record. The temporary test record was removed afterward.

The title and card migration completed after a database backup. All 35 delegate records, seven legacy FAQ records, 23 existing content records, one editor record, and nine navigation records matched that backup. Their original IDs, HTML, text, and publication states stayed unchanged. Contact received one additional body block. Repeated setup preserves edits and leaves unlinked blocks removed.

The production build, TypeScript, ESLint, and all 107 tests passed after these changes. A repeated live setup also completed. The page index shows names, URLs, and Edit and View actions without publication counts. The local preview remained running and returned HTTP 200 after the build.


The link editor uses a small form beside the selected link. An authenticated browser check opened the Contact page’s Delegates link with its original text and URL. Enter applied a URL change to the local draft without saving the page. Cmd+K reopened the same link, and Remove link preserved its text. The test draft was discarded without changing Directus content. All 115 tests, ESLint, TypeScript, and the production build passed.

Rich text toolbars now use icons with hover labels and accessible names. Formatting groups have separators, and active controls use the site color. The authenticated Contact editor preview showed the icon toolbar without unsaved changes.

The delegate form no longer shows the WCA region, role, or general visibility explanation above its fields. Production uses the `www` host for login callbacks, cookies, and save requests. Tests cover apex configuration values, strict origin checks, host redirects before cookie creation, and unchanged local and preview origins. All 119 tests, ESLint, TypeScript, and the production build passed.


The shared header restores the original navigation styling and adds the PNW Cubing logo as a Home link. About uses the menu component with a right-side chevron. Browser checks confirmed that it opens, shows both links, and closes with Escape. The avatar stays in the top right when signed in. Only the Merch and Public Documents URLs remain editable.

The mobile header passed a browser check at 390 pixels wide. The logo and hamburger had matching visible margins. The open menu covered the page with a white panel, and all navigation links remained visible. The page stayed in place beneath the menu. All 119 tests, ESLint, TypeScript, and the production build passed.
