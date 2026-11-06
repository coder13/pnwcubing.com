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

The updated production preview runs at `http://localhost:3000`. The public directory and login page responded successfully. The browser redirected an anonymous editor visit to login. The new authenticated browser flow still needs a manual preview.

The hourly visibility job passed four additional automated checks, for 75 tests in total. These cover confirmed retirement, active roles including trainees, dry runs, WCA failures, and a profile archived during a check. TypeScript and ESLint also passed after this change.

The job is installed on the Directus server with an hourly cron schedule, a file lock, and log rotation. Its first live run checked eight published profiles and hid zero profiles. A live conditional update with an empty target also passed without changing content. The job account has exactly two delegate-only permission rules, with hide-only updates and no administrator or Data Studio access.
